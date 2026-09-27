/// <reference types="node" />
// Test helper: Node's built-in SQLite behind the same SqlDb interface expo-sqlite provides.
import { DatabaseSync } from 'node:sqlite';
import type { SqlDb, SqlValue } from './db';

export function memoryDb(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params: SqlValue[]) {
      return db.prepare(source).run(...params);
    },
    async getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.prepare(source).all(...params).map((r) => ({ ...r })) as T[];
    },
    async getFirstAsync<T>(source: string, params: SqlValue[]) {
      const r = db.prepare(source).get(...params);
      return (r ? { ...r } : null) as T | null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
