import { isStockType, peopleIn, stockType, type Household, type HouseholdMembers, type IsoDate, type StockItem } from '@egenberedskap/core';

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
  renewsOn?: IsoDate;
  sumKr?: number;
  deductibleKr?: number;
  /** «Varsle ved 90 %». */
  alertNearSum: boolean;
  /** «Ikke nå» on the underinsurance warning, at this documented value. */
  alertDismissedKr?: number;
};
export type QuarterlyAnswers = Record<string, string>;
/** This phone's link to an encrypted backup. The key itself lives in the Keychain, not here. */
export type BackupState = { vaultId: string; entitledUntil: string; lastSyncedAt: string | null };
export type DocumentFile = { id: string; fileName: string; mimeType: string; size: number };
export type StoredDocument = { id: string; name: string; files: DocumentFile[] };

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
  lastQuarterlyCheck: IsoDate | null;
  /** «Påminn meg» from the quarterly check: when to remind about expiry dates again. */
  expiryReviewOn: IsoDate | null;
  /** Ask for Face ID or the phone's code before showing documents. On unless turned off. */
  documentLock: boolean;
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
        renews_on: string | null;
        sum_kr: number | null;
        deductible_kr: number | null;
        alert_near_sum: number | null;
        alert_dismissed_kr: number | null;
      }>(
        `SELECT id, name, property_id, company, renews_on, sum_kr, deductible_kr, alert_near_sum, alert_dismissed_kr
         FROM policies WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const documents = await db.all<{ id: string; name: string }>(
        'SELECT id, name FROM documents WHERE deleted_at IS NULL ORDER BY created_at',
      );
      const files = await db.all<{ id: string; document_id: string; file_name: string; mime_type: string; size: number }>(
        `SELECT id, document_id, file_name, mime_type, size FROM document_files
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
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
          ...(p.renews_on && { renewsOn: p.renews_on }),
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
        lastQuarterlyCheck: lastCheck?.checked_on ?? null,
        expiryReviewOn: expiryReviewOn ?? null,
        documentLock: documentLock !== 'off',
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
    async deleteProperty(id: string) {
      await db.transaction(async () => {
        await softDelete('properties', id);
        const at = stamp();
        await db.run('UPDATE rooms SET deleted_at = ?, updated_at = ? WHERE property_id = ? AND deleted_at IS NULL', [
          at,
          at,
          id,
        ]);
      });
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
    deleteRoom: (id: string) => softDelete('rooms', id),

    async savePolicy(draft: Draft<Policy>) {
      if (draft.renewsOn !== undefined) validDate(draft.renewsOn, 'renewsOn');
      return upsert('policies', draft.id, {
        name: required(draft.name, 'name'),
        property_id: draft.propertyId ?? null,
        company: draft.company?.trim() || null,
        renews_on: draft.renewsOn ?? null,
        sum_kr: draft.sumKr ?? null,
        deductible_kr: draft.deductibleKr ?? null,
        alert_near_sum: draft.alertNearSum ? 1 : 0,
        alert_dismissed_kr: draft.alertDismissedKr ?? null,
      });
    },
    deletePolicy: (id: string) => softDelete('policies', id),

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

    async recordQuarterlyCheck(answers: QuarterlyAnswers) {
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

    setDocumentLock: (on: boolean) => setSetting('documentLock', on ? 'on' : 'off'),

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

    /** Wipes everything back to first launch. Only reachable from developer settings. */
    async reset() {
      await db.transaction(async () => {
        // Children before the rows they point to: rooms and policies before properties.
        for (const table of [
          'settings',
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
