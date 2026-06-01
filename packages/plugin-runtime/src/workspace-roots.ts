const DB_NAME = 'molecule-workspace';
const DB_VERSION = 1;
const META_STORE = 'meta';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as T | undefined);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(META_STORE).put(value, key);
  });
}

export async function getActiveWorkspaceRoot(): Promise<string> {
  const db = await openDb();
  const active = await idbGet<string>(db, 'activeRoot');
  if (active) return active;
  const legacy = await idbGet<string>(db, 'root');
  return legacy ?? 'project';
}

export async function listWorkspaceRoots(): Promise<string[]> {
  const db = await openDb();
  const roots = await idbGet<string[]>(db, 'roots');
  const active = await getActiveWorkspaceRoot();
  const set = new Set(roots ?? []);
  set.add(active);
  return [...set].sort();
}

export async function setActiveWorkspaceRoot(rootId: string): Promise<void> {
  const db = await openDb();
  const roots = await listWorkspaceRoots();
  if (!roots.includes(rootId)) {
    await idbPut(db, 'roots', [...roots, rootId]);
  }
  await idbPut(db, 'activeRoot', rootId);
  await idbPut(db, 'root', rootId);
}
