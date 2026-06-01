/** Normalize workspace-relative paths (no leading slash, forward slashes). */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

export function joinPath(base: string, segment: string): string {
  const b = normalizePath(base);
  const s = normalizePath(segment);
  if (!b) return s;
  if (!s) return b;
  return `${b}/${s}`;
}
