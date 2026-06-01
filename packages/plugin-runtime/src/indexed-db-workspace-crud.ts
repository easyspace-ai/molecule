import type { WorkspaceAPI } from '@easyspace/plugin-api';

import {
  assertValidRelativePath,
  collectPathsUnderPrefix,
  ensureParentDirs,
  renameExplicitDirs,
  renamePathPrefix,
} from './workspace-crud.js';
import { buildWorkspaceTree } from './workspace-tree.js';

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as T | undefined);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(store).put(value, key);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(store).delete(key);
  });
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
  });
}

function dirsMetaKey(rootKey: string): string {
  return `${rootKey}:dirs`;
}

export interface IndexedDbWorkspaceState {
  db: IDBDatabase;
  rootKey: string;
  storageKey: (path: string) => string;
  pathCache: { current: string[] | null };
  refreshPaths: () => Promise<string[]>;
  invalidateCache: () => void;
}

export async function getExplicitDirs(db: IDBDatabase, rootKey: string): Promise<Set<string>> {
  const raw = await idbGet<string[]>(db, 'meta', dirsMetaKey(rootKey));
  return new Set(raw ?? []);
}

async function saveExplicitDirs(
  db: IDBDatabase,
  rootKey: string,
  explicitDirs: Set<string>
): Promise<void> {
  await idbPut(db, 'meta', dirsMetaKey(rootKey), [...explicitDirs]);
}

export function createIndexedDbWorkspaceCrud(
  state: IndexedDbWorkspaceState
): Pick<
  WorkspaceAPI,
  'createFile' | 'createDirectory' | 'deletePath' | 'renamePath' | 'readFile' | 'writeFile' | 'listDirectory' | 'listFiles'
> {
  const { db, rootKey, storageKey, refreshPaths, invalidateCache, pathCache } = state;

  const relPaths = async (): Promise<string[]> =>
    pathCache.current ?? refreshPaths().then((paths) => {
      pathCache.current = paths;
      return paths;
    });

  return {
    async readFile(path) {
      const normalized = assertValidRelativePath(path);
      const content = await idbGet<string>(db, 'files', storageKey(normalized));
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },

    async writeFile(path, content) {
      const normalized = assertValidRelativePath(path);
      await idbPut(db, 'files', storageKey(normalized), content);
      const explicitDirs = await getExplicitDirs(db, rootKey);
      ensureParentDirs(explicitDirs, normalized);
      await saveExplicitDirs(db, rootKey, explicitDirs);
      invalidateCache();
    },

    async createFile(path, content = '') {
      const normalized = assertValidRelativePath(path);
      const key = storageKey(normalized);
      const existing = await idbGet<string>(db, 'files', key);
      if (existing !== undefined) throw new Error(`File already exists: ${path}`);
      await idbPut(db, 'files', key, content);
      const explicitDirs = await getExplicitDirs(db, rootKey);
      ensureParentDirs(explicitDirs, normalized);
      await saveExplicitDirs(db, rootKey, explicitDirs);
      invalidateCache();
    },

    async createDirectory(path) {
      const normalized = assertValidRelativePath(path);
      const existing = await idbGet<string>(db, 'files', storageKey(normalized));
      if (existing !== undefined) throw new Error(`Path already exists as file: ${path}`);
      const explicitDirs = await getExplicitDirs(db, rootKey);
      explicitDirs.add(normalized);
      ensureParentDirs(explicitDirs, normalized);
      await saveExplicitDirs(db, rootKey, explicitDirs);
      invalidateCache();
    },

    async deletePath(path) {
      const normalized = assertValidRelativePath(path);
      const allPaths = await relPaths();
      for (const filePath of collectPathsUnderPrefix(allPaths, normalized)) {
        await idbDelete(db, 'files', storageKey(filePath));
      }
      const explicitDirs = await getExplicitDirs(db, rootKey);
      for (const dirPath of collectPathsUnderPrefix(explicitDirs, normalized)) {
        explicitDirs.delete(dirPath);
      }
      explicitDirs.delete(normalized);
      await saveExplicitDirs(db, rootKey, explicitDirs);
      invalidateCache();
    },

    async renamePath(oldPath, newPath) {
      const oldNormalized = assertValidRelativePath(oldPath);
      const newNormalized = assertValidRelativePath(newPath);
      if (oldNormalized === newNormalized) return;

      const explicitDirs = await getExplicitDirs(db, rootKey);
      if (explicitDirs.has(newNormalized)) {
        throw new Error(`Path already exists: ${newPath}`);
      }
      const newFile = await idbGet<string>(db, 'files', storageKey(newNormalized));
      if (newFile !== undefined) throw new Error(`Path already exists: ${newPath}`);

      const allPaths = await relPaths();
      const fileEntries = collectPathsUnderPrefix(allPaths, oldNormalized)
        .sort((a, b) => b.length - a.length)
        .map((path) => [path, path] as const);

      for (const [path] of fileEntries) {
        const content = await idbGet<string>(db, 'files', storageKey(path));
        if (content === undefined) continue;
        await idbDelete(db, 'files', storageKey(path));
        await idbPut(
          db,
          'files',
          storageKey(renamePathPrefix(path, oldNormalized, newNormalized)),
          content
        );
      }

      const nextDirs = renameExplicitDirs(explicitDirs, oldNormalized, newNormalized);
      await saveExplicitDirs(db, rootKey, nextDirs);
      invalidateCache();
    },

    async listDirectory(path = '/') {
      const prefix =
        path === '/' || path === `/${rootKey}`
          ? ''
          : assertValidRelativePath(path.replace(/^\//, ''));
      const allPaths = await relPaths();
      const explicitDirs = await getExplicitDirs(db, rootKey);
      return buildWorkspaceTree(allPaths, explicitDirs, prefix);
    },

    listFiles() {
      if (pathCache.current) return [...pathCache.current];
      void refreshPaths();
      return [];
    },
  };
}

export { idbGet, idbPut, idbDelete, idbGetAllKeys };
