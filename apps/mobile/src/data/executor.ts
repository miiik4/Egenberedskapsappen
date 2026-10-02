import type { SqlExecutor } from '@egenberedskap/store';
import type { SQLiteDatabase } from 'expo-sqlite';

/** expo-sqlite behind the store's SQL interface. */
export function expoExecutor(db: SQLiteDatabase): SqlExecutor {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: (fn) => db.withTransactionAsync(fn),
  };
}
