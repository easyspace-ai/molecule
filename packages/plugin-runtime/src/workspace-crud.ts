import { normalizePath } from './path-utils.js';

export function assertValidRelativePath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized) throw new Error('Invalid path');
  if (normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new Error('Invalid path segment');
  }
  return normalized;
}

export function parentPath(path: string): string | undefined {
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  if (parts.length <= 1) return undefined;
  return parts.slice(0, -1).join('/');
}

export function ensureParentDirs(explicitDirs: Set<string>, path: string): void {
  let current = parentPath(path);
  while (current) {
    explicitDirs.add(current);
    current = parentPath(current);
  }
}

export function collectPathsUnderPrefix(paths: Iterable<string>, prefix: string): string[] {
  const normalized = assertValidRelativePath(prefix);
  const result: string[] = [];
  for (const path of paths) {
    if (path === normalized || path.startsWith(`${normalized}/`)) {
      result.push(path);
    }
  }
  return result;
}

export function renamePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(`${oldPrefix}/`)) {
    return `${newPrefix}${path.slice(oldPrefix.length)}`;
  }
  return path;
}

export function renameExplicitDirs(
  explicitDirs: Set<string>,
  oldPath: string,
  newPath: string
): Set<string> {
  const next = new Set<string>();
  for (const dir of explicitDirs) {
    next.add(renamePathPrefix(dir, oldPath, newPath));
  }
  return next;
}
