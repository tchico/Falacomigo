// Opens the on-device database (expo-sqlite) and hands back a ready Store.
import { openDatabaseAsync } from 'expo-sqlite';
import { Store } from './store';

export async function openStore(): Promise<Store> {
  const db = await openDatabaseAsync('fala-comigo.db');
  await db.execAsync('PRAGMA journal_mode = WAL');
  const store = new Store(db);
  await store.init();
  return store;
}
