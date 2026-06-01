/** Normalize isomorphic-git paths (leading slash, no trailing slash). */
export function normalizeGitPath(filepath: string): string {
  if (filepath === '.' || filepath === '' || filepath === '/.') return '/';
  let p = filepath.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '/.' || p === '/..') return '/';
  return p;
}

export function toWorkspacePath(filepath: string): string {
  const p = normalizeGitPath(filepath);
  return p === '/' ? '' : p.slice(1);
}

export function fromWorkspacePath(path: string): string {
  if (!path || path === '/') return '/';
  return normalizeGitPath(`/${path.replace(/^\/+/, '')}`);
}
