// The small slice of a SQLite database the store needs. expo-sqlite's SQLiteDatabase fits it as is,
// and the tests wrap Node's built-in node:sqlite in it, so the same SQL is tested without a device.

export type SqlValue = string | number | null;

export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
