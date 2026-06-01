import type { WorkspaceAPI } from '@easyspace/plugin-api';

import {
  createIndexedDbWorkspaceCrud,
  idbGetAllKeys,
  idbPut,
} from './indexed-db-workspace-crud.js';
import { normalizePath } from './path-utils.js';
import { searchFilesInWorker, type SearchOptions } from './search.js';
import { getActiveWorkspaceRoot } from './workspace-roots.js';

const DB_NAME = 'molecule-workspace';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const META_STORE = 'meta';

export interface IndexedDbWorkspaceOptions {
  /** Logical project root key (stored in meta). */
  root?: string;
  /** Seed files when the store is empty on first open. */
  seed?: Record<string, string>;
  /** Search options (exclude globs, etc.). */
  searchOptions?: SearchOptions | (() => SearchOptions);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

function storageKey(rootKey: string, path: string): string {
  return `${rootKey}/${normalizePath(path)}`;
}

async function loadAllFiles(db: IDBDatabase, rootKey: string): Promise<Record<string, string>> {
  const keys = await idbGetAllKeys(db, FILES_STORE);
  const prefix = `${rootKey}/`;
  const files: Record<string, string> = {};
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const rel = key.slice(prefix.length);
    const tx = db.transaction(FILES_STORE, 'readonly');
    const content = await new Promise<string | undefined>((resolve, reject) => {
      const req = tx.objectStore(FILES_STORE).get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result as string | undefined);
    });
    if (content !== undefined) files[rel] = content;
  }
  return files;
}

export async function createIndexedDbWorkspace(
  options: IndexedDbWorkspaceOptions = {}
): Promise<WorkspaceAPI> {
  const db = await openDb();
  const activeRoot = await getActiveWorkspaceRoot();
  const rootKey = normalizePath(options.root ?? activeRoot) || activeRoot;

  const keys = await idbGetAllKeys(db, FILES_STORE);
  const hasFiles = keys.some((k) => k.startsWith(`${rootKey}/`));
  if (!hasFiles && options.seed) {
    for (const [path, content] of Object.entries(options.seed)) {
      await idbPut(db, FILES_STORE, storageKey(rootKey, path), content);
    }
  }

  let cachedPaths: string[] | null = null;
  const pathCache = { current: cachedPaths as string[] | null };

  const refreshPaths = async (): Promise<string[]> => {
    const allKeys = await idbGetAllKeys(db, FILES_STORE);
    cachedPaths = allKeys
      .filter((k) => k.startsWith(`${rootKey}/`))
      .map((k) => k.slice(rootKey.length + 1));
    pathCache.current = cachedPaths;
    return cachedPaths;
  };

  const invalidateCache = (): void => {
    cachedPaths = null;
    pathCache.current = null;
  };

  const getSearchOptions = (): SearchOptions => {
    if (typeof options.searchOptions === 'function') return options.searchOptions();
    return options.searchOptions ?? {};
  };

  const crud = createIndexedDbWorkspaceCrud({
    db,
    rootKey,
    storageKey: (path) => storageKey(rootKey, path),
    pathCache,
    refreshPaths,
    invalidateCache,
  });

  return {
    getRoot: () => `/${rootKey}`,

    readFile: crud.readFile,
    writeFile: crud.writeFile,
    createFile: crud.createFile,
    createDirectory: crud.createDirectory,
    deletePath: crud.deletePath,
    renamePath: crud.renamePath,
    listDirectory: crud.listDirectory,
    listFiles: crud.listFiles,

    async searchInFiles(query) {
      const files = await loadAllFiles(db, rootKey);
      return searchFilesInWorker(files, query, getSearchOptions());
    },
  };
}

/** Eagerly refresh listFiles cache after creation. */
export async function warmIndexedDbWorkspace(workspace: WorkspaceAPI): Promise<void> {
  await workspace.listDirectory('/');
}
