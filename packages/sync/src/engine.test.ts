import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import { createStore, createSyncSource, SYNC_ORDER, type SqlExecutor, type SqlValue } from '@egenberedskap/store';
import { beforeEach, describe, expect, it } from 'vitest';

import { fromUtf8, utf8 } from './encoding';
import { syncOnce, type LocalFiles, type RemoteRecord, type RemoteVault } from './engine';
import type { CryptoPrimitives } from './primitives';
import { createDataKey } from './vault';

const subtle = webcrypto.subtle;
const aes = (key: Uint8Array) => subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt', 'decrypt']);
const crypto: CryptoPrimitives = {
  randomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
  sha256: async (d) => new Uint8Array(await subtle.digest('SHA-256', d)),
  async seal(key, plaintext, aad) {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const body = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, await aes(key), plaintext));
    return new Uint8Array([...iv, ...body]);
  },
  async open(key, sealed, aad) {
    return new Uint8Array(
      await subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12), additionalData: aad }, await aes(key), sealed.slice(12)),
    );
  },
};

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
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

/** The cloud as the engine sees it: records ordered by server time, and opaque files. */
class FakeVault implements RemoteVault {
  records = new Map<string, RemoteRecord & { serverTime: string }>();
  files = new Map<string, Uint8Array>();
  private clock = 0;

  async push(records: RemoteRecord[]) {
    for (const r of records) {
      const serverTime = new Date(Date.UTC(2026, 0, 1) + ++this.clock).toISOString();
      this.records.set(`${r.type}_${r.id}`, { ...r, serverTime });
    }
  }
  async pull(since: string | null) {
    const records = [...this.records.values()]
      .filter((r) => since === null || r.serverTime > since)
      .sort((a, b) => a.serverTime.localeCompare(b.serverTime));
    return { records, cursor: records.at(-1)?.serverTime ?? since };
  }
  async uploadFile(name: string, sealed: Uint8Array) {
    this.files.set(name, sealed);
  }
  async downloadFile(name: string) {
    return this.files.get(name) ?? null;
  }
  async deleteFile(name: string) {
    this.files.delete(name);
  }
}

class MemoryFiles implements LocalFiles {
  map = new Map<string, Uint8Array>();
  exists = (n: string) => this.map.has(n);
  read = async (n: string) => this.map.get(n)!;
  write = async (n: string, b: Uint8Array) => void this.map.set(n, b);
  delete = (n: string) => void this.map.delete(n);
}

/** A phone: its own database and files, sharing the vault and the data key. */
async function phone(name: string, clockStart: number) {
  const db = new DatabaseSync(':memory:');
  let ids = 0;
  let t = clockStart;
  const store = createStore({
    db: nodeExecutor(db),
    newId: () => `${name}-${++ids}`,
    now: () => new Date(Date.UTC(2026, 9, 3) + (t += 1000)),
    today: () => '2026-10-03',
  });
  await store.migrate();
  return { store, source: createSyncSource(nodeExecutor(db)), files: new MemoryFiles(), db };
}

let vault: FakeVault;
let dataKey: Uint8Array;
let a: Awaited<ReturnType<typeof phone>>;
let b: Awaited<ReturnType<typeof phone>>;
const sync = (p: typeof a) =>
  syncOnce({ crypto, dataKey, source: p.source, remote: vault, files: p.files, order: SYNC_ORDER, now: () => '2026-10-03T00:00:00Z' });

beforeEach(async () => {
  vault = new FakeVault();
  dataKey = createDataKey(crypto);
  a = await phone('a', 0);
  // Phone B's clock runs later, so its edits are the newer ones.
  b = await phone('b', 500_000);
});

const two = { adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
const item = { quantity: 1, remind: true, location: '' };

describe('sync between two phones', () => {
  it('restores a whole household onto a new phone', async () => {
    await a.store.completeOnboarding({ members: { ...two, adults: 3, dogs: 1 }, items: [] });
    await a.store.saveStockItem({ name: 'Vann', type: 'drinkingWater', litres: 30, expiresOn: '2026-12-01', ...item });
    await a.store.saveContact({ name: 'Ola', relation: 'Partner', phone: '900' });
    await a.store.setMeetingPlace({ name: 'Skolegården', address: 'Storgata 40' });

    expect((await sync(a)).pushed).toBeGreaterThan(0);
    await sync(b);
    const restored = await b.store.load();
    expect(restored.household).toMatchObject({ adults: 3, dogs: 1 });
    expect(restored.properties.map((p) => p.name)).toEqual(['Hjemme']);
    expect(restored.rooms).toHaveLength(6);
    expect(restored.stock).toEqual([
      { id: 'a-8', name: 'Vann', type: 'drinkingWater', litres: 30, expiresOn: '2026-12-01', ...item },
    ]);
    expect(restored.contacts.map((c) => c.name)).toEqual(['Ola']);
    expect(restored.meetingPlace).toEqual({ name: 'Skolegården', address: 'Storgata 40' });
  });

  it('reads items from a phone or backup that still has categories and person-days', async () => {
    const legacy = {
      type: 'stock_items',
      id: 'old-1',
      updatedAt: '2026-10-01T10:00:00.000Z',
      deleted: false,
      fields: { name: 'Hermetikk', category: 'food', litres: null, person_days: 4, expires_on: null },
    };
    expect(await b.source.apply(legacy)).toBe(true);
    expect((await b.store.load()).stock).toEqual([{ id: 'old-1', name: 'Hermetikk', type: 'cannedMeals', meals: 12, ...item }]);
  });

  it('keeps phone-specific settings on the phone', async () => {
    await a.store.completeOnboarding({ members: two, items: [] });
    await a.store.setDocumentLock(false);
    await sync(a);
    await sync(b);
    const restored = await b.store.load();
    expect(restored.documentLock).toBe(true);
    expect(restored.onboarded).toBe(false);
  });

  it('sends only what changed, and nothing twice', async () => {
    await a.store.saveContact({ name: 'Ola', relation: '', phone: '900' });
    expect((await sync(a)).pushed).toBe(1);
    expect((await sync(a)).pushed).toBe(0);
    await a.store.saveContact({ id: 'a-1', name: 'Ola N.', relation: '', phone: '900' });
    expect((await sync(a)).pushed).toBe(1);
  });

  it('carries deletions across', async () => {
    const id = await a.store.saveStockItem({ name: 'Radio', type: 'radio', ...item });
    await sync(a);
    await sync(b);
    await b.store.deleteStockItem(id);
    await sync(b);
    await sync(a);
    expect((await a.store.load()).stock).toEqual([]);
  });

  it('lets the newest edit win when both phones change the same thing', async () => {
    const id = await a.store.saveContact({ name: 'Ola', relation: '', phone: '900' });
    await sync(a);
    await sync(b);
    await a.store.saveContact({ id, name: 'Ola fra A', relation: '', phone: '900' });
    await b.store.saveContact({ id, name: 'Ola fra B', relation: '', phone: '900' }); // later clock
    await sync(a);
    await sync(b);
    await sync(a);
    expect((await a.store.load()).contacts[0]!.name).toBe('Ola fra B');
    expect((await b.store.load()).contacts[0]!.name).toBe('Ola fra B');
  });

  it('never lets the cloud see content', async () => {
    await a.store.saveContact({ name: 'Ola Nordmann', relation: 'Partner', phone: '+47 900 00 000' });
    const doc = await a.store.saveDocument({ name: 'Pass' });
    await a.store.addDocumentFile({ documentId: doc, fileName: 'p.jpg', mimeType: 'image/jpeg', size: 4 });
    await a.files.write('p.jpg', utf8('PASSPORT-PIXELS'));
    await sync(a);

    const everything = JSON.stringify([...vault.records.values()]) + [...vault.files.values()].map(fromUtf8).join();
    for (const secret of ['Ola', '900 00 000', 'Pass', 'PASSPORT-PIXELS', 'image/jpeg']) {
      expect(everything).not.toContain(secret);
    }
  });

  it('moves document files across, encrypted, and removes them when deleted', async () => {
    const doc = await a.store.saveDocument({ name: 'Pass' });
    const file = await a.store.addDocumentFile({ documentId: doc, fileName: 'p.jpg', mimeType: 'image/jpeg', size: 4 });
    await a.files.write('p.jpg', utf8('PIXELS'));
    expect((await sync(a)).uploaded).toBe(1);
    expect(vault.files.has('p.jpg')).toBe(true);

    expect((await sync(b)).downloaded).toBe(1);
    expect(fromUtf8(await b.files.read('p.jpg'))).toBe('PIXELS');
    expect((await b.store.load()).documents[0]!.files.map((f) => f.fileName)).toEqual(['p.jpg']);

    await b.store.deleteDocumentFile(file);
    await sync(b);
    expect(vault.files.has('p.jpg')).toBe(false);
    await sync(a);
    expect(a.files.exists('p.jpg')).toBe(false);
  });

  it('fails loudly with the wrong key rather than storing garbage', async () => {
    await a.store.saveContact({ name: 'Ola', relation: '', phone: '900' });
    await sync(a);
    await expect(
      syncOnce({ crypto, dataKey: createDataKey(crypto), source: b.source, remote: vault, files: b.files, order: SYNC_ORDER }),
    ).rejects.toThrow('decrypt');
    expect((await b.store.load()).contacts).toEqual([]);
  });
});
