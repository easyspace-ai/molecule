import type { WorkspaceAPI } from '@easyspace/plugin-api';

import { normalizeGitPath, toWorkspacePath } from './path.js';
import type { GitFs, GitStat } from './types.js';

function makeStat(isDir: boolean, size = 0): GitStat {
  const now = Date.now();
  return {
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
    mode: isDir ? 0o40755 : 0o100644,
    size,
    mtimeMs: now,
    ctimeMs: now,
    mtime: new Date(now),
    ctime: new Date(now),
  };
}

function enoent(message: string): NodeJS.ErrnoException {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

/** Bridge WorkspaceAPI to an isomorphic-git compatible filesystem. */
export function createWorkspaceGitFs(workspace: WorkspaceAPI): GitFs {
  let cachedPaths: string[] | null = null;

  const refreshPaths = async (): Promise<string[]> => {
    await workspace.listDirectory('/');
    cachedPaths = workspace.listFiles().filter((p) => !p.startsWith('.molecule/'));
    return cachedPaths;
  };

  const getPaths = async (): Promise<string[]> => cachedPaths ?? refreshPaths();

  const hasFile = async (wsPath: string): Promise<boolean> => {
    try {
      await workspace.readFile(wsPath);
      return true;
    } catch {
      return false;
    }
  };

  return {
    async readFile(filepath, options = {}) {
      if (filepath === undefined) return Promise.reject(enoent('ENOENT'));
      const wsPath = toWorkspacePath(filepath);
      const content = await workspace.readFile(wsPath);
      if (options.encoding === 'utf8' || typeof options.encoding === 'string') return content;
      const bytes = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) bytes[i] = content.charCodeAt(i) & 0xff;
      return bytes;
    },

    async writeFile(filepath, data) {
      const wsPath = toWorkspacePath(filepath);
      if (typeof data === 'string') {
        await workspace.writeFile(wsPath, data);
      } else {
        await workspace.writeFile(wsPath, new TextDecoder('latin1').decode(data));
      }
      cachedPaths = null;
    },

    async mkdir(filepath) {
      void filepath;
    },

    async readdir(filepath) {
      const dirPath = toWorkspacePath(filepath);
      const paths = await getPaths();
      const prefix = dirPath ? `${dirPath}/` : '';
      const names = new Set<string>();
      for (const p of paths) {
        if (prefix && !p.startsWith(prefix)) continue;
        const rest = prefix ? p.slice(prefix.length) : p;
        const name = rest.split('/')[0];
        if (name) names.add(name);
      }
      return [...names];
    },

    async stat(filepath) {
      if (filepath === '.' || filepath === '/.' || filepath === '/' || filepath === '') {
        return makeStat(true);
      }
      const wsPath = toWorkspacePath(filepath);
      if (await hasFile(wsPath)) {
        const content = await workspace.readFile(wsPath);
        return makeStat(false, content.length);
      }
      const paths = await getPaths();
      const prefix = wsPath ? `${wsPath}/` : '';
      if (paths.some((p) => p.startsWith(prefix))) return makeStat(true);
      throw enoent(`ENOENT: no such file or directory, stat '${filepath}'`);
    },

    async lstat(filepath) {
      return this.stat(filepath);
    },

    async unlink(filepath) {
      const wsPath = toWorkspacePath(filepath);
      await workspace.writeFile(wsPath, '');
      cachedPaths = null;
    },

    async rmdir(filepath) {
      void filepath;
    },

    async readlink(filepath) {
      throw enoent(`EINVAL: invalid symlink read '${filepath}'`);
    },

    async symlink(_target, filepath) {
      void _target;
      void filepath;
    },
  };
}

export { normalizeGitPath, toWorkspacePath };
