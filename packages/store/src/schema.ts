import type { SqlExecutor } from './sql';

/**
 * Each entry upgrades the schema by one version; `PRAGMA user_version` records how far a
 * database has come. Append new migrations, never edit one that has shipped.
 *
 * Every record table carries `updated_at` and a soft `deleted_at`, so a later sync to the
 * cloud can tell what changed and what was removed while offline.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE properties (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE rooms (
    id TEXT PRIMARY KEY NOT NULL,
    property_id TEXT NOT NULL REFERENCES properties(id),
    name TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE stock_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
      CHECK (category IN ('water', 'food', 'radio', 'heatAndLight', 'firstAid', 'hygieneAndCash')),
    litres REAL,
    person_days REAL,
    expires_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE contacts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    relation TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE policies (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    renews_on TEXT,
    sum_kr INTEGER,
    deductible_kr INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE quarterly_checks (
    id TEXT PRIMARY KEY NOT NULL,
    checked_on TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SqlExecutor): Promise<void> {
  await db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database is at version ${current}, newer than this app (${SCHEMA_VERSION})`);
  }
  for (let version = current; version < SCHEMA_VERSION; version++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[version]!);
      await db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
