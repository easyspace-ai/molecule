import type { WorkspaceBackendClient } from '@easyspace/plugin-api';

/** Stub for a future REST-backed workspace client. Not implemented in Phase 6. */
export function createHttpWorkspaceClient(_baseUrl: string): WorkspaceBackendClient {
  throw new Error(
    'createHttpWorkspaceClient is not implemented yet. Use createIndexedDbWorkspace for browser persistence.'
  );
}
