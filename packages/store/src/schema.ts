import type { SqlExecutor } from './sql';

/**
 * Each entry upgrades the schema by one version; `PRAGMA user_version` records how far a
 * database has come. Append new migrations, never edit one that has shipped.
 *
 * Every record table carries `updated_at` and a soft `deleted_at`, so a later sync to the
 * cloud can tell what changed and what was removed while offline.
 *
 * A migration that adds a synced table or synced setting must also clear `syncCursor`: older
 * phones skip what they don't know, and the cursor has already moved past it.
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
  // 2: documents kept on the phone, each with one or more files (photos or PDFs).
  `
  CREATE TABLE documents (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE document_files (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL REFERENCES documents(id),
    -- Only the name: the app's folder moves between installs and updates on iOS, so the
    -- full path is worked out when the file is opened.
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  `,
  // 3: backup and sync. pushed_at records which version of a row has been uploaded, so a row
  // needs uploading whenever updated_at has moved past it. Settings become records like the
  // rest, with timestamps and soft deletes, and files remember when they were uploaded.
  `
  ALTER TABLE settings ADD COLUMN updated_at TEXT;
  ALTER TABLE settings ADD COLUMN deleted_at TEXT;
  UPDATE settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

  ALTER TABLE quarterly_checks ADD COLUMN updated_at TEXT;
  ALTER TABLE quarterly_checks ADD COLUMN deleted_at TEXT;
  UPDATE quarterly_checks SET updated_at = created_at;

  ALTER TABLE settings ADD COLUMN pushed_at TEXT;
  ALTER TABLE properties ADD COLUMN pushed_at TEXT;
  ALTER TABLE rooms ADD COLUMN pushed_at TEXT;
  ALTER TABLE stock_items ADD COLUMN pushed_at TEXT;
  ALTER TABLE contacts ADD COLUMN pushed_at TEXT;
  ALTER TABLE policies ADD COLUMN pushed_at TEXT;
  ALTER TABLE quarterly_checks ADD COLUMN pushed_at TEXT;
  ALTER TABLE documents ADD COLUMN pushed_at TEXT;
  ALTER TABLE document_files ADD COLUMN pushed_at TEXT;
  ALTER TABLE document_files ADD COLUMN uploaded_at TEXT;
  `,
  // 4: items get a type from DSB's list, which gives the category, so the category goes.
  // Food is counted in meals (three a day) rather than person-days. The table is rebuilt to
  // drop the old CHECK on category; type is checked by the store, so new types need no rebuild.
  // Rows are marked as not uploaded so the new shape reaches the backup. Policies belong to a
  // property, for the underinsurance warning.
  `
  CREATE TABLE stock_items_v4 (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    litres REAL,
    meals REAL,
    expires_on TEXT,
    bought_on TEXT,
    remind INTEGER NOT NULL DEFAULT 1,
    location TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT
  );
  INSERT INTO stock_items_v4 (id, name, type, litres, meals, expires_on, created_at, updated_at, deleted_at)
    SELECT id, name,
      CASE category
        WHEN 'water' THEN 'drinkingWater'
        WHEN 'food' THEN 'cannedMeals'
        WHEN 'radio' THEN 'radio'
        WHEN 'heatAndLight' THEN 'torch'
        WHEN 'firstAid' THEN 'firstAidKit'
        ELSE 'wetWipes'
      END,
      litres, person_days * 3, expires_on, created_at, updated_at, deleted_at
    FROM stock_items;
  DROP TABLE stock_items;
  ALTER TABLE stock_items_v4 RENAME TO stock_items;

  ALTER TABLE policies ADD COLUMN property_id TEXT REFERENCES properties(id);
  ALTER TABLE policies ADD COLUMN company TEXT;
  -- Null means on: rows from phones on an older version arrive without it.
  ALTER TABLE policies ADD COLUMN alert_near_sum INTEGER;
  ALTER TABLE policies ADD COLUMN alert_dismissed_kr INTEGER;
  `,
  // 5: belongings in each room, for the contents insurance, each with an optional photo and
  // receipt. Their files sync like document files: pushed_at for the row, uploaded_at for the
  // encrypted file itself.
  `
  CREATE TABLE belongings (
    id TEXT PRIMARY KEY NOT NULL,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    value_kr INTEGER,
    value_estimated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT
  );

  CREATE TABLE belonging_files (
    id TEXT PRIMARY KEY NOT NULL,
    belonging_id TEXT NOT NULL REFERENCES belongings(id),
    kind TEXT NOT NULL CHECK (kind IN ('photo', 'receipt')),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT,
    uploaded_at TEXT
  );

  -- A phone on an older version skipped these records while syncing; start the download over
  -- so it fetches them. Applying is idempotent, so pulling everything again is harmless.
  DELETE FROM settings WHERE key = 'syncCursor';
  `,
  // 6: AI analyses in progress. This phone's own work, never synced: the private key for the
  // job's encrypted answer, and the suggestions until the user has looked them over. Also the
  // owner's name and date of birth for the report, which are synced settings.
  `
  CREATE TABLE analyses (
    id TEXT PRIMARY KEY NOT NULL,
    room_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('photos', 'video')),
    status TEXT NOT NULL CHECK (status IN ('uploading', 'waiting', 'ready', 'failed')),
    secret_key TEXT NOT NULL,
    public_key TEXT NOT NULL,
    frame_count INTEGER NOT NULL,
    error TEXT,
    suggestions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- New synced settings (ownerName, ownerBirthDate), skipped by older phones: start over.
  DELETE FROM settings WHERE key = 'syncCursor';
  `,
  // 7: damage claims («Meld en skade»). Items are copies of belongings as they were, so a claim
  // still says what was lost after the belongings are edited or deleted; belonging_id and room_id
  // are no foreign keys for that reason. Files are photos of the damage, and receipts for things
  // that were never documented.
  `
  CREATE TABLE claims (
    id TEXT PRIMARY KEY NOT NULL,
    property_id TEXT REFERENCES properties(id),
    kind TEXT NOT NULL,
    happened_on TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    police_report TEXT,
    reported_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT
  );

  CREATE TABLE claim_items (
    id TEXT PRIMARY KEY NOT NULL,
    claim_id TEXT NOT NULL REFERENCES claims(id),
    belonging_id TEXT,
    room_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    value_kr INTEGER,
    value_estimated INTEGER NOT NULL DEFAULT 0,
    damage TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT
  );

  CREATE TABLE claim_files (
    id TEXT PRIMARY KEY NOT NULL,
    claim_id TEXT NOT NULL REFERENCES claims(id),
    claim_item_id TEXT REFERENCES claim_items(id),
    kind TEXT NOT NULL CHECK (kind IN ('photo', 'receipt')),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    pushed_at TEXT,
    uploaded_at TEXT
  );

  -- New synced tables, skipped by older phones: start over.
  DELETE FROM settings WHERE key = 'syncCursor';
  `,
  // 8: how often the beredskapssjekk comes round (checkIntervalMonths), a new synced setting.
  // Settings need no new column, but older phones skipped it: start over.
  `
  DELETE FROM settings WHERE key = 'syncCursor';
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Brings the schema up to date. `target` stops early, for testing upgrades from old versions. */
export async function migrate(db: SqlExecutor, target = SCHEMA_VERSION): Promise<void> {
  await db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database is at version ${current}, newer than this app (${SCHEMA_VERSION})`);
  }
  for (let version = current; version < target; version++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[version]!);
      await db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
