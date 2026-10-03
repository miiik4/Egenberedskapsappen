import type { SqlExecutor, SqlValue } from './sql';

/**
 * One row as it travels between phones: what it is, when it last changed, and its fields.
 * The sync engine encrypts the fields; nothing here knows about the cloud.
 */
export type Change = {
  type: string;
  id: string;
  updatedAt: string;
  deleted: boolean;
  fields: Record<string, SqlValue>;
};

export type SyncedFile = { id: string; fileName: string; deleted: boolean; uploaded: boolean };

/**
 * What syncs, in the order a new phone must apply it: parents before the rows that point to
 * them (rooms need their property, files their document).
 */
const TABLES: Record<string, string[]> = {
  properties: ['name', 'short_name'],
  rooms: ['property_id', 'name', 'sort'],
  stock_items: ['name', 'category', 'litres', 'person_days', 'expires_on'],
  contacts: ['name', 'relation', 'phone'],
  policies: ['name', 'renews_on', 'sum_kr', 'deductible_kr'],
  quarterly_checks: ['checked_on', 'answers'],
  documents: ['name'],
  document_files: ['document_id', 'file_name', 'mime_type', 'size'],
};

/** Household settings follow the household. The rest (selected property, lock, sync state) belong to one phone. */
const SYNCED_SETTINGS = ['name', 'people', 'meetingPlaceName', 'meetingPlaceAddress', 'expiryReviewOn'];

export const SETTINGS_TYPE = 'settings';
export const SYNC_ORDER = [SETTINGS_TYPE, ...Object.keys(TABLES)];

type Row = Record<string, SqlValue> & { id: string; updated_at: string; deleted_at: string | null };

export function createSyncSource(db: SqlExecutor) {
  const placeholders = SYNCED_SETTINGS.map(() => '?').join(', ');

  return {
    /** Everything changed here since it was last uploaded. */
    async pending(): Promise<Change[]> {
      const changes: Change[] = [];
      const settings = await db.all<{ key: string; value: string; updated_at: string; deleted_at: string | null }>(
        `SELECT key, value, updated_at, deleted_at FROM settings
         WHERE key IN (${placeholders}) AND (pushed_at IS NULL OR updated_at > pushed_at)`,
        SYNCED_SETTINGS,
      );
      for (const s of settings) {
        changes.push({
          type: SETTINGS_TYPE,
          id: s.key,
          updatedAt: s.updated_at,
          deleted: s.deleted_at !== null,
          fields: { value: s.value },
        });
      }
      for (const [table, columns] of Object.entries(TABLES)) {
        const rows = await db.all<Row>(
          `SELECT id, updated_at, deleted_at, ${columns.join(', ')} FROM ${table}
           WHERE pushed_at IS NULL OR updated_at > pushed_at`,
        );
        for (const row of rows) {
          changes.push({
            type: table,
            id: row.id,
            updatedAt: row.updated_at,
            deleted: row.deleted_at !== null,
            fields: Object.fromEntries(columns.map((c) => [c, row[c] ?? null])),
          });
        }
      }
      return changes;
    },

    /** Uploaded. Only marks the version that went up: an edit made meanwhile stays pending. */
    async markPushed(change: Change) {
      if (change.type === SETTINGS_TYPE) {
        await db.run('UPDATE settings SET pushed_at = ? WHERE key = ? AND updated_at = ?', [
          change.updatedAt,
          change.id,
          change.updatedAt,
        ]);
      } else {
        await db.run(`UPDATE ${table(change.type)} SET pushed_at = ? WHERE id = ? AND updated_at = ?`, [
          change.updatedAt,
          change.id,
          change.updatedAt,
        ]);
      }
    },

    /**
     * A change from another phone. The newest version wins; an older one, or this phone's own
     * change coming back, is ignored. Returns whether anything changed here.
     */
    async apply(change: Change): Promise<boolean> {
      const deletedAt = change.deleted ? change.updatedAt : null;
      if (change.type === SETTINGS_TYPE) {
        if (!SYNCED_SETTINGS.includes(change.id)) return false;
        const local = await db.first<{ updated_at: string }>('SELECT updated_at FROM settings WHERE key = ?', [change.id]);
        if (local && local.updated_at >= change.updatedAt) return false;
        await db.run(
          `INSERT INTO settings (key, value, updated_at, deleted_at, pushed_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at, pushed_at = excluded.pushed_at`,
          [change.id, String(change.fields.value ?? ''), change.updatedAt, deletedAt, change.updatedAt],
        );
        return true;
      }

      const name = table(change.type);
      const columns = TABLES[name]!;
      const local = await db.first<{ updated_at: string }>(`SELECT updated_at FROM ${name} WHERE id = ?`, [change.id]);
      if (local && local.updated_at >= change.updatedAt) return false;
      const values = columns.map((c) => change.fields[c] ?? null);
      await db.run(
        `INSERT INTO ${name} (id, ${columns.join(', ')}, created_at, updated_at, deleted_at, pushed_at)
         VALUES (?, ${columns.map(() => '?').join(', ')}, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET ${columns.map((c) => `${c} = excluded.${c}`).join(', ')},
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, pushed_at = excluded.pushed_at`,
        [change.id, ...values, change.updatedAt, change.updatedAt, deletedAt, change.updatedAt],
      );
      return true;
    },

    /** Document files with their upload state, deleted ones included. */
    async files(): Promise<SyncedFile[]> {
      const rows = await db.all<{ id: string; file_name: string; deleted_at: string | null; uploaded_at: string | null }>(
        'SELECT id, file_name, deleted_at, uploaded_at FROM document_files',
      );
      return rows.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        deleted: r.deleted_at !== null,
        uploaded: r.uploaded_at !== null,
      }));
    },

    setUploaded: (id: string, uploadedAt: string | null) =>
      db.run('UPDATE document_files SET uploaded_at = ? WHERE id = ?', [uploadedAt, id]),

    /** Where the last download left off, by server time. Stays on this phone. */
    async cursor(): Promise<string | null> {
      return (await db.first<{ value: string }>("SELECT value FROM settings WHERE key = 'syncCursor'"))?.value ?? null;
    },
    setCursor: (cursor: string) =>
      db.run(
        `INSERT INTO settings (key, value, updated_at) VALUES ('syncCursor', ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [cursor, cursor],
      ),
  };
}

export type SyncSource = ReturnType<typeof createSyncSource>;

function table(type: string): string {
  if (!(type in TABLES)) throw new Error(`Not a synced type: ${type}`);
  return type;
}
