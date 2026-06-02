import type { WorkspaceAPI } from '@easyspace/plugin-api';
import type { SearchOptions } from '@easyspace/plugin-runtime';
import {
  createIndexedDbWorkspace,
  createMemoryWorkspace,
  getActiveWorkspaceRoot,
  listWorkspaceRoots,
  setActiveWorkspaceRoot,
  warmIndexedDbWorkspace,
} from '@easyspace/plugin-runtime';

import { SAMPLE_WORKSPACE } from './workspace.js';

export { getActiveWorkspaceRoot, listWorkspaceRoots };

export function useMemoryWorkspace(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_MOLECULE_MEMORY_WORKSPACE === '1') return true;
  return new URLSearchParams(window.location.search).has('memory');
}

export interface ReferenceWorkspaceOptions {
  searchOptions?: () => SearchOptions;
  seed?: Record<string, string>;
}

export async function createReferenceWorkspace(
  options: ReferenceWorkspaceOptions = {}
): Promise<WorkspaceAPI> {
  const seed = options.seed ?? SAMPLE_WORKSPACE;
  if (useMemoryWorkspace()) {
    return createMemoryWorkspace(seed, { searchOptions: options.searchOptions });
  }

  const root = await getActiveWorkspaceRoot();
  const workspace = await createIndexedDbWorkspace({
    root,
    seed,
    searchOptions: options.searchOptions,
  });
  await warmIndexedDbWorkspace(workspace);
  return workspace;
}

export async function switchWorkspaceRoot(
  rootId: string,
  opts: { create?: boolean } = {}
): Promise<void> {
  if (useMemoryWorkspace()) return;
  const normalized = rootId.replace(/^\/+/, '').trim() || 'project';
  const roots = await listWorkspaceRoots();
  if (!roots.includes(normalized) && opts.create) {
    const workspace = await createIndexedDbWorkspace({
      root: normalized,
      seed: SAMPLE_WORKSPACE,
    });
    await warmIndexedDbWorkspace(workspace);
  }
  await setActiveWorkspaceRoot(normalized);
}
