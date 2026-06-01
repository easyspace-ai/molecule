import type { WorkspaceFile } from '@easyspace/plugin-api';

import { normalizePath } from './path-utils.js';

/** Build a sorted file tree from file paths and explicit empty directories. */
export function buildWorkspaceTree(
  allPaths: string[],
  explicitDirs: Iterable<string> = [],
  prefix = ''
): WorkspaceFile[] {
  const dirs = new Set<string>();
  const entries: WorkspaceFile[] = [];

  for (const path of allPaths) {
    const rel = prefix ? path.slice(prefix.length + 1) : path;
    if (!rel || (prefix && !path.startsWith(prefix + '/'))) continue;
    const segment = rel.split('/')[0];
    if (!segment) continue;
    const full = prefix ? `${prefix}/${segment}` : segment;
    if (rel.includes('/')) {
      dirs.add(full);
    } else if (!prefix || path === full) {
      entries.push({ path: full, name: segment, isDirectory: false });
    }
  }

  for (const dirPath of explicitDirs) {
    const normalized = normalizePath(dirPath);
    if (!normalized) continue;
    if (prefix && !normalized.startsWith(prefix + '/')) continue;
    const rel = prefix ? normalized.slice(prefix.length + 1) : normalized;
    if (!rel) continue;
    const segment = rel.split('/')[0];
    if (!segment) continue;
    const full = prefix ? `${prefix}/${segment}` : segment;
    dirs.add(full);
  }

  for (const d of dirs) {
    entries.push({
      path: d,
      name: d.split('/').pop()!,
      isDirectory: true,
      children: buildWorkspaceTree(allPaths, explicitDirs, d),
    });
  }

  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
