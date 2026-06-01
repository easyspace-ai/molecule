import type { WorkspaceAPI } from '@easyspace/plugin-api';

import {
  assertValidRelativePath,
  collectPathsUnderPrefix,
  ensureParentDirs,
  renameExplicitDirs,
  renamePathPrefix,
} from './workspace-crud.js';
import { buildWorkspaceTree } from './workspace-tree.js';

export interface MemoryWorkspaceStore {
  files: Map<string, string>;
  explicitDirs: Set<string>;
}

export function createMemoryWorkspaceStore(
  files: Record<string, string> = {}
): MemoryWorkspaceStore {
  return {
    files: new Map(Object.entries(files)),
    explicitDirs: new Set<string>(),
  };
}

export function createMemoryWorkspaceCrud(store: MemoryWorkspaceStore): Pick<
  WorkspaceAPI,
  'createFile' | 'createDirectory' | 'deletePath' | 'renamePath' | 'readFile' | 'writeFile' | 'listDirectory' | 'listFiles'
> {
  const { files, explicitDirs } = store;

  const listAllPaths = (): string[] => [...files.keys()];

  return {
    async readFile(path) {
      const normalized = assertValidRelativePath(path);
      const content = files.get(normalized);
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },

    async writeFile(path, content) {
      const normalized = assertValidRelativePath(path);
      files.set(normalized, content);
      ensureParentDirs(explicitDirs, normalized);
    },

    async createFile(path, content = '') {
      const normalized = assertValidRelativePath(path);
      if (files.has(normalized)) throw new Error(`File already exists: ${path}`);
      files.set(normalized, content);
      ensureParentDirs(explicitDirs, normalized);
    },

    async createDirectory(path) {
      const normalized = assertValidRelativePath(path);
      if (files.has(normalized)) throw new Error(`Path already exists as file: ${path}`);
      explicitDirs.add(normalized);
      ensureParentDirs(explicitDirs, normalized);
    },

    async deletePath(path) {
      const normalized = assertValidRelativePath(path);
      for (const filePath of collectPathsUnderPrefix(files.keys(), normalized)) {
        files.delete(filePath);
      }
      for (const dirPath of collectPathsUnderPrefix(explicitDirs, normalized)) {
        explicitDirs.delete(dirPath);
      }
      explicitDirs.delete(normalized);
    },

    async renamePath(oldPath, newPath) {
      const oldNormalized = assertValidRelativePath(oldPath);
      const newNormalized = assertValidRelativePath(newPath);
      if (oldNormalized === newNormalized) return;
      if (files.has(newNormalized) || explicitDirs.has(newNormalized)) {
        throw new Error(`Path already exists: ${newPath}`);
      }

      const fileEntries = collectPathsUnderPrefix(files.keys(), oldNormalized)
        .sort((a, b) => b.length - a.length)
        .map((path) => [path, files.get(path)!] as const);
      for (const [path] of fileEntries) {
        files.delete(path);
      }
      for (const [path, content] of fileEntries) {
        files.set(renamePathPrefix(path, oldNormalized, newNormalized), content);
      }

      const nextDirs = renameExplicitDirs(explicitDirs, oldNormalized, newNormalized);
      explicitDirs.clear();
      for (const dir of nextDirs) explicitDirs.add(dir);
    },

    async listDirectory(path = '/') {
      const prefix = path === '/' ? '' : assertValidRelativePath(path.replace(/^\//, ''));
      return buildWorkspaceTree(listAllPaths(), explicitDirs, prefix);
    },

    listFiles() {
      return listAllPaths();
    },
  };
}
