// Dad's recordings in the browser (FR-26), for testing on a computer. The browser has no app documents folder,
// so takes are kept in IndexedDB and loaded into memory at start-up, which keeps recordingUri() synchronous.

const DB = 'fala-comigo-recordings';
const STORE = 'clips';
const urls = new Map<string, string>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function initRecordings(): Promise<void> {
  try {
    const keys = (await tx('readonly', (s) => s.getAllKeys())) as string[];
    for (const key of keys) {
      const blob = (await tx('readonly', (s) => s.get(key))) as Blob | undefined;
      if (blob) urls.set(key, URL.createObjectURL(blob));
    }
  } catch {
    // Private browsing or storage blocked: recordings just won't be kept.
  }
}

export const recordingUri = (key: string): string | null => urls.get(key) ?? null;

export const hasRecording = (key: string) => urls.has(key);

export async function saveRecording(key: string, fromUri: string): Promise<void> {
  const blob = await (await fetch(fromUri)).blob();
  await tx('readwrite', (s) => s.put(blob, key));
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.set(key, URL.createObjectURL(blob));
}

export async function deleteRecording(key: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(key));
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.delete(key);
}
