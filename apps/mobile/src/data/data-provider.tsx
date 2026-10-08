import { createStore, createSyncSource, type AppData, type Store, type SyncSource } from '@egenberedskap/store';
import { randomUUID } from 'expo-crypto';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { Component, createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
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
    <LoadFailedBoundary>
      <SQLiteProvider databaseName={DATABASE} onInit={migrateOnOpen} onError={failToOpen}>
        <Loaded>{children}</Loaded>
      </SQLiteProvider>
    </LoadFailedBoundary>
  );
}

/** The database couldn't be opened, migrated or read: the app has nothing to show. */
class LoadFailed extends Error {
  constructor(cause: unknown) {
    super('Could not open the data', { cause });
  }
}

function failToOpen(error: Error): never {
  throw new LoadFailed(error);
}

/**
 * Shows a message instead of a blank screen when the data can't be loaded. Any other error
 * is passed on up, so it isn't mistaken for this one.
 */
class LoadFailedBoundary extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    if (error instanceof LoadFailed) console.error(error, error.cause);
  }

  render() {
    const { error } = this.state;
    if (error === undefined) return this.props.children;
    if (!(error instanceof LoadFailed)) throw error;
    return (
      <View style={styles.failed}>
        <Text style={styles.title}>Kunne ikke åpne dataene</Text>
        <Text style={styles.message}>
          Lukk appen helt og åpne den igjen. Ved en nødsituasjon: ring 110, 112 eller 113.
        </Text>
      </View>
    );
  }
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
  const [loadError, setLoadError] = useState<unknown>();

  const reload = useCallback(async () => setData(await store.load()), [store]);

  useEffect(() => {
    let live = true;
    store.load().then(
      (loaded) => live && setData(loaded),
      // A hot reload can close the database under an in-flight load; only report real failures.
      (error) => live && setLoadError(error),
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

  if (loadError !== undefined) throw new LoadFailed(loadError);
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

const styles = StyleSheet.create({
  failed: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.screen + 4,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: Colors.label },
  message: { fontSize: 17, lineHeight: 23, textAlign: 'center', color: Colors.secondaryLabel },
});
