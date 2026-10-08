import {
  DEFAULT_CHECK_INTERVAL_MONTHS,
  isBelongingCategory,
  isCheckInterval,
  isClaimKind,
  isDamage,
  isStockType,
  peopleIn,
  stockType,
  type Belonging,
  type CheckIntervalMonths,
  type Claim,
  type ClaimItem,
  type Household,
  type Suggestion, type HouseholdMembers, type IsoDate, type StockItem } from '@egenberedskap/core';

import { migrate } from './schema';
import type { SqlExecutor, SqlValue } from './sql';

export type MeetingPlace = { name: string; address: string };
export type Property = { id: string; name: string; shortName: string };
export type Room = { id: string; propertyId: string; name: string };
export type Contact = { id: string; name: string; relation: string; phone: string };
export type Policy = {
  id: string;
  name: string;
  /** The home it insures. Policies from before properties had one have none. */
  propertyId?: string;
  company?: string;
  sumKr?: number;
  deductibleKr?: number;
  /** «Varsle ved 90 %». */
  alertNearSum: boolean;
  /** «Ikke nå» on the underinsurance warning, at this documented value. */
  alertDismissedKr?: number;
};
export type CheckAnswers = Record<string, string>;
/** This phone's link to an encrypted backup. The key itself lives in the Keychain, not here. */
export type BackupState = { vaultId: string; entitledUntil: string; lastSyncedAt: string | null };
export type DocumentFile = { id: string; fileName: string; mimeType: string; size: number };
export type StoredDocument = { id: string; name: string; files: DocumentFile[] };
/** A belonging's photo, or the receipt that proves what it cost. At most one of each. */
export type BelongingFileKind = 'photo' | 'receipt';
export type BelongingFile = DocumentFile & { kind: BelongingFileKind };
export type StoredBelonging = Belonging & { photo?: BelongingFile; receipt?: BelongingFile };
export type Owner = { name: string; birthDate?: IsoDate };
/** A thing on a claim, with the receipt added for it if it was never documented. */
export type StoredClaimItem = ClaimItem & { receipt?: DocumentFile };
export type StoredClaim = Claim & { items: StoredClaimItem[]; photos: DocumentFile[] };
/** What the claim form edits. Being reported is set on its own, so saving the form never clears it. */
export type ClaimDraft = Draft<Omit<Claim, 'reportedOn'>>;

/**
 * An AI analysis this phone started: photos being uploaded, the answer awaited, suggestions to
 * look over, or a failure to explain. The private key stays out of here; see analysisSecret.
 */
export type Analysis = {
  id: string;
  roomId: string;
  source: 'photos' | 'video';
  status: 'uploading' | 'waiting' | 'ready' | 'failed';
  frameCount: number;
  /** The analysis's own public key, which the answer is encrypted to. */
  publicKey: string;
  error?: string;
  suggestions?: Suggestion[];
  createdAt: string;
};

/** Everything the screens show. Small enough to load whole after every change. */
export type AppData = {
  onboarded: boolean;
  onboardedOn: IsoDate | null;
  household: Household;
  meetingPlace: MeetingPlace | null;
  properties: Property[];
  selectedPropertyId: string | null;
  rooms: Room[];
  stock: StockItem[];
  contacts: Contact[];
  policies: Policy[];
  documents: StoredDocument[];
  belongings: StoredBelonging[];
  /** The last beredskapssjekk. The table keeps its old name, quarterly_checks. */
  lastCheck: IsoDate | null;
  /** How often the beredskapssjekk comes round. */
  checkIntervalMonths: CheckIntervalMonths;
  /** «Påminn meg» from the beredskapssjekk: when to remind about expiry dates again. */
  expiryReviewOn: IsoDate | null;
  /** Ask for Face ID or the phone's code before showing documents. On unless turned off. */
  documentLock: boolean;
  /** Who the belongings are documented for, on the report: an insurer needs a person, not just a phone. */
  owner: Owner;
  /** The user has read what AI analysis sends, and agreed. Asked once per phone. */
  analysisConsent: boolean;
  analyses: Analysis[];
  /** Damage claims, newest first. */
  claims: StoredClaim[];
  backup: BackupState | null;
};

/** Without an id it's a new record; with one it replaces that record. */
export type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string };
export type StockDraft = Draft<StockItem>;

/** «Kom i gang»: who lives at home and what they already have. The home is «Hjemme» unless named. */
export type OnboardingInput = { members: HouseholdMembers; items: StockDraft[]; homeName?: string };

const MEMBER_KEYS = ['adults', 'seniors', 'children', 'infants', 'dogs', 'cats'] as const;

export const DEFAULT_ROOMS = ['Stue', 'Kjøkken', 'Soverom', 'Bad', 'Gang', 'Bod'];

const HOUSEHOLD_ID = 'household';

type Deps = {
  db: SqlExecutor;
  newId: () => string;
  /** Wall-clock time for record timestamps. */
  now: () => Date;
  /** The local calendar date, for things the user thinks of by day. */
  today: () => IsoDate;
};

type StockRow = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  litres: number | null;
  meals: number | null;
  expires_on: string | null;
  bought_on: string | null;
  remind: number;
  location: string;
};

export type Store = ReturnType<typeof createStore>;

export function createStore({ db, newId, now, today }: Deps) {
  const stamp = monotonicStamp(now);

  const getSetting = async (key: string) =>
    (await db.first<{ value: string }>('SELECT value FROM settings WHERE key = ? AND deleted_at IS NULL', [key]))
      ?.value ?? null;

  /** Clearing a setting is a soft delete, so other phones learn it was cleared. */
  const setSetting = (key: string, value: string | null) => {
    const at = stamp();
    return value === null
      ? db.run('UPDATE settings SET deleted_at = ?, updated_at = ? WHERE key = ? AND deleted_at IS NULL', [at, at, key])
      : db.run(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, deleted_at = NULL`,
          [key, value, at],
        );
  };

  /** Insert or update a record, keeping its creation time and clearing any soft delete. */
  async function upsert(table: string, id: string | undefined, fields: Record<string, SqlValue>) {
    const at = stamp();
    const columns = Object.keys(fields);
    if (id && (await db.first(`SELECT id FROM ${table} WHERE id = ?`, [id]))) {
      await db.run(
        `UPDATE ${table} SET ${columns.map((c) => `${c} = ?`).join(', ')}, updated_at = ?, deleted_at = NULL WHERE id = ?`,
        [...Object.values(fields), at, id],
      );
      return id;
    }
    const newRecordId = id ?? newId();
    await db.run(
      `INSERT INTO ${table} (id, ${columns.join(', ')}, created_at, updated_at) VALUES (?, ${columns.map(() => '?').join(', ')}, ?, ?)`,
      [newRecordId, ...Object.values(fields), at, at],
    );
    return newRecordId;
  }

  const softDelete = (table: string, id: string) => {
    const at = stamp();
    return db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [at, at, id]);
  };

  async function writeMembers(members: HouseholdMembers) {
    for (const key of MEMBER_KEYS) {
      const n = members[key];
      if (!Number.isInteger(n) || n < 0 || n > 50) {
        throw new ValidationError(key, `${key} must be a whole number from 0 to 50`);
      }
    }
    if (peopleIn(members) < 1) throw new ValidationError('members', 'A household needs at least one person');
    for (const key of MEMBER_KEYS) await setSetting(key, String(members[key]));
  }

  /** Soft-deletes the photos and receipts of these belongings, returning their file names. */
  async function deleteFilesOf(belongingIds: string[]): Promise<string[]> {
    if (belongingIds.length === 0) return [];
    const marks = belongingIds.map(() => '?').join(', ');
    const files = await db.all<{ file_name: string }>(
      `SELECT file_name FROM belonging_files WHERE belonging_id IN (${marks}) AND deleted_at IS NULL`,
      belongingIds,
    );
    const at = stamp();
    await db.run(
      `UPDATE belonging_files SET deleted_at = ?, updated_at = ? WHERE belonging_id IN (${marks}) AND deleted_at IS NULL`,
      [at, at, ...belongingIds],
    );
    return files.map((f) => f.file_name);
  }

  async function deleteBelongingsIn(roomIds: string[]): Promise<string[]> {
    if (roomIds.length === 0) return [];
    const marks = roomIds.map(() => '?').join(', ');
    const belongings = await db.all<{ id: string }>(
      `SELECT id FROM belongings WHERE room_id IN (${marks}) AND deleted_at IS NULL`,
      roomIds,
    );
    const files = await deleteFilesOf(belongings.map((b) => b.id));
    const at = stamp();
    await db.run(`UPDATE belongings SET deleted_at = ?, updated_at = ? WHERE room_id IN (${marks}) AND deleted_at IS NULL`, [
      at,
      at,
      ...roomIds,
    ]);
    return files;
  }

  /** Soft-deletes claim files matching `where`, returning their file names. */
  async function deleteClaimFilesWhere(where: string, params: SqlValue[]): Promise<string[]> {
    const files = await db.all<{ file_name: string }>(
      `SELECT file_name FROM claim_files WHERE ${where} AND deleted_at IS NULL`,
      params,
    );
    const at = stamp();
    await db.run(`UPDATE claim_files SET deleted_at = ?, updated_at = ? WHERE ${where} AND deleted_at IS NULL`, [
      at,
      at,
      ...params,
    ]);
    return files.map((f) => f.file_name);
  }

  const store = {
    migrate: () => migrate(db),

    async load(): Promise<AppData> {
      const [
        onboardedOn,
        people,
        meetingName,
        meetingAddress,
        selected,
        expiryReviewOn,
        documentLock,
        backupVaultId,
        backupEntitledUntil,
        lastSyncedAt,
        analysisConsent,
        ownerName,
        ownerBirthDate,
        checkInterval,
      ] = await Promise.all(
        [
          'onboardedOn',
          'people',
          'meetingPlaceName',
          'meetingPlaceAddress',
          'selectedPropertyId',
          'expiryReviewOn',
          'documentLock',
          'backupVaultId',
          'backupEntitledUntil',
          'lastSyncedAt',
          'analysisConsent',
          'ownerName',
          'ownerBirthDate',
          'checkIntervalMonths',
        ].map(
          getSetting,
        ),
      );
      const properties = await db.all<{ id: string; name: string; short_name: string }>(
        'SELECT id, name, short_name FROM properties WHERE deleted_at IS NULL ORDER BY created_at',
      );
      const rooms = await db.all<{ id: string; property_id: string; name: string }>(
        'SELECT id, property_id, name FROM rooms WHERE deleted_at IS NULL ORDER BY sort, created_at',
      );
      const members = await Promise.all(MEMBER_KEYS.map(getSetting));
      const stock = await db.all<StockRow>(
        `SELECT id, name, type, quantity, litres, meals, expires_on, bought_on, remind, location FROM stock_items
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const contacts = await db.all<Contact>(
        'SELECT id, name, relation, phone FROM contacts WHERE deleted_at IS NULL ORDER BY created_at',
      );
      const policies = await db.all<{
        id: string;
        name: string;
        property_id: string | null;
        company: string | null;
        sum_kr: number | null;
        deductible_kr: number | null;
        alert_near_sum: number | null;
        alert_dismissed_kr: number | null;
      }>(
        `SELECT id, name, property_id, company, sum_kr, deductible_kr, alert_near_sum, alert_dismissed_kr
         FROM policies WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const documents = await db.all<{ id: string; name: string }>(
        'SELECT id, name FROM documents WHERE deleted_at IS NULL ORDER BY created_at',
      );
      const files = await db.all<{ id: string; document_id: string; file_name: string; mime_type: string; size: number }>(
        `SELECT id, document_id, file_name, mime_type, size FROM document_files
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const belongings = await db.all<{
        id: string;
        room_id: string;
        name: string;
        category: string;
        value_kr: number | null;
        value_estimated: number;
      }>(
        `SELECT b.id, b.room_id, b.name, b.category, b.value_kr, b.value_estimated FROM belongings b
         JOIN rooms r ON r.id = b.room_id
         WHERE b.deleted_at IS NULL AND r.deleted_at IS NULL ORDER BY b.created_at`,
      );
      const belongingFiles = await db.all<{
        id: string;
        belonging_id: string;
        kind: BelongingFileKind;
        file_name: string;
        mime_type: string;
        size: number;
      }>(
        `SELECT id, belonging_id, kind, file_name, mime_type, size FROM belonging_files
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      // One of each kind per belonging; should two phones each have added one, the newest wins.
      const filesByBelonging = new Map<string, BelongingFile>();
      for (const f of belongingFiles) {
        filesByBelonging.set(`${f.belonging_id}/${f.kind}`, {
          id: f.id,
          kind: f.kind,
          fileName: f.file_name,
          mimeType: f.mime_type,
          size: f.size,
        });
      }
      const analyses = await db.all<{
        id: string;
        room_id: string;
        source: Analysis['source'];
        status: Analysis['status'];
        frame_count: number;
        public_key: string;
        error: string | null;
        suggestions: string | null;
        created_at: string;
      }>(
        'SELECT id, room_id, source, status, frame_count, public_key, error, suggestions, created_at FROM analyses ORDER BY created_at',
      );
      const claims = await db.all<{
        id: string;
        property_id: string | null;
        kind: string;
        happened_on: string;
        description: string;
        police_report: string | null;
        reported_on: string | null;
      }>(
        `SELECT id, property_id, kind, happened_on, description, police_report, reported_on FROM claims
         WHERE deleted_at IS NULL ORDER BY happened_on DESC, created_at DESC`,
      );
      const claimItems = await db.all<{
        id: string;
        claim_id: string;
        belonging_id: string | null;
        room_id: string | null;
        name: string;
        category: string;
        value_kr: number | null;
        value_estimated: number;
        damage: string;
      }>(
        `SELECT id, claim_id, belonging_id, room_id, name, category, value_kr, value_estimated, damage FROM claim_items
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const claimFiles = await db.all<{
        id: string;
        claim_id: string;
        claim_item_id: string | null;
        kind: 'photo' | 'receipt';
        file_name: string;
        mime_type: string;
        size: number;
      }>(
        `SELECT id, claim_id, claim_item_id, kind, file_name, mime_type, size FROM claim_files
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      // One receipt per thing; should two phones each have added one, the newest wins.
      const receiptsByItem = new Map<string, DocumentFile>();
      for (const f of claimFiles) {
        if (f.kind === 'receipt' && f.claim_item_id) receiptsByItem.set(f.claim_item_id, toDocumentFile(f));
      }
      const lastCheck = await db.first<{ checked_on: string }>(
        'SELECT checked_on FROM quarterly_checks WHERE deleted_at IS NULL ORDER BY checked_on DESC, created_at DESC LIMIT 1',
      );

      // Before age groups there was only a head count; read it as adults.
      const [adults, seniors, children, infants, dogs, cats] = members.map((value) => Number(value ?? 0));
      const household: Household = {
        id: HOUSEHOLD_ID,
        adults: members[0] === null ? Math.max(1, Number(people ?? 1)) : adults!,
        seniors: seniors!,
        children: children!,
        infants: infants!,
        dogs: dogs!,
        cats: cats!,
      };
      const visibleProperties = properties.map((p) => ({ id: p.id, name: p.name, shortName: p.short_name }));
      return {
        onboarded: onboardedOn !== null,
        onboardedOn: onboardedOn ?? null,
        household,
        meetingPlace: meetingName ? { name: meetingName, address: meetingAddress ?? '' } : null,
        properties: visibleProperties,
        // Fall back to the first property if the selected one was removed.
        selectedPropertyId: visibleProperties.some((p) => p.id === selected)
          ? (selected ?? null)
          : (visibleProperties[0]?.id ?? null),
        rooms: rooms.map((r) => ({ id: r.id, propertyId: r.property_id, name: r.name })),
        stock: stock.filter((row) => isStockType(row.type)).map(toStockItem),
        contacts,
        policies: policies.map((p) => ({
          id: p.id,
          name: p.name,
          ...(p.property_id && { propertyId: p.property_id }),
          ...(p.company && { company: p.company }),
          ...(p.sum_kr !== null && { sumKr: p.sum_kr }),
          ...(p.deductible_kr !== null && { deductibleKr: p.deductible_kr }),
          alertNearSum: p.alert_near_sum !== 0,
          ...(p.alert_dismissed_kr !== null && { alertDismissedKr: p.alert_dismissed_kr }),
        })),
        documents: documents.map((d) => ({
          ...d,
          files: files
            .filter((f) => f.document_id === d.id)
            .map((f) => ({ id: f.id, fileName: f.file_name, mimeType: f.mime_type, size: f.size })),
        })),
        belongings: belongings.map((b) => {
          const photo = filesByBelonging.get(`${b.id}/photo`);
          const receipt = filesByBelonging.get(`${b.id}/receipt`);
          return {
            id: b.id,
            roomId: b.room_id,
            name: b.name,
            // A category from a newer version reads as «Annet» until this one learns it.
            category: isBelongingCategory(b.category) ? b.category : 'Annet',
            ...(b.value_kr !== null && { valueKr: b.value_kr }),
            valueEstimated: b.value_estimated !== 0,
            ...(photo && { photo }),
            ...(receipt && { receipt }),
          };
        }),
        lastCheck: lastCheck?.checked_on ?? null,
        // An interval from a newer version reads as the default until this one learns it.
        checkIntervalMonths: isCheckInterval(Number(checkInterval))
          ? (Number(checkInterval) as CheckIntervalMonths)
          : DEFAULT_CHECK_INTERVAL_MONTHS,
        expiryReviewOn: expiryReviewOn ?? null,
        documentLock: documentLock !== 'off',
        analysisConsent: analysisConsent === 'yes',
        owner: { name: ownerName ?? '', ...(ownerBirthDate && { birthDate: ownerBirthDate }) },
        analyses: analyses.map((a) => ({
          id: a.id,
          roomId: a.room_id,
          source: a.source,
          status: a.status,
          frameCount: a.frame_count,
          publicKey: a.public_key,
          ...(a.error && { error: a.error }),
          ...(a.suggestions && { suggestions: JSON.parse(a.suggestions) as Suggestion[] }),
          createdAt: a.created_at,
        })),
        claims: claims.map((c) => ({
          id: c.id,
          ...(c.property_id && { propertyId: c.property_id }),
          // A kind or damage from a newer version reads as the most general one until this one learns it.
          kind: isClaimKind(c.kind) ? c.kind : 'other',
          happenedOn: c.happened_on,
          description: c.description,
          ...(c.police_report && { policeReport: c.police_report }),
          ...(c.reported_on && { reportedOn: c.reported_on }),
          items: claimItems
            .filter((i) => i.claim_id === c.id)
            .map((i) => {
              const receipt = receiptsByItem.get(i.id);
              return {
                id: i.id,
                claimId: i.claim_id,
                ...(i.belonging_id && { belongingId: i.belonging_id }),
                ...(i.room_id && { roomId: i.room_id }),
                name: i.name,
                category: isBelongingCategory(i.category) ? i.category : 'Annet',
                ...(i.value_kr !== null && { valueKr: i.value_kr }),
                valueEstimated: i.value_estimated !== 0,
                damage: isDamage(i.damage) ? i.damage : 'damaged',
                ...(receipt && { receipt }),
              };
            }),
          photos: claimFiles.filter((f) => f.claim_id === c.id && f.kind === 'photo').map(toDocumentFile),
        })),
        backup:
          backupVaultId && backupEntitledUntil
            ? { vaultId: backupVaultId, entitledUntil: backupEntitledUntil, lastSyncedAt: lastSyncedAt ?? null }
            : null,
      };
    },

    /** First launch: who lives at home and what they have, with a home and a starter set of rooms. Returns the home. */
    async completeOnboarding(input: OnboardingInput): Promise<string> {
      let propertyId = '';
      await db.transaction(async () => {
        await writeMembers(input.members);
        for (const item of input.items) await store.saveStockItem(item);
        propertyId = await upsert('properties', undefined, {
          name: input.homeName?.trim() || 'Hjemme',
          short_name: 'Hjemme',
        });
        await setSetting('selectedPropertyId', propertyId);
        for (const [sort, room] of DEFAULT_ROOMS.entries()) {
          await upsert('rooms', undefined, { property_id: propertyId, name: room, sort });
        }
        await setSetting('onboardedOn', today());
      });
      return propertyId;
    },

    updateHousehold: (members: HouseholdMembers) => db.transaction(() => writeMembers(members)),

    async setMeetingPlace(place: MeetingPlace | null) {
      await db.transaction(async () => {
        await setSetting('meetingPlaceName', place ? required(place.name, 'name') : null);
        await setSetting('meetingPlaceAddress', place ? place.address.trim() : null);
      });
    },

    selectProperty: (id: string) => setSetting('selectedPropertyId', id),

    async saveStockItem(draft: StockDraft) {
      const amount = (value: number | undefined, field: string) => {
        if (value === undefined || !Number.isFinite(value) || value <= 0) {
          throw new ValidationError(field, `${field} must be a positive number`);
        }
        return value;
      };
      if (!isStockType(draft.type)) throw new ValidationError('type', `Unknown type: ${draft.type}`);
      if (!Number.isInteger(draft.quantity) || draft.quantity < 1) {
        throw new ValidationError('quantity', 'quantity must be a whole number of at least 1');
      }
      if (draft.expiresOn !== undefined) validDate(draft.expiresOn, 'expiresOn');
      if (draft.boughtOn !== undefined) validDate(draft.boughtOn, 'boughtOn');
      const { measure } = stockType(draft.type);
      return upsert('stock_items', draft.id, {
        name: required(draft.name, 'name'),
        type: draft.type,
        quantity: draft.quantity,
        litres: measure === 'litres' ? amount(draft.litres, 'litres') : null,
        meals: measure === 'meals' ? amount(draft.meals, 'meals') : null,
        expires_on: draft.expiresOn ?? null,
        bought_on: draft.boughtOn ?? null,
        remind: draft.remind ? 1 : 0,
        location: draft.location.trim(),
      });
    },
    deleteStockItem: (id: string) => softDelete('stock_items', id),

    saveContact: async (draft: Draft<Contact>) =>
      upsert('contacts', draft.id, {
        name: required(draft.name, 'name'),
        relation: draft.relation.trim(),
        phone: required(draft.phone, 'phone'),
      }),
    deleteContact: (id: string) => softDelete('contacts', id),

    saveProperty: async (draft: Draft<Property>) =>
      upsert('properties', draft.id, {
        name: required(draft.name, 'name'),
        short_name: required(draft.shortName, 'shortName'),
      }),
    /** Removes a home with its rooms and everything in them. Returns the files to delete, as deleteDocument does. */
    async deleteProperty(id: string): Promise<string[]> {
      const rooms = await db.all<{ id: string }>('SELECT id FROM rooms WHERE property_id = ? AND deleted_at IS NULL', [id]);
      let files: string[] = [];
      await db.transaction(async () => {
        await softDelete('properties', id);
        const at = stamp();
        await db.run('UPDATE rooms SET deleted_at = ?, updated_at = ? WHERE property_id = ? AND deleted_at IS NULL', [
          at,
          at,
          id,
        ]);
        files = await deleteBelongingsIn(rooms.map((r) => r.id));
      });
      return files;
    },

    async saveRoom(draft: Draft<Room>) {
      const last = await db.first<{ sort: number }>(
        'SELECT MAX(sort) AS sort FROM rooms WHERE property_id = ? AND deleted_at IS NULL',
        [draft.propertyId],
      );
      const existing = draft.id
        ? await db.first<{ sort: number }>('SELECT sort FROM rooms WHERE id = ?', [draft.id])
        : null;
      return upsert('rooms', draft.id, {
        property_id: draft.propertyId,
        name: required(draft.name, 'name'),
        sort: existing?.sort ?? (last?.sort ?? -1) + 1,
      });
    },
    /** Removes a room and everything in it. Returns the files to delete. */
    async deleteRoom(id: string): Promise<string[]> {
      let files: string[] = [];
      await db.transaction(async () => {
        await softDelete('rooms', id);
        files = await deleteBelongingsIn([id]);
      });
      return files;
    },

    async saveBelonging(draft: Draft<Belonging>) {
      if (!isBelongingCategory(draft.category)) throw new ValidationError('category', `Unknown category: ${draft.category}`);
      if (draft.valueKr !== undefined && (!Number.isInteger(draft.valueKr) || draft.valueKr < 0)) {
        throw new ValidationError('valueKr', 'valueKr must be a whole number of kroner, 0 or more');
      }
      return upsert('belongings', draft.id, {
        room_id: draft.roomId,
        name: required(draft.name, 'name'),
        category: draft.category,
        value_kr: draft.valueKr ?? null,
        value_estimated: draft.valueEstimated ? 1 : 0,
      });
    },

    /** Removes a belonging with its photo and receipt. Returns the files to delete. */
    async deleteBelonging(id: string): Promise<string[]> {
      let files: string[] = [];
      await db.transaction(async () => {
        files = await deleteFilesOf([id]);
        await softDelete('belongings', id);
      });
      return files;
    },

    /**
     * Records a photo or receipt already copied into the app's folder, in place of the one of
     * that kind it had. Returns the replaced file, to delete.
     */
    async setBelongingFile(file: { belongingId: string; kind: BelongingFileKind; fileName: string; mimeType: string; size: number }) {
      const previous = await db.all<{ id: string; file_name: string }>(
        'SELECT id, file_name FROM belonging_files WHERE belonging_id = ? AND kind = ? AND deleted_at IS NULL',
        [file.belongingId, file.kind],
      );
      await db.transaction(async () => {
        for (const p of previous) await softDelete('belonging_files', p.id);
        await upsert('belonging_files', undefined, {
          belonging_id: file.belongingId,
          kind: file.kind,
          file_name: required(file.fileName, 'fileName'),
          mime_type: file.mimeType,
          size: file.size,
        });
      });
      return previous.map((p) => p.file_name);
    },

    async removeBelongingFile(id: string): Promise<string[]> {
      const row = await db.first<{ file_name: string }>('SELECT file_name FROM belonging_files WHERE id = ?', [id]);
      await softDelete('belonging_files', id);
      return row ? [row.file_name] : [];
    },

    async savePolicy(draft: Draft<Policy>) {
      return upsert('policies', draft.id, {
        name: required(draft.name, 'name'),
        property_id: draft.propertyId ?? null,
        company: draft.company?.trim() || null,
        sum_kr: draft.sumKr ?? null,
        deductible_kr: draft.deductibleKr ?? null,
        alert_near_sum: draft.alertNearSum ? 1 : 0,
        alert_dismissed_kr: draft.alertDismissedKr ?? null,
      });
    },
    deletePolicy: (id: string) => softDelete('policies', id),

    async saveClaim(draft: ClaimDraft) {
      if (!isClaimKind(draft.kind)) throw new ValidationError('kind', `Unknown kind: ${draft.kind}`);
      validDate(draft.happenedOn, 'happenedOn');
      return upsert('claims', draft.id, {
        property_id: draft.propertyId ?? null,
        kind: draft.kind,
        happened_on: draft.happenedOn,
        description: draft.description.trim(),
        police_report: draft.policeReport?.trim() || null,
      });
    },

    /** Shared with the insurer on this day, or back to a draft with null. */
    async setClaimReported(id: string, on: IsoDate | null) {
      if (on !== null) validDate(on, 'reportedOn');
      const at = stamp();
      await db.run('UPDATE claims SET reported_on = ?, updated_at = ? WHERE id = ?', [on, at, id]);
    },

    /** Removes a claim with its things and files. Returns the files to delete. */
    async deleteClaim(id: string): Promise<string[]> {
      let files: string[] = [];
      await db.transaction(async () => {
        files = await deleteClaimFilesWhere('claim_id = ?', [id]);
        const at = stamp();
        await db.run('UPDATE claim_items SET deleted_at = ?, updated_at = ? WHERE claim_id = ? AND deleted_at IS NULL', [
          at,
          at,
          id,
        ]);
        await softDelete('claims', id);
      });
      return files;
    },

    async saveClaimItem(draft: Draft<ClaimItem>) {
      if (!isBelongingCategory(draft.category)) throw new ValidationError('category', `Unknown category: ${draft.category}`);
      if (!isDamage(draft.damage)) throw new ValidationError('damage', `Unknown damage: ${draft.damage}`);
      if (draft.valueKr !== undefined && (!Number.isInteger(draft.valueKr) || draft.valueKr < 0)) {
        throw new ValidationError('valueKr', 'valueKr must be a whole number of kroner, 0 or more');
      }
      return upsert('claim_items', draft.id, {
        claim_id: draft.claimId,
        belonging_id: draft.belongingId ?? null,
        room_id: draft.roomId ?? null,
        name: required(draft.name, 'name'),
        category: draft.category,
        value_kr: draft.valueKr ?? null,
        value_estimated: draft.valueEstimated ? 1 : 0,
        damage: draft.damage,
      });
    },

    /** Takes a thing off the claim, with its receipt. Returns the files to delete. */
    async deleteClaimItem(id: string): Promise<string[]> {
      let files: string[] = [];
      await db.transaction(async () => {
        files = await deleteClaimFilesWhere('claim_item_id = ?', [id]);
        await softDelete('claim_items', id);
      });
      return files;
    },

    /** Records a photo of the damage, already copied into the app's folder. */
    addClaimPhoto: async (file: { claimId: string; fileName: string; mimeType: string; size: number }) =>
      upsert('claim_files', undefined, {
        claim_id: file.claimId,
        claim_item_id: null,
        kind: 'photo',
        file_name: required(file.fileName, 'fileName'),
        mime_type: file.mimeType,
        size: file.size,
      }),

    /** Records the receipt for a thing on the claim, in place of any it had. Returns the replaced file, to delete. */
    async setClaimItemReceipt(file: { claimItemId: string; fileName: string; mimeType: string; size: number }) {
      const item = await db.first<{ claim_id: string }>('SELECT claim_id FROM claim_items WHERE id = ?', [file.claimItemId]);
      if (!item) throw new ValidationError('claimItemId', `claimItemId ${file.claimItemId} is not on any claim`);
      let replaced: string[] = [];
      await db.transaction(async () => {
        replaced = await deleteClaimFilesWhere('claim_item_id = ?', [file.claimItemId]);
        await upsert('claim_files', undefined, {
          claim_id: item.claim_id,
          claim_item_id: file.claimItemId,
          kind: 'receipt',
          file_name: required(file.fileName, 'fileName'),
          mime_type: file.mimeType,
          size: file.size,
        });
      });
      return replaced;
    },

    async removeClaimFile(id: string): Promise<string[]> {
      const row = await db.first<{ file_name: string }>('SELECT file_name FROM claim_files WHERE id = ?', [id]);
      await softDelete('claim_files', id);
      return row ? [row.file_name] : [];
    },

    saveDocument: async (draft: { id?: string; name: string }) =>
      upsert('documents', draft.id, { name: required(draft.name, 'name') }),

    /**
     * Removes a document and its files from the records. Returns the stored file names so
     * the caller can delete the files themselves, which the store never touches.
     */
    async deleteDocument(id: string): Promise<string[]> {
      const files = await db.all<{ file_name: string }>(
        'SELECT file_name FROM document_files WHERE document_id = ? AND deleted_at IS NULL',
        [id],
      );
      await db.transaction(async () => {
        const at = stamp();
        await db.run(
          'UPDATE document_files SET deleted_at = ?, updated_at = ? WHERE document_id = ? AND deleted_at IS NULL',
          [at, at, id],
        );
        await softDelete('documents', id);
      });
      return files.map((f) => f.file_name);
    },

    /** Records a file that has already been copied into the app's documents folder. */
    addDocumentFile: async (file: { documentId: string; fileName: string; mimeType: string; size: number }) =>
      upsert('document_files', undefined, {
        document_id: file.documentId,
        file_name: required(file.fileName, 'fileName'),
        mime_type: file.mimeType,
        size: file.size,
      }),
    deleteDocumentFile: (id: string) => softDelete('document_files', id),

    async recordCheck(answers: CheckAnswers) {
      const at = stamp();
      await db.run(
        'INSERT INTO quarterly_checks (id, checked_on, answers, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [newId(), today(), JSON.stringify(answers), at, at],
      );
    },

    async setExpiryReview(on: IsoDate | null) {
      if (on !== null) validDate(on, 'expiryReviewOn');
      await setSetting('expiryReviewOn', on);
    },

    async setCheckInterval(months: CheckIntervalMonths) {
      if (!isCheckInterval(months)) throw new Error(`Not a check interval: ${months}`);
      await setSetting('checkIntervalMonths', String(months));
    },

    setDocumentLock: (on: boolean) => setSetting('documentLock', on ? 'on' : 'off'),

    async setOwner(owner: Owner) {
      if (owner.birthDate !== undefined) validDate(owner.birthDate, 'birthDate');
      await db.transaction(async () => {
        await setSetting('ownerName', owner.name.trim() || null);
        await setSetting('ownerBirthDate', owner.birthDate ?? null);
      });
    },

    /** Never synced: each phone asks for itself. */
    giveAnalysisConsent: () => setSetting('analysisConsent', 'yes'),

    async addAnalysis(analysis: Pick<Analysis, 'id' | 'roomId' | 'source' | 'frameCount' | 'publicKey'> & { secretKey: string }) {
      const at = stamp();
      await db.run(
        `INSERT INTO analyses (id, room_id, source, status, secret_key, public_key, frame_count, created_at, updated_at)
         VALUES (?, ?, ?, 'uploading', ?, ?, ?, ?, ?)`,
        [analysis.id, analysis.roomId, analysis.source, analysis.secretKey, analysis.publicKey, analysis.frameCount, at, at],
      );
    },

    /** The private key for the analysis's answer. Kept out of AppData so it's only read when needed. */
    async analysisSecret(id: string): Promise<string | null> {
      return (await db.first<{ secret_key: string }>('SELECT secret_key FROM analyses WHERE id = ?', [id]))?.secret_key ?? null;
    },

    setAnalysisStatus: (id: string, status: Analysis['status'], error?: string) =>
      db.run('UPDATE analyses SET status = ?, error = ?, updated_at = ? WHERE id = ?', [status, error ?? null, stamp(), id]),

    /** The answer is in: the suggestions are ready to look over. The key has done its job. */
    setAnalysisSuggestions: (id: string, suggestions: Suggestion[]) =>
      db.run("UPDATE analyses SET status = 'ready', suggestions = ?, secret_key = '', updated_at = ? WHERE id = ?", [
        JSON.stringify(suggestions),
        stamp(),
        id,
      ]),

    /** Accepted or thrown away. The caller removes the photos it kept for it. */
    deleteAnalysis: (id: string) => db.run('DELETE FROM analyses WHERE id = ?', [id]),

    /** Links this phone to a backup vault, or unlinks it with null. Never synced. */
    async setBackup(backup: { vaultId: string; entitledUntil: string } | null) {
      await db.transaction(async () => {
        await setSetting('backupVaultId', backup?.vaultId ?? null);
        await setSetting('backupEntitledUntil', backup?.entitledUntil ?? null);
        if (!backup) await setSetting('lastSyncedAt', null);
      });
    },
    setLastSynced: (at: string) => setSetting('lastSyncedAt', at),

    /** A phone restored from backup skips the welcome questions: the answers came with it. */
    markOnboarded: () => setSetting('onboardedOn', today()),

    /** Wipes everything back to first launch («Slett alle data» in Husstand). */
    async reset() {
      await db.transaction(async () => {
        // Children before the rows they point to: belongings before rooms, rooms and policies before properties.
        for (const table of [
          'analyses',
          'settings',
          'claim_files',
          'claim_items',
          'claims',
          'belonging_files',
          'belongings',
          'rooms',
          'policies',
          'properties',
          'stock_items',
          'contacts',
          'quarterly_checks',
          'document_files',
          'documents',
        ]) {
          await db.run(`DELETE FROM ${table}`);
        }
      });
    },
  };

  return store;
}

export class ValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ValidationError(field, `${field} is required`);
  return trimmed;
}

function validDate(date: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ValidationError(field, `${field} must be YYYY-MM-DD`);
}

/**
 * ISO timestamps that never repeat or go backwards within this process, even for two writes
 * in the same millisecond: sync compares them to tell what still needs uploading.
 */
export function monotonicStamp(now: () => Date) {
  let last = 0;
  return () => {
    last = Math.max(now().getTime(), last + 1);
    return new Date(last).toISOString();
  };
}

function toDocumentFile(f: { id: string; file_name: string; mime_type: string; size: number }): DocumentFile {
  return { id: f.id, fileName: f.file_name, mimeType: f.mime_type, size: f.size };
}

/** Rows of a type this version doesn't know (from a newer phone) are left out by the caller. */
function toStockItem(row: StockRow): StockItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type as StockItem['type'],
    quantity: row.quantity,
    ...(row.litres !== null && { litres: row.litres }),
    ...(row.meals !== null && { meals: row.meals }),
    ...(row.expires_on && { expiresOn: row.expires_on }),
    ...(row.bought_on && { boughtOn: row.bought_on }),
    remind: row.remind !== 0,
    location: row.location,
  };
}
