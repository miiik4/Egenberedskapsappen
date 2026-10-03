import { createStore, createSyncSource, type AppData, type Store, type SyncSource } from '@egenberedskap/store';
import { randomUUID } from 'expo-crypto';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { todayIso } from '@/lib/format';

import { expoExecutor } from './executor';

const DATABASE = 'egenberedskap.db';

/** Store writes, each followed by a reload so every screen sees the change. */
type Actions = Omit<Store, 'load' | 'migrate'>;

const DataContext = createContext<AppData | null>(null);
const ActionsContext = createContext<Actions | null>(null);
/** For sync, which writes to the database directly and then asks for a reload. */
const SyncContext = createContext<{ source: SyncSource; reload: () => Promise<void> } | null>(null);

/**
 * Opens the on-device database, brings its schema up to date, and keeps the whole app's
 * data in memory. Children render only once the first load is done.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE} onInit={migrateOnOpen}>
      <Loaded>{children}</Loaded>
    </SQLiteProvider>
  );
}

async function migrateOnOpen(db: SQLiteDatabase) {
  await storeFor(db).migrate();
}

function storeFor(db: SQLiteDatabase) {
  return createStore({ db: expoExecutor(db), newId: randomUUID, now: () => new Date(), today: () => todayIso() });
}

function Loaded({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const store = useMemo(() => storeFor(db), [db]);
  const source = useMemo(() => createSyncSource(expoExecutor(db)), [db]);
  const [data, setData] = useState<AppData | null>(null);

  const reload = useCallback(async () => setData(await store.load()), [store]);

  useEffect(() => {
    let live = true;
    store.load().then(
      (loaded) => live && setData(loaded),
      // A hot reload can close the database under an in-flight load; only report real failures.
      (error) => live && console.error('Could not load data', error),
    );
    return () => {
      live = false;
    };
  }, [store]);

  const actions = useMemo(() => {
    const { load: _load, migrate: _migrate, ...writes } = store;
    return Object.fromEntries(
      Object.entries(writes).map(([name, write]) => [
        name,
        async (...args: unknown[]) => {
          const result = await (write as (...a: unknown[]) => Promise<unknown>)(...args);
          await reload();
          return result;
        },
      ]),
    ) as Actions;
  }, [store, reload]);

  const sync = useMemo(() => ({ source, reload }), [source, reload]);

  if (!data) return null;
  return (
    <SyncContext value={sync}>
      <ActionsContext value={actions}>
        <DataContext value={data}>{children}</DataContext>
      </ActionsContext>
    </SyncContext>
  );
}

export function useData(): AppData {
  const data = use(DataContext);
  if (!data) throw new Error('useData must be used inside <DataProvider>');
  return data;
}

export function useSyncSource() {
  const value = use(SyncContext);
  if (!value) throw new Error('useSyncSource must be used inside <DataProvider>');
  return value;
}

export function useActions(): Actions {
  const actions = use(ActionsContext);
  if (!actions) throw new Error('useActions must be used inside <DataProvider>');
  return actions;
}
