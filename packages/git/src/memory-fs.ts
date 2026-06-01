import { fromWorkspacePath, normalizeGitPath } from './path.js';
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

function isRootPath(filepath: string): boolean {
  return normalizeGitPath(filepath) === '/';
}

type FileEntry = string | Uint8Array;

/** In-memory FS for unit tests (no IndexedDB). */
export function createMemoryGitFs(initial: Record<string, string> = {}): { fs: GitFs } {
  const files = new Map<string, FileEntry>();
  for (const [path, content] of Object.entries(initial)) {
    files.set(fromWorkspacePath(path), content);
  }

  const fs: GitFs = {
    async readFile(filepath, options = {}) {
      if (filepath === undefined) return Promise.reject(enoent('ENOENT'));
      if (isRootPath(filepath)) return Promise.reject(enoent('EISDIR'));
      const key = normalizeGitPath(filepath);
      const content = files.get(key);
      if (content === undefined) throw enoent(`ENOENT: no such file or directory, open '${filepath}'`);
      if (options.encoding === 'utf8' || typeof options.encoding === 'string') {
        return typeof content === 'string' ? content : new TextDecoder().decode(content);
      }
      return typeof content === 'string' ? new TextEncoder().encode(content) : content;
    },

    async writeFile(filepath, data) {
      const key = normalizeGitPath(filepath);
      if (typeof data === 'string') {
        files.set(key, data);
      } else {
        files.set(key, data instanceof Uint8Array ? data : new Uint8Array(data));
      }
    },

    async mkdir(filepath) {
      void filepath;
    },

    async readdir(filepath) {
      const dir = normalizeGitPath(filepath);
      const prefix = dir === '/' ? '/' : `${dir}/`;
      const names = new Set<string>();
      for (const key of files.keys()) {
        if (dir !== '/' && !key.startsWith(prefix)) continue;
        const rest = dir === '/' ? key.slice(1) : key.slice(prefix.length);
        const name = rest.split('/')[0];
        if (name) names.add(name);
      }
      return [...names];
    },

    async stat(filepath) {
      if (isRootPath(filepath)) return makeStat(true);
      const key = normalizeGitPath(filepath);
      const content = files.get(key);
      if (content !== undefined) {
        const size = typeof content === 'string' ? content.length : content.byteLength;
        return makeStat(false, size);
      }
      const prefix = `${key}/`;
      if ([...files.keys()].some((k) => k.startsWith(prefix))) return makeStat(true);
      throw enoent(`ENOENT: no such file or directory, stat '${filepath}'`);
    },

    async lstat(filepath) {
      return fs.stat(filepath);
    },

    async unlink(filepath) {
      const key = normalizeGitPath(filepath);
      if (!files.delete(key)) throw enoent(`ENOENT: no such file or directory, unlink '${filepath}'`);
    },

    async rmdir(filepath) {
      const key = normalizeGitPath(filepath);
      const prefix = key === '/' ? '/' : `${key}/`;
      for (const k of [...files.keys()]) {
        if (k.startsWith(prefix)) files.delete(k);
      }
    },

    async readlink(filepath) {
      throw enoent(`EINVAL: invalid symlink read '${filepath}'`);
    },

    async symlink(_target, filepath) {
      void _target;
      void filepath;
    },
  };

  return { fs };
}

export async function createMemoryGitFsAsync(
  initial: Record<string, string> = {}
): Promise<{ fs: GitFs }> {
  return createMemoryGitFs(initial);
}
