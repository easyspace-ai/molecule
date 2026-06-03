export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'staged';

export interface GitFileChange {
  path: string;
  status: GitFileStatus;
}

export interface GitCommit {
  oid: string;
  message: string;
  author: string;
  timestamp: number;
}

export interface GitServiceOptions {
  workspace: import('@jiulimiai/plugin-api').WorkspaceAPI;
  /** Git root directory passed to isomorphic-git (default `/`). */
  dir?: string;
  author?: { name: string; email: string };
}

export interface GitService {
  init(): Promise<void>;
  status(): Promise<GitFileChange[]>;
  add(path: string): Promise<void>;
  resetIndex(path: string): Promise<void>;
  commit(message: string): Promise<string>;
  log(limit?: number): Promise<GitCommit[]>;
  listBranches(): Promise<string[]>;
  currentBranch(): Promise<string>;
  checkout(branch: string): Promise<void>;
  noteChange(path: string): void;
  onDidChange(handler: () => void): { dispose(): void };
}

export interface GitStat {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink?(): boolean;
  mode: number;
  size: number;
  mtimeMs: number;
  ctimeMs?: number;
  mtime?: Date;
  ctime?: Date;
}

/** isomorphic-git compatible filesystem (promise methods at top level). */
export interface GitFs {
  readFile(filepath: string, options?: { encoding?: string }): Promise<string | Uint8Array>;
  writeFile(filepath: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void>;
  mkdir(filepath: string, options?: { mode?: number }): Promise<void>;
  readdir(filepath: string): Promise<string[]>;
  stat(filepath: string): Promise<GitStat>;
  lstat(filepath: string): Promise<GitStat>;
  unlink(filepath: string): Promise<void>;
  rmdir(filepath: string): Promise<void>;
  readlink(filepath: string): Promise<string>;
  symlink(target: string, filepath: string): Promise<void>;
}
