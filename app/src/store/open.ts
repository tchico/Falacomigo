// Opens the on-device database (expo-sqlite) and hands back a ready Store.
// The database can only be opened once at a time (in a browser, a second tab or a live reload would otherwise
// fail with "Access Handles cannot be created…"), so the open store is shared rather than opened again.
import { openDatabaseAsync } from 'expo-sqlite';
import { Store } from './store';

let opening: Promise<Store> | null = null;

export function openStore(): Promise<Store> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('fala-comigo.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const store = new Store(db);
    await store.init();
    return store;
  })().catch((e) => {
    // Let the next attempt try again, e.g. once the other tab is closed.
    opening = null;
    throw e;
  });
  return opening;
}
