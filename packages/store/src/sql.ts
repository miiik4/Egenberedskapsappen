export type SqlValue = string | number | null;

/**
 * The few things the store needs from a SQLite connection. The app backs it with
 * expo-sqlite; tests back it with Node's built-in `node:sqlite`, so the real SQL is tested.
 */
export interface SqlExecutor {
  /** Runs one or more statements without parameters. Never pass user input here. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /** Runs `fn` atomically: all of its writes land, or none do. */
  transaction(fn: () => Promise<void>): Promise<void>;
}
