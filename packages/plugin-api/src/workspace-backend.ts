/** Low-level workspace storage contract for future HTTP/REST backends. */
export interface WorkspaceBackendClient {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  renamePath(oldPath: string, newPath: string): Promise<void>;
  /** All file paths relative to workspace root (no leading slash). */
  listFilePaths(): Promise<string[]>;
  /** Explicit empty directory paths relative to workspace root. */
  listDirectoryPaths?(): Promise<string[]>;
}

/**
 * REST shape (future):
 * - GET    /files?path=
 * - PUT    /files       { path, content }
 * - POST   /files       { path, isDirectory?, content? }
 * - DELETE /files/:path
 * - PATCH  /files/:path { newPath }
 */
export interface WorkspaceBackend {
  baseUrl: string;
  client: WorkspaceBackendClient;
}
