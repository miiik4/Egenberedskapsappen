import type { Household, IsoDate, StockCategory, StockItem } from '@egenberedskap/core';

import { migrate } from './schema';
import type { SqlExecutor, SqlValue } from './sql';

export type Profile = { name: string; people: number };
export type MeetingPlace = { name: string; address: string };
export type Property = { id: string; name: string; shortName: string };
export type Room = { id: string; propertyId: string; name: string };
export type Contact = { id: string; name: string; relation: string; phone: string };
export type Policy = {
  id: string;
  name: string;
  renewsOn?: IsoDate;
  sumKr?: number;
  deductibleKr?: number;
};
export type QuarterlyAnswers = Record<string, string>;

/** Everything the screens show. Small enough to load whole after every change. */
export type AppData = {
  onboarded: boolean;
  onboardedOn: IsoDate | null;
  profile: Profile;
  household: Household;
  meetingPlace: MeetingPlace | null;
  properties: Property[];
  selectedPropertyId: string | null;
  rooms: Room[];
  stock: StockItem[];
  contacts: Contact[];
  policies: Policy[];
  lastQuarterlyCheck: IsoDate | null;
  /** «Påminn meg» from the quarterly check: when to remind about expiry dates again. */
  expiryReviewOn: IsoDate | null;
};

/** Without an id it's a new record; with one it replaces that record. */
export type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string };
export type StockDraft =
  | Draft<Extract<StockItem, { category: 'water' }>>
  | Draft<Extract<StockItem, { category: 'food' }>>
  | Draft<Extract<StockItem, { category: Exclude<StockCategory, 'water' | 'food'> }>>;

export type OnboardingInput = { name: string; people: number; address: string };

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
  category: StockCategory;
  litres: number | null;
  person_days: number | null;
  expires_on: string | null;
};

export type Store = ReturnType<typeof createStore>;

export function createStore({ db, newId, now, today }: Deps) {
  const stamp = () => now().toISOString();

  const getSetting = async (key: string) =>
    (await db.first<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]))?.value ?? null;

  const setSetting = (key: string, value: string | null) =>
    value === null
      ? db.run('DELETE FROM settings WHERE key = ?', [key])
      : db.run(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
          [key, value],
        );

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

  const store = {
    migrate: () => migrate(db),

    async load(): Promise<AppData> {
      const [onboardedOn, name, people, meetingName, meetingAddress, selected, expiryReviewOn] = await Promise.all(
        [
          'onboardedOn',
          'name',
          'people',
          'meetingPlaceName',
          'meetingPlaceAddress',
          'selectedPropertyId',
          'expiryReviewOn',
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
      const stock = await db.all<StockRow>(
        `SELECT id, name, category, litres, person_days, expires_on FROM stock_items
         WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      const contacts = await db.all<Contact>(
        'SELECT id, name, relation, phone FROM contacts WHERE deleted_at IS NULL ORDER BY created_at',
      );
      const policies = await db.all<{
        id: string;
        name: string;
        renews_on: string | null;
        sum_kr: number | null;
        deductible_kr: number | null;
      }>('SELECT id, name, renews_on, sum_kr, deductible_kr FROM policies WHERE deleted_at IS NULL ORDER BY created_at');
      const lastCheck = await db.first<{ checked_on: string }>(
        'SELECT checked_on FROM quarterly_checks ORDER BY checked_on DESC, created_at DESC LIMIT 1',
      );

      const householdPeople = Math.max(1, Number(people ?? 1));
      const visibleProperties = properties.map((p) => ({ id: p.id, name: p.name, shortName: p.short_name }));
      return {
        onboarded: onboardedOn !== null,
        onboardedOn: onboardedOn ?? null,
        profile: { name: name ?? '', people: householdPeople },
        household: { id: HOUSEHOLD_ID, people: householdPeople },
        meetingPlace: meetingName ? { name: meetingName, address: meetingAddress ?? '' } : null,
        properties: visibleProperties,
        // Fall back to the first property if the selected one was removed.
        selectedPropertyId: visibleProperties.some((p) => p.id === selected)
          ? (selected ?? null)
          : (visibleProperties[0]?.id ?? null),
        rooms: rooms.map((r) => ({ id: r.id, propertyId: r.property_id, name: r.name })),
        stock: stock.map(toStockItem),
        contacts,
        policies: policies.map((p) => ({
          id: p.id,
          name: p.name,
          ...(p.renews_on && { renewsOn: p.renews_on }),
          ...(p.sum_kr !== null && { sumKr: p.sum_kr }),
          ...(p.deductible_kr !== null && { deductibleKr: p.deductible_kr }),
        })),
        lastQuarterlyCheck: lastCheck?.checked_on ?? null,
        expiryReviewOn: expiryReviewOn ?? null,
      };
    },

    /** First launch: who's in the household and where they live, with a starter set of rooms. */
    async completeOnboarding(input: OnboardingInput) {
      await db.transaction(async () => {
        await setSetting('name', input.name.trim());
        await setSetting('people', String(validPeople(input.people)));
        const propertyId = await upsert('properties', undefined, {
          name: input.address.trim(),
          short_name: 'Hjemme',
        });
        await setSetting('selectedPropertyId', propertyId);
        for (const [sort, room] of DEFAULT_ROOMS.entries()) {
          await upsert('rooms', undefined, { property_id: propertyId, name: room, sort });
        }
        await setSetting('onboardedOn', today());
      });
    },

    async updateProfile(profile: Profile) {
      await db.transaction(async () => {
        await setSetting('name', profile.name.trim());
        await setSetting('people', String(validPeople(profile.people)));
      });
    },

    async setMeetingPlace(place: MeetingPlace | null) {
      await db.transaction(async () => {
        await setSetting('meetingPlaceName', place ? required(place.name, 'name') : null);
        await setSetting('meetingPlaceAddress', place ? place.address.trim() : null);
      });
    },

    selectProperty: (id: string) => setSetting('selectedPropertyId', id),

    async saveStockItem(draft: StockDraft) {
      const quantity = (value: number | undefined, field: string) => {
        if (value === undefined || !Number.isFinite(value) || value <= 0) {
          throw new ValidationError(field, `${field} must be a positive number`);
        }
        return value;
      };
      if (draft.expiresOn !== undefined) validDate(draft.expiresOn, 'expiresOn');
      return upsert('stock_items', draft.id, {
        name: required(draft.name, 'name'),
        category: draft.category,
        litres: draft.category === 'water' ? quantity(draft.litres, 'litres') : null,
        person_days: draft.category === 'food' ? quantity(draft.personDays, 'personDays') : null,
        expires_on: draft.expiresOn ?? null,
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
        renews_on: draft.renewsOn ?? null,
        sum_kr: draft.sumKr ?? null,
        deductible_kr: draft.deductibleKr ?? null,
      });
    },
    deletePolicy: (id: string) => softDelete('policies', id),

    async recordQuarterlyCheck(answers: QuarterlyAnswers) {
      await db.run('INSERT INTO quarterly_checks (id, checked_on, answers, created_at) VALUES (?, ?, ?, ?)', [
        newId(),
        today(),
        JSON.stringify(answers),
        stamp(),
      ]);
    },

    async setExpiryReview(on: IsoDate | null) {
      if (on !== null) validDate(on, 'expiryReviewOn');
      await setSetting('expiryReviewOn', on);
    },

    /** Wipes everything back to first launch. Only reachable from developer settings. */
    async reset() {
      await db.transaction(async () => {
        for (const table of ['settings', 'rooms', 'properties', 'stock_items', 'contacts', 'policies', 'quarterly_checks']) {
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

function validPeople(people: number): number {
  if (!Number.isInteger(people) || people < 1 || people > 50) {
    throw new ValidationError('people', 'people must be a whole number from 1 to 50');
  }
  return people;
}

function validDate(date: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ValidationError(field, `${field} must be YYYY-MM-DD`);
}

function toStockItem(row: StockRow): StockItem {
  const base = { id: row.id, name: row.name, ...(row.expires_on && { expiresOn: row.expires_on }) };
  switch (row.category) {
    case 'water':
      return { ...base, category: 'water', litres: row.litres ?? 0 };
    case 'food':
      return { ...base, category: 'food', personDays: row.person_days ?? 0 };
    default:
      return { ...base, category: row.category };
  }
}
