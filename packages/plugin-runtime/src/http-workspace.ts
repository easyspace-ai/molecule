import type { WorkspaceAPI, WorkspaceBackendClient } from '@jiulimiai/plugin-api';

import { normalizePath } from './path-utils.js';
import { buildWorkspaceTree } from './workspace-tree.js';
import { assertValidRelativePath, ensureParentDirs } from './workspace-crud.js';
import { searchFilesInWorker, type SearchOptions } from './search.js';

export interface HttpWorkspaceOptions {
  client: WorkspaceBackendClient;
  root?: string;
  searchOptions?: SearchOptions | (() => SearchOptions);
}

/** Adapts a WorkspaceBackendClient into WorkspaceAPI for embed hosts with remote FS. */
export function createHttpWorkspace(options: HttpWorkspaceOptions): WorkspaceAPI {
  const { client, root = 'project', searchOptions } = options;
  const explicitDirs = new Set<string>();
  let cachedPaths: string[] = [];

  const refreshPaths = async (): Promise<string[]> => {
    cachedPaths = (await client.listFilePaths()).map((p) => normalizePath(p));
    if (client.listDirectoryPaths) {
      explicitDirs.clear();
      for (const d of await client.listDirectoryPaths()) {
        explicitDirs.add(normalizePath(d));
      }
    }
    return cachedPaths;
  };

  const getSearchOptions = (): SearchOptions => {
    if (typeof searchOptions === 'function') return searchOptions();
    return searchOptions ?? {};
  };

  return {
    getRoot() {
      return `/${root}`;
    },

    async listDirectory(path = '/') {
      await refreshPaths();
      const prefix = path === '/' ? '' : assertValidRelativePath(path.replace(/^\//, ''));
      return buildWorkspaceTree(cachedPaths, explicitDirs, prefix);
    },

    listFiles() {
      return cachedPaths;
    },

    async readFile(path) {
      return client.readFile(assertValidRelativePath(path));
    },

    async writeFile(path, content) {
      await client.writeFile(assertValidRelativePath(path), content);
      cachedPaths = [];
    },

    async createFile(path, content = '') {
      const normalized = assertValidRelativePath(path);
      if (cachedPaths.includes(normalized)) throw new Error(`File already exists: ${path}`);
      await client.writeFile(normalized, content);
      cachedPaths = [];
    },

    async createDirectory(path) {
      const normalized = assertValidRelativePath(path);
      explicitDirs.add(normalized);
      ensureParentDirs(explicitDirs, normalized);
    },

    async deletePath(path) {
      await client.deletePath(assertValidRelativePath(path));
      cachedPaths = [];
    },

    async renamePath(oldPath, newPath) {
      await client.renamePath(
        assertValidRelativePath(oldPath),
        assertValidRelativePath(newPath)
      );
      cachedPaths = [];
    },

    async searchInFiles(query) {
      await refreshPaths();
      const files: Record<string, string> = {};
      for (const p of cachedPaths) {
        try {
          files[p] = await client.readFile(p);
        } catch {
          /* skip */
        }
      }
      return searchFilesInWorker(files, query, getSearchOptions());
    },
  };
}
