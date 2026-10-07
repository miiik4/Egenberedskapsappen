import { DatabaseSync } from 'node:sqlite';

import { computeCoverage } from '@egenberedskap/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { migrate, SCHEMA_VERSION } from './schema';
import type { SqlExecutor, SqlValue } from './sql';
import { createStore, DEFAULT_ROOMS, ValidationError, type Store } from './store';
import { createSyncSource } from './sync-source';

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

const two = { adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
const onboard = () => store.completeOnboarding({ members: two, items: [] });
const item = { quantity: 1, remind: true, location: '' };

describe('migrations', () => {
  it('brings a new database to the current version, and is safe to run again', async () => {
    await store.migrate();
    expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: SCHEMA_VERSION });
  });

  it('gives version 3 items a type, and counts their food in meals', async () => {
    const old = new DatabaseSync(':memory:');
    await migrate(nodeExecutor(old), 3);
    old.exec(`
      INSERT INTO settings (key, value, updated_at) VALUES ('people', '3', '2026-10-01T10:00:00.000Z');
      INSERT INTO stock_items (id, name, category, person_days, created_at, updated_at, pushed_at)
        VALUES ('f1', 'Hermetikk', 'food', 4, '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z'),
               ('l1', 'Lommelykt', 'heatAndLight', NULL, '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z', NULL);
    `);
    const upgraded = createStore({ db: nodeExecutor(old), newId: () => 'x', now: () => new Date(), today: () => today });
    await upgraded.migrate();
    const data = await upgraded.load();
    expect(data.stock).toEqual([
      { id: 'f1', name: 'Hermetikk', type: 'cannedMeals', meals: 12, ...item },
      { id: 'l1', name: 'Lommelykt', type: 'torch', ...item },
    ]);
    // The old head count reads as adults.
    expect(data.household).toMatchObject({ adults: 3, seniors: 0, children: 0 });
    // Every item goes up again in the new shape.
    expect(old.prepare('SELECT COUNT(*) AS n FROM stock_items WHERE pushed_at IS NULL').get()).toEqual({ n: 2 });
  });

  it('starts the backup download over when a synced table is added', async () => {
    const old = new DatabaseSync(':memory:');
    await migrate(nodeExecutor(old), 4);
    old.exec(`INSERT INTO settings (key, value, updated_at) VALUES ('syncCursor', '2026-10-01T10:00:00Z', '2026-10-01T10:00:00Z')`);
    await migrate(nodeExecutor(old));
    expect(old.prepare("SELECT COUNT(*) AS n FROM settings WHERE key = 'syncCursor'").get()).toEqual({ n: 0 });
  });

  it('upgrades a version 1 database without losing data', async () => {
    // A phone that installed the very first release: schema 1, with data written then.
    const old = new DatabaseSync(':memory:');
    await migrate(nodeExecutor(old), 1);
    old.exec(`
      INSERT INTO settings (key, value) VALUES ('name', 'Kari'), ('onboardedOn', '2026-10-01');
      INSERT INTO stock_items (id, name, category, litres, created_at, updated_at)
        VALUES ('w1', 'Vann', 'water', 30, '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z');
      INSERT INTO quarterly_checks (id, checked_on, answers, created_at)
        VALUES ('q1', '2026-10-01', '{}', '2026-10-01T10:00:00.000Z');
    `);

    const upgraded = createStore({ db: nodeExecutor(old), newId: () => 'x', now: () => new Date(), today: () => today });
    await upgraded.migrate();
    const data = await upgraded.load();
    expect(old.prepare('PRAGMA user_version').get()).toEqual({ user_version: SCHEMA_VERSION });
    expect(data.stock).toEqual([{ id: 'w1', name: 'Vann', type: 'drinkingWater', litres: 30, ...item }]);
    expect(data.lastQuarterlyCheck).toBe('2026-10-01');
    expect(data.documents).toEqual([]);
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
    expect(data.household).toEqual({ id: 'household', ...two });
    expect(data.properties).toEqual([{ id: 'id1', name: 'Hjemme', shortName: 'Hjemme' }]);
    expect(data.selectedPropertyId).toBe('id1');
    expect(data.rooms.map((r) => r.name)).toEqual(DEFAULT_ROOMS);
  });

  it('saves what they already have', async () => {
    await store.completeOnboarding({
      members: two,
      items: [{ name: 'Vann på kanner', type: 'drinkingWater', litres: 20, ...item }],
    });
    expect((await store.load()).stock).toMatchObject([{ type: 'drinkingWater', litres: 20 }]);
  });

  it('writes nothing if onboarding is invalid', async () => {
    const nobody = { ...two, adults: 0, dogs: 1 };
    await expect(store.completeOnboarding({ members: nobody, items: [] })).rejects.toThrow(ValidationError);
    await expect(
      store.completeOnboarding({ members: two, items: [{ name: 'Vann', type: 'drinkingWater', ...item }] }),
    ).rejects.toThrow('litres');
    expect((await store.load()).properties).toEqual([]);
    expect((await store.load()).stock).toEqual([]);
  });
});

describe('stockpile', () => {
  beforeEach(onboard);

  it('feeds the days number straight from what is stored', async () => {
    await store.saveStockItem({ name: 'Vann', type: 'drinkingWater', litres: 30, expiresOn: '2026-12-01', ...item });
    await store.saveStockItem({ name: 'Hermetikk', type: 'cannedMeals', meals: 42, ...item, quantity: 6, location: ' Bod ' });
    await store.saveStockItem({ name: 'Ovn', type: 'heatSource', ...item, remind: false, boughtOn: '2026-01-02' });
    const data = await store.load();
    expect(data.stock).toEqual([
      { id: 'id8', name: 'Vann', type: 'drinkingWater', litres: 30, expiresOn: '2026-12-01', ...item },
      { id: 'id9', name: 'Hermetikk', type: 'cannedMeals', meals: 42, quantity: 6, remind: true, location: 'Bod' },
      { id: 'id10', name: 'Ovn', type: 'heatSource', quantity: 1, boughtOn: '2026-01-02', remind: false, location: '' },
    ]);
    expect(computeCoverage(data.household, data.stock, today).days).toBe(5);
  });

  it('edits in place and can clear an expiry date', async () => {
    const id = await store.saveStockItem({ name: 'Vann', type: 'drinkingWater', litres: 6, expiresOn: '2026-10-03', ...item });
    await store.saveStockItem({ id, name: 'Vann, byttet', type: 'drinkingWater', litres: 6, ...item });
    expect((await store.load()).stock).toEqual([{ id, name: 'Vann, byttet', type: 'drinkingWater', litres: 6, ...item }]);
  });

  it('keeps quantities only where they mean something', async () => {
    await store.saveStockItem({ name: 'Radio', type: 'radio', litres: 3, meals: 2, ...item });
    const row = sqlite.prepare('SELECT litres, meals FROM stock_items').get();
    expect(row).toEqual({ litres: null, meals: null });
  });

  it('rejects water without litres, food without meals, a blank name, a bad count, type or date', async () => {
    await expect(store.saveStockItem({ name: 'Vann', type: 'drinkingWater', litres: 0, ...item })).rejects.toThrow('litres');
    await expect(store.saveStockItem({ name: 'Mat', type: 'oats', ...item })).rejects.toThrow('meals');
    await expect(store.saveStockItem({ name: '  ', type: 'radio', ...item })).rejects.toThrow('name');
    await expect(store.saveStockItem({ name: 'Radio', type: 'radio', ...item, quantity: 0 })).rejects.toThrow('quantity');
    await expect(store.saveStockItem({ name: 'Radio', type: 'tv' as 'radio', ...item })).rejects.toThrow('type');
    await expect(store.saveStockItem({ name: 'Mat', type: 'oats', meals: 2, expiresOn: '2/10', ...item })).rejects.toThrow(
      'expiresOn',
    );
  });

  it('soft-deletes, so a later sync can see what was removed', async () => {
    const id = await store.saveStockItem({ name: 'Radio', type: 'radio', ...item });
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

  it('changes the household the numbers are measured against', async () => {
    const family = { adults: 2, seniors: 1, children: 1, infants: 0, dogs: 1, cats: 0 };
    await store.updateHousehold(family);
    expect((await store.load()).household).toEqual({ id: 'household', ...family });
    await expect(store.updateHousehold({ ...family, children: -1 })).rejects.toThrow('children');
    await expect(store.updateHousehold({ ...family, adults: 0, seniors: 0, children: 0 })).rejects.toThrow(ValidationError);
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

describe('belongings', () => {
  beforeEach(onboard);
  // Onboarding made the home id1 and its rooms id2 (Stue) to id7 (Bod).
  const stue = 'id2';
  const photo = (fileName: string) => ({ kind: 'photo' as const, fileName, mimeType: 'image/jpeg', size: 10 });

  it('stores a thing with its value, and loads it with its photo and receipt', async () => {
    const tv = await store.saveBelonging({ roomId: stue, name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: true });
    await store.setBelongingFile({ belongingId: tv, ...photo('tv.jpg') });
    await store.setBelongingFile({ belongingId: tv, kind: 'receipt', fileName: 'kvittering.pdf', mimeType: 'application/pdf', size: 20 });
    await store.saveBelonging({ roomId: stue, name: 'Lampe', category: 'Møbler', valueEstimated: false });
    const [first, second] = (await store.load()).belongings;
    expect(first).toMatchObject({
      id: tv,
      roomId: stue,
      valueKr: 12_000,
      valueEstimated: true,
      photo: { fileName: 'tv.jpg', kind: 'photo' },
      receipt: { fileName: 'kvittering.pdf', mimeType: 'application/pdf' },
    });
    expect(second).toEqual({ id: expect.any(String), roomId: stue, name: 'Lampe', category: 'Møbler', valueEstimated: false });
  });

  it('replaces a photo and hands back the old file to delete', async () => {
    const tv = await store.saveBelonging({ roomId: stue, name: 'TV', category: 'Elektronikk', valueEstimated: false });
    await store.setBelongingFile({ belongingId: tv, ...photo('old.jpg') });
    expect(await store.setBelongingFile({ belongingId: tv, ...photo('new.jpg') })).toEqual(['old.jpg']);
    const [loaded] = (await store.load()).belongings;
    expect(loaded!.photo!.fileName).toBe('new.jpg');
    expect(await store.removeBelongingFile(loaded!.photo!.id)).toEqual(['new.jpg']);
    expect((await store.load()).belongings[0]!.photo).toBeUndefined();
  });

  it('rejects an unknown category, a negative or fractional value, and a blank name', async () => {
    const base = { roomId: stue, name: 'TV', category: 'Elektronikk' as const, valueEstimated: false };
    await expect(store.saveBelonging({ ...base, category: 'Bil' as 'Annet' })).rejects.toThrow('category');
    await expect(store.saveBelonging({ ...base, valueKr: -1 })).rejects.toThrow('valueKr');
    await expect(store.saveBelonging({ ...base, valueKr: 99.5 })).rejects.toThrow('valueKr');
    await expect(store.saveBelonging({ ...base, name: ' ' })).rejects.toThrow('name');
  });

  it('removes what a deleted room or home held, files included', async () => {
    const tv = await store.saveBelonging({ roomId: stue, name: 'TV', category: 'Elektronikk', valueEstimated: false });
    await store.setBelongingFile({ belongingId: tv, ...photo('tv.jpg') });
    expect(await store.deleteRoom(stue)).toEqual(['tv.jpg']);
    expect((await store.load()).belongings).toEqual([]);

    const kitchen = 'id3';
    const oven = await store.saveBelonging({ roomId: kitchen, name: 'Ovn', category: 'Hvitevarer', valueEstimated: false });
    await store.setBelongingFile({ belongingId: oven, ...photo('ovn.jpg') });
    expect(await store.deleteProperty('id1')).toEqual(['ovn.jpg']);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM belonging_files WHERE deleted_at IS NULL').get()).toEqual({ n: 0 });
  });

  it('deletes a belonging with its files', async () => {
    const tv = await store.saveBelonging({ roomId: stue, name: 'TV', category: 'Elektronikk', valueEstimated: false });
    await store.setBelongingFile({ belongingId: tv, ...photo('tv.jpg') });
    expect(await store.deleteBelonging(tv)).toEqual(['tv.jpg']);
    expect((await store.load()).belongings).toEqual([]);
  });
});

describe('damage claims', () => {
  beforeEach(onboard);
  // Onboarding made the home id1 and its rooms id2 (Stue) to id7 (Bod).
  const home = 'id1';
  const stue = 'id2';
  const water = { propertyId: home, kind: 'water' as const, happenedOn: '2026-10-01', description: ' Lekkasje fra oppvaskmaskinen ' };
  const file = (fileName: string) => ({ fileName, mimeType: 'image/jpeg', size: 10 });

  it('keeps a claim with its things and photos, newest first', async () => {
    const older = await store.saveClaim({ ...water, happenedOn: '2025-12-24', kind: 'fire', description: '' });
    const claimId = await store.saveClaim(water);
    const tv = await store.saveClaimItem({ claimId, roomId: stue, belongingId: 'b1', name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: true, damage: 'destroyed' });
    await store.saveClaimItem({ claimId, name: 'Teppe', category: 'Annet', valueEstimated: false, damage: 'damaged' });
    await store.addClaimPhoto({ claimId, ...file('skade1.jpg') });
    await store.addClaimPhoto({ claimId, ...file('skade2.jpg') });

    const { claims } = await store.load();
    expect(claims.map((c) => c.id)).toEqual([claimId, older]);
    const [claim] = claims;
    expect(claim).toMatchObject({ propertyId: home, kind: 'water', happenedOn: '2026-10-01', description: 'Lekkasje fra oppvaskmaskinen' });
    expect(claim).not.toHaveProperty('reportedOn');
    expect(claim!.items).toEqual([
      { id: tv, claimId, belongingId: 'b1', roomId: stue, name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: true, damage: 'destroyed' },
      { id: expect.any(String), claimId, name: 'Teppe', category: 'Annet', valueEstimated: false, damage: 'damaged' },
    ]);
    expect(claim!.photos.map((p) => p.fileName)).toEqual(['skade1.jpg', 'skade2.jpg']);
  });

  it('keeps what was lost when the belonging itself is deleted', async () => {
    const claimId = await store.saveClaim(water);
    const tv = await store.saveBelonging({ roomId: stue, name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: false });
    await store.saveClaimItem({ claimId, belongingId: tv, roomId: stue, name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: false, damage: 'destroyed' });
    await store.deleteRoom(stue);
    expect((await store.load()).claims[0]!.items).toMatchObject([{ belongingId: tv, name: 'TV', valueKr: 12_000 }]);
  });

  it('marks a claim reported, and saving the form again leaves that alone', async () => {
    const claimId = await store.saveClaim(water);
    await store.setClaimReported(claimId, '2026-10-04');
    await store.saveClaim({ ...water, id: claimId, policeReport: ' ' });
    const [claim] = (await store.load()).claims;
    expect(claim!.reportedOn).toBe('2026-10-04');
    expect(claim).not.toHaveProperty('policeReport');
    await store.setClaimReported(claimId, null);
    expect((await store.load()).claims[0]).not.toHaveProperty('reportedOn');
  });

  it('keeps one receipt per thing and hands back the replaced one', async () => {
    const claimId = await store.saveClaim(water);
    const rug = await store.saveClaimItem({ claimId, name: 'Teppe', category: 'Annet', valueEstimated: false, damage: 'damaged' });
    expect(await store.setClaimItemReceipt({ claimItemId: rug, ...file('old.jpg') })).toEqual([]);
    expect(await store.setClaimItemReceipt({ claimItemId: rug, ...file('new.jpg') })).toEqual(['old.jpg']);
    const [claim] = (await store.load()).claims;
    expect(claim!.items[0]!.receipt).toMatchObject({ fileName: 'new.jpg' });
    expect(claim!.photos).toEqual([]);
    await expect(store.setClaimItemReceipt({ claimItemId: 'nope', ...file('x.jpg') })).rejects.toThrow('claimItemId');
  });

  it('removes a thing with its receipt, a single photo, or the whole claim with its files', async () => {
    const claimId = await store.saveClaim(water);
    const rug = await store.saveClaimItem({ claimId, name: 'Teppe', category: 'Annet', valueEstimated: false, damage: 'damaged' });
    await store.setClaimItemReceipt({ claimItemId: rug, ...file('kvittering.jpg') });
    expect(await store.deleteClaimItem(rug)).toEqual(['kvittering.jpg']);

    const photo = await store.addClaimPhoto({ claimId, ...file('a.jpg') });
    await store.addClaimPhoto({ claimId, ...file('b.jpg') });
    expect(await store.removeClaimFile(photo)).toEqual(['a.jpg']);

    const sofa = await store.saveClaimItem({ claimId, name: 'Sofa', category: 'Møbler', valueEstimated: false, damage: 'damaged' });
    await store.setClaimItemReceipt({ claimItemId: sofa, ...file('sofa.jpg') });
    expect((await store.deleteClaim(claimId)).sort()).toEqual(['b.jpg', 'sofa.jpg']);
    expect((await store.load()).claims).toEqual([]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM claim_items WHERE deleted_at IS NULL').get()).toEqual({ n: 0 });
  });

  it('rejects an unknown kind, damage or category, a bad date or value, and a blank name', async () => {
    await expect(store.saveClaim({ ...water, kind: 'flood' as 'water' })).rejects.toThrow('kind');
    await expect(store.saveClaim({ ...water, happenedOn: '1.10.2026' })).rejects.toThrow('happenedOn');
    const claimId = await store.saveClaim(water);
    await expect(store.setClaimReported(claimId, 'i dag')).rejects.toThrow('reportedOn');
    const base = { claimId, name: 'TV', category: 'Elektronikk' as const, valueEstimated: false, damage: 'destroyed' as const };
    await expect(store.saveClaimItem({ ...base, damage: 'lost' as 'stolen' })).rejects.toThrow('damage');
    await expect(store.saveClaimItem({ ...base, category: 'Bil' as 'Annet' })).rejects.toThrow('category');
    await expect(store.saveClaimItem({ ...base, valueKr: 99.5 })).rejects.toThrow('valueKr');
    await expect(store.saveClaimItem({ ...base, name: ' ' })).rejects.toThrow('name');
  });

  it('syncs claims, their things and their files, and reads values from a newer version safely', async () => {
    const claimId = await store.saveClaim(water);
    const rug = await store.saveClaimItem({ claimId, name: 'Teppe', category: 'Annet', valueEstimated: false, damage: 'damaged' });
    const photo = await store.addClaimPhoto({ claimId, ...file('skade.jpg') });
    const source = createSyncSource(nodeExecutor(sqlite));
    const types = (await source.pending()).map((c) => c.type);
    expect(types).toEqual(expect.arrayContaining(['claims', 'claim_items', 'claim_files']));
    expect(types.indexOf('claims')).toBeLessThan(types.indexOf('claim_items'));
    expect(types.indexOf('claim_items')).toBeLessThan(types.indexOf('claim_files'));
    expect(await source.files()).toContainEqual({ id: photo, fileName: 'skade.jpg', deleted: false, uploaded: false });

    await source.apply({ type: 'claims', id: claimId, updatedAt: '2030-01-01T00:00:00.000Z', deleted: false, fields: { property_id: home, kind: 'avalanche', happened_on: '2026-10-01', description: '' } });
    await source.apply({ type: 'claim_items', id: rug, updatedAt: '2030-01-01T00:00:00.000Z', deleted: false, fields: { claim_id: claimId, name: 'Teppe', category: 'Annet', value_estimated: 0, damage: 'melted' } });
    const [claim] = (await store.load()).claims;
    expect(claim!.kind).toBe('other');
    expect(claim!.items[0]!.damage).toBe('damaged');
  });
});

describe('AI analyses', () => {
  beforeEach(onboard);
  const start = () =>
    store.addAnalysis({ id: 'job-1', roomId: 'id2', source: 'photos', frameCount: 4, publicKey: 'pub', secretKey: 'secret' });

  it('follows an analysis from upload to suggestions, keeping the key out of the loaded data', async () => {
    await start();
    expect((await store.load()).analyses).toEqual([
      { id: 'job-1', roomId: 'id2', source: 'photos', status: 'uploading', frameCount: 4, publicKey: 'pub', createdAt: expect.any(String) },
    ]);
    expect(JSON.stringify(await store.load())).not.toContain('secret');
    expect(await store.analysisSecret('job-1')).toBe('secret');

    await store.setAnalysisStatus('job-1', 'waiting');
    const suggestion = { name: 'Gitar', category: 'Musikkinstrument' as const, valueKr: 4500, selected: true, valueEdited: false };
    await store.setAnalysisSuggestions('job-1', [suggestion]);
    expect((await store.load()).analyses[0]).toMatchObject({ status: 'ready', suggestions: [suggestion] });
    // Once the answer is open, the key is no longer kept.
    expect(await store.analysisSecret('job-1')).toBe('');

    await store.deleteAnalysis('job-1');
    expect((await store.load()).analyses).toEqual([]);
  });

  it('records why one failed', async () => {
    await start();
    await store.setAnalysisStatus('job-1', 'failed', 'daily-limit');
    expect((await store.load()).analyses[0]).toMatchObject({ status: 'failed', error: 'daily-limit' });
  });

  it('keeps the owner for the report, and clears it', async () => {
    await store.setOwner({ name: ' Kari Nordmann ', birthDate: '1985-03-14' });
    expect((await store.load()).owner).toEqual({ name: 'Kari Nordmann', birthDate: '1985-03-14' });
    await store.setOwner({ name: '' });
    expect((await store.load()).owner).toEqual({ name: '' });
    await expect(store.setOwner({ name: 'Kari', birthDate: '14.03.1985' })).rejects.toThrow('birthDate');
  });

  it('never syncs, and asks for consent on each phone', async () => {
    await start();
    await store.giveAnalysisConsent();
    expect((await store.load()).analysisConsent).toBe(true);
    const changes = await createSyncSource(nodeExecutor(sqlite)).pending();
    expect(changes.some((c) => c.type === 'analyses' || c.id === 'analysisConsent')).toBe(false);
  });
});

describe('insurance and quarterly check', () => {
  beforeEach(onboard);

  it('stores policies with only the fields that were given', async () => {
    await store.savePolicy({
      name: 'Innboforsikring',
      propertyId: 'id1',
      company: 'Fremtind',
      sumKr: 600_000,
      deductibleKr: 4_000,
      alertNearSum: true,
      alertDismissedKr: 642_000,
    });
    await store.savePolicy({ name: 'Reise', alertNearSum: false });
    expect((await store.load()).policies).toEqual([
      {
        id: 'id8',
        name: 'Innboforsikring',
        propertyId: 'id1',
        company: 'Fremtind',
        sumKr: 600_000,
        deductibleKr: 4_000,
        alertNearSum: true,
        alertDismissedKr: 642_000,
      },
      { id: 'id9', name: 'Reise', alertNearSum: false },
    ]);
  });

  it('remembers this phone\'s backup link, and forgets it', async () => {
    expect((await store.load()).backup).toBeNull();
    await store.setBackup({ vaultId: 'v'.repeat(64), entitledUntil: '2027-10-03T00:00:00.000Z' });
    await store.setLastSynced('2026-10-03T08:00:00.000Z');
    expect((await store.load()).backup).toEqual({
      vaultId: 'v'.repeat(64),
      entitledUntil: '2027-10-03T00:00:00.000Z',
      lastSyncedAt: '2026-10-03T08:00:00.000Z',
    });
    await store.setBackup(null);
    expect((await store.load()).backup).toBeNull();
  });

  it('locks documents unless the user turns it off', async () => {
    expect((await store.load()).documentLock).toBe(true);
    await store.setDocumentLock(false);
    expect((await store.load()).documentLock).toBe(false);
    await store.setDocumentLock(true);
    expect((await store.load()).documentLock).toBe(true);
  });

  it('remembers and clears a requested expiry review', async () => {
    await store.setExpiryReview('2026-10-09');
    expect((await store.load()).expiryReviewOn).toBe('2026-10-09');
    await store.setExpiryReview(null);
    expect((await store.load()).expiryReviewOn).toBeNull();
  });

  it('remembers the latest quarterly check', async () => {
    await store.recordQuarterlyCheck({ household: 'Ja' });
    today = '2027-01-03';
    await store.recordQuarterlyCheck({ household: 'Ja' });
    expect((await store.load()).lastQuarterlyCheck).toBe('2027-01-03');
  });
});

describe('documents', () => {
  beforeEach(onboard);

  it('keeps documents with their files, in the order they were added', async () => {
    const doc = await store.saveDocument({ name: 'Pass, Kari og Ola' });
    await store.addDocumentFile({ documentId: doc, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 1200 });
    await store.addDocumentFile({ documentId: doc, fileName: 'b.pdf', mimeType: 'application/pdf', size: 3400 });
    const [stored] = (await store.load()).documents;
    expect(stored).toMatchObject({ id: doc, name: 'Pass, Kari og Ola' });
    expect(stored!.files.map((f) => [f.fileName, f.mimeType, f.size])).toEqual([
      ['a.jpg', 'image/jpeg', 1200],
      ['b.pdf', 'application/pdf', 3400],
    ]);
  });

  it('renames without touching the files', async () => {
    const doc = await store.saveDocument({ name: 'Pass' });
    await store.addDocumentFile({ documentId: doc, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 1 });
    await store.saveDocument({ id: doc, name: 'Pass, Kari' });
    expect((await store.load()).documents[0]).toMatchObject({ name: 'Pass, Kari', files: [{ fileName: 'a.jpg' }] });
  });

  it('removes one file', async () => {
    const doc = await store.saveDocument({ name: 'Resepter' });
    const file = await store.addDocumentFile({ documentId: doc, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 1 });
    await store.deleteDocumentFile(file);
    expect((await store.load()).documents[0]!.files).toEqual([]);
  });

  it('removes a document with its files, and says which files to delete from disk', async () => {
    const doc = await store.saveDocument({ name: 'Skjøte' });
    await store.addDocumentFile({ documentId: doc, fileName: 'a.pdf', mimeType: 'application/pdf', size: 1 });
    await store.addDocumentFile({ documentId: doc, fileName: 'b.pdf', mimeType: 'application/pdf', size: 1 });
    expect(await store.deleteDocument(doc)).toEqual(['a.pdf', 'b.pdf']);
    expect((await store.load()).documents).toEqual([]);
  });
});

describe('reset', () => {
  it('returns to first launch', async () => {
    await onboard();
    await store.saveStockItem({ name: 'Radio', type: 'radio', ...item });
    await store.savePolicy({ name: 'Innboforsikring', propertyId: 'id1', alertNearSum: true });
    const tv = await store.saveBelonging({ roomId: 'id2', name: 'TV', category: 'Elektronikk', valueEstimated: false });
    await store.setBelongingFile({ belongingId: tv, kind: 'photo', fileName: 'tv.jpg', mimeType: 'image/jpeg', size: 1 });
    const claimId = await store.saveClaim({ propertyId: 'id1', kind: 'theft', happenedOn: '2026-10-01', description: '' });
    const stolen = await store.saveClaimItem({ claimId, name: 'Sykkel', category: 'Sport og fritid', valueEstimated: false, damage: 'stolen' });
    await store.setClaimItemReceipt({ claimItemId: stolen, fileName: 'k.jpg', mimeType: 'image/jpeg', size: 1 });
    await store.reset();
    const data = await store.load();
    expect(data.onboarded).toBe(false);
    expect(data.stock).toEqual([]);
    expect(data.claims).toEqual([]);
  });
});
