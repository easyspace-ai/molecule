import git from 'isomorphic-git';

import { createMemoryGitFs } from './memory-fs.js';
import { toWorkspacePath } from './path.js';
import { createWorkspaceGitFs } from './workspace-fs.js';
import type { GitCommit, GitFileChange, GitFs, GitService, GitServiceOptions } from './types.js';

const LEGACY_GIT_STATE = '.molecule/git.json';
const GIT_HEAD = '/.git/HEAD';

const DEFAULT_AUTHOR = { name: 'Molecule User', email: 'user@molecule.local' };

function matrixToStatus(
  filepath: string,
  head: number,
  workdir: number,
  stage: number
): GitFileChange['status'] | null {
  const path = toWorkspacePath(`/${filepath}`);
  if (!path || path.startsWith('.molecule/')) return null;

  if (head === 0 && workdir === 2 && stage === 0) return 'untracked';
  if (head === 0 && stage === 2) return 'staged';
  if (head === 1 && workdir === 2 && stage === 1) return 'modified';
  if (head === 1 && workdir === 1 && stage === 2) return 'staged';
  if (head === 1 && workdir === 2 && stage === 2) return 'staged';
  if (head === 1 && workdir === 0) return 'deleted';
  return null;
}

async function isGitRepo(fs: GitFs, dir: string): Promise<boolean> {
  const headPath = dir === '/' ? GIT_HEAD : `${dir.replace(/\/$/, '')}/.git/HEAD`;
  try {
    await fs.readFile(headPath, { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

async function migrateLegacySnapshot(
  fs: GitFs,
  dir: string,
  workspace: GitServiceOptions['workspace'],
  author: { name: string; email: string }
): Promise<void> {
  try {
    const raw = await workspace.readFile(LEGACY_GIT_STATE);
    const parsed = JSON.parse(raw) as { head?: Record<string, string> };
    if (parsed.head) {
      for (const [path, content] of Object.entries(parsed.head)) {
        if (path.startsWith('.molecule/') || path.startsWith('.git/')) continue;
        await fs.writeFile(`/${path}`, content);
      }
    }
    await git.add({ fs, dir, filepath: '.' });
    await git.commit({
      fs,
      dir,
      message: 'Migrate from .molecule/git.json snapshot',
      author,
    });
  } catch {
    /* no legacy state */
  }
}

export interface CreateGitServiceOptions extends GitServiceOptions {
  /** Inject FS (tests). Defaults to workspace-backed FS. */
  fs?: GitFs;
}

export function createGitService(options: CreateGitServiceOptions): GitService {
  const { workspace, dir = '/', author = DEFAULT_AUTHOR } = options;
  const fs = options.fs ?? createWorkspaceGitFs(workspace);
  const listeners = new Set<() => void>();
  const dirtyPaths = new Set<string>();
  let ready: Promise<void> | null = null;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const ensureReady = (): Promise<void> => {
    if (!ready) {
      ready = (async () => {
        if (!(await isGitRepo(fs, dir))) {
          await git.init({ fs, dir, defaultBranch: 'main' });
          await migrateLegacySnapshot(fs, dir, workspace, author);
          const paths = workspace.listFiles().filter((p) => !p.startsWith('.molecule/') && !p.startsWith('.git/'));
          if (paths.length > 0) {
            for (const path of paths) {
              try {
                await git.add({ fs, dir, filepath: path });
              } catch {
                /* skip missing */
              }
            }
            const hasChanges = await git.statusMatrix({ fs, dir });
            if (hasChanges.some((row) => row[2] === 2 || row[3] === 2)) {
              await git.commit({ fs, dir, message: 'Initial commit', author });
            }
          }
        }
      })();
    }
    return ready;
  };

  void ensureReady();

  return {
    async init() {
      await ensureReady();
      if (!(await isGitRepo(fs, dir))) {
        await git.init({ fs, dir, defaultBranch: 'main' });
        notify();
      }
    },

    async status() {
      await ensureReady();
      const matrix = await git.statusMatrix({ fs, dir });
      const changes: GitFileChange[] = [];
      for (const [filepath, head, workdir, stage] of matrix) {
        const status = matrixToStatus(filepath, head, workdir, stage);
        if (status) changes.push({ path: toWorkspacePath(`/${filepath}`), status });
      }
      for (const path of dirtyPaths) {
        if (!changes.some((c) => c.path === path)) {
          changes.push({ path, status: 'modified' });
        }
      }
      return changes.sort((a, b) => a.path.localeCompare(b.path));
    },

    async add(path: string) {
      await ensureReady();
      await git.add({ fs, dir, filepath: path });
      dirtyPaths.delete(path);
      notify();
    },

    async resetIndex(path: string) {
      await ensureReady();
      await git.resetIndex({ fs, dir, filepath: path });
      notify();
    },

    async commit(message: string) {
      await ensureReady();
      const oid = await git.commit({
        fs,
        dir,
        message: message || 'Commit',
        author,
      });
      dirtyPaths.clear();
      notify();
      return oid;
    },

    async log(limit = 20) {
      await ensureReady();
      const commits = await git.log({ fs, dir, depth: limit });
      return commits.map(
        (c): GitCommit => ({
          oid: c.oid,
          message: c.commit.message,
          author: c.commit.author.name,
          timestamp: c.commit.author.timestamp * 1000,
        })
      );
    },

    async listBranches() {
      await ensureReady();
      return git.listBranches({ fs, dir });
    },

    async currentBranch() {
      await ensureReady();
      const branch = await git.currentBranch({ fs, dir });
      return branch ?? 'main';
    },

    async checkout(branch: string) {
      await ensureReady();
      await git.checkout({ fs, dir, ref: branch });
      notify();
    },

    noteChange(path: string) {
      if (path.startsWith('.molecule/') || path.startsWith('.git/')) return;
      dirtyPaths.add(path);
      notify();
    },

    onDidChange(handler) {
      listeners.add(handler);
      return {
        dispose() {
          listeners.delete(handler);
        },
      };
    },
  };
}

export { createMemoryGitFs, createWorkspaceGitFs };
