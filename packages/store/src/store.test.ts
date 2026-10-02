import { DatabaseSync } from 'node:sqlite';

import { computeCoverage } from '@egenberedskap/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from './schema';
import type { SqlExecutor, SqlValue } from './sql';
import { createStore, DEFAULT_ROOMS, ValidationError, type Store } from './store';

/** Real SQLite in memory, through the same interface the app uses. */
function nodeExecutor(db: DatabaseSync): SqlExecutor {
  return {
    exec: async (sql) => void db.exec(sql),
    run: async (sql, params: SqlValue[] = []) => void db.prepare(sql).run(...params),
    all: async <T>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: SqlValue[] = []) => (db.prepare(sql).get(...params) as T) ?? null,
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

let sqlite: DatabaseSync;
let store: Store;
let today = '2026-10-02';
let clock = 0;

beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  let ids = 0;
  today = '2026-10-02';
  clock = 0;
  store = createStore({
    db: nodeExecutor(sqlite),
    newId: () => `id${++ids}`,
    now: () => new Date(Date.UTC(2026, 9, 2, 12, 0, clock++)),
    today: () => today,
  });
  await store.migrate();
});

const onboard = () => store.completeOnboarding({ name: ' Kari ', people: 2, address: 'Storgata 12' });

describe('migrations', () => {
  it('brings a new database to the current version, and is safe to run again', async () => {
    await store.migrate();
    expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: SCHEMA_VERSION });
  });
});

describe('first launch', () => {
  it('starts out not onboarded and empty', async () => {
    const data = await store.load();
    expect(data.onboarded).toBe(false);
    expect(data.properties).toEqual([]);
    expect(data.lastQuarterlyCheck).toBeNull();
  });

  it('sets up the household, home and a starter set of rooms', async () => {
    await onboard();
    const data = await store.load();
    expect(data.onboarded).toBe(true);
    expect(data.onboardedOn).toBe('2026-10-02');
    expect(data.profile).toEqual({ name: 'Kari', people: 2 });
    expect(data.household.people).toBe(2);
    expect(data.properties).toEqual([{ id: 'id1', name: 'Storgata 12', shortName: 'Hjemme' }]);
    expect(data.selectedPropertyId).toBe('id1');
    expect(data.rooms.map((r) => r.name)).toEqual(DEFAULT_ROOMS);
  });

  it('writes nothing if onboarding is invalid', async () => {
    await expect(store.completeOnboarding({ name: 'Kari', people: 0, address: 'Storgata 12' })).rejects.toThrow(
      ValidationError,
    );
    expect((await store.load()).properties).toEqual([]);
  });
});

describe('stockpile', () => {
  beforeEach(onboard);

  it('feeds the days number straight from what is stored', async () => {
    await store.saveStockItem({ name: 'Vann', category: 'water', litres: 30, expiresOn: '2026-12-01' });
    await store.saveStockItem({ name: 'Hermetikk', category: 'food', personDays: 14 });
    const data = await store.load();
    expect(data.stock).toEqual([
      { id: 'id8', name: 'Vann', category: 'water', litres: 30, expiresOn: '2026-12-01' },
      { id: 'id9', name: 'Hermetikk', category: 'food', personDays: 14 },
    ]);
    expect(computeCoverage(data.household, data.stock, today).days).toBe(5);
  });

  it('edits in place and can clear an expiry date', async () => {
    const id = await store.saveStockItem({ name: 'Vann', category: 'water', litres: 6, expiresOn: '2026-10-03' });
    await store.saveStockItem({ id, name: 'Vann, byttet', category: 'water', litres: 6 });
    expect((await store.load()).stock).toEqual([{ id, name: 'Vann, byttet', category: 'water', litres: 6 }]);
  });

  it('keeps quantities only where they mean something', async () => {
    await store.saveStockItem({ name: 'Radio', category: 'radio' });
    const row = sqlite.prepare('SELECT litres, person_days FROM stock_items').get();
    expect(row).toEqual({ litres: null, person_days: null });
  });

  it('rejects water without litres, a blank name and a malformed date', async () => {
    await expect(store.saveStockItem({ name: 'Vann', category: 'water', litres: 0 })).rejects.toThrow('litres');
    await expect(store.saveStockItem({ name: '  ', category: 'radio' })).rejects.toThrow('name');
    await expect(store.saveStockItem({ name: 'Mat', category: 'food', personDays: 2, expiresOn: '2/10' })).rejects.toThrow(
      'expiresOn',
    );
  });

  it('soft-deletes, so a later sync can see what was removed', async () => {
    const id = await store.saveStockItem({ name: 'Radio', category: 'radio' });
    await store.deleteStockItem(id);
    expect((await store.load()).stock).toEqual([]);
    expect(sqlite.prepare('SELECT deleted_at FROM stock_items WHERE id = ?').get(id)).toEqual({
      deleted_at: expect.any(String),
    });
  });
});

describe('contacts, meeting place and household', () => {
  beforeEach(onboard);

  it('stores emergency contacts', async () => {
    const id = await store.saveContact({ name: 'Ola Nordmann', relation: 'Partner', phone: '900 00 000' });
    await store.saveContact({ id, name: 'Ola Nordmann', relation: 'Ektemann', phone: '900 00 000' });
    expect((await store.load()).contacts).toEqual([
      { id, name: 'Ola Nordmann', relation: 'Ektemann', phone: '900 00 000' },
    ]);
  });

  it('sets and clears the meeting place', async () => {
    await store.setMeetingPlace({ name: 'Skolegården', address: 'Storgata 40' });
    expect((await store.load()).meetingPlace).toEqual({ name: 'Skolegården', address: 'Storgata 40' });
    await store.setMeetingPlace(null);
    expect((await store.load()).meetingPlace).toBeNull();
  });

  it('changes the household size the numbers are measured against', async () => {
    await store.updateProfile({ name: 'Kari', people: 4 });
    expect((await store.load()).household.people).toBe(4);
  });
});

describe('properties and rooms', () => {
  beforeEach(onboard);

  it('adds rooms at the end and keeps their order when renamed', async () => {
    const id = await store.saveRoom({ propertyId: 'id1', name: 'Kontor' });
    await store.saveRoom({ id, propertyId: 'id1', name: 'Hjemmekontor' });
    expect((await store.load()).rooms.map((r) => r.name).slice(-2)).toEqual(['Bod', 'Hjemmekontor']);
  });

  it('removes a property with its rooms and falls back to the remaining one', async () => {
    const cabin = await store.saveProperty({ name: 'Hafjell', shortName: 'Hytta' });
    await store.saveRoom({ propertyId: cabin, name: 'Stue' });
    await store.selectProperty(cabin);
    expect((await store.load()).selectedPropertyId).toBe(cabin);

    await store.deleteProperty(cabin);
    const data = await store.load();
    expect(data.properties.map((p) => p.shortName)).toEqual(['Hjemme']);
    expect(data.selectedPropertyId).toBe('id1');
    expect(data.rooms.every((r) => r.propertyId === 'id1')).toBe(true);
  });
});

describe('insurance and quarterly check', () => {
  beforeEach(onboard);

  it('stores policies with only the fields that were given', async () => {
    await store.savePolicy({ name: 'Innbo', renewsOn: '2027-01-01', sumKr: 1_000_000, deductibleKr: 4_000 });
    await store.savePolicy({ name: 'Reise' });
    expect((await store.load()).policies).toEqual([
      { id: 'id8', name: 'Innbo', renewsOn: '2027-01-01', sumKr: 1_000_000, deductibleKr: 4_000 },
      { id: 'id9', name: 'Reise' },
    ]);
  });

  it('remembers the latest quarterly check', async () => {
    await store.recordQuarterlyCheck({ household: 'Ja' });
    today = '2027-01-03';
    await store.recordQuarterlyCheck({ household: 'Ja' });
    expect((await store.load()).lastQuarterlyCheck).toBe('2027-01-03');
  });
});

describe('reset', () => {
  it('returns to first launch', async () => {
    await onboard();
    await store.saveStockItem({ name: 'Radio', category: 'radio' });
    await store.reset();
    const data = await store.load();
    expect(data.onboarded).toBe(false);
    expect(data.stock).toEqual([]);
  });
});
