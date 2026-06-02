import type { WorkspaceBackendClient } from '@easyspace/plugin-api';

function joinUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '');
  const encoded = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return encoded ? `${trimmed}/files/${encoded}` : `${trimmed}/files`;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface HttpWorkspaceClientOptions {
  baseUrl: string;
  /** Optional auth header value, e.g. `Bearer token` */
  authorization?: string;
  fetchImpl?: typeof fetch;
}

/** REST-backed workspace client (GET/PUT/DELETE/PATCH /files). */
export function createHttpWorkspaceClient(options: HttpWorkspaceClientOptions): WorkspaceBackendClient {
  const { baseUrl, authorization, fetchImpl = fetch } = options;

  const headers = (): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authorization) h.Authorization = authorization;
    return h;
  };

  return {
    async readFile(path) {
      const res = await fetchImpl(`${joinUrl(baseUrl, path)}`, { headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status} reading ${path}`);
      const data = (await res.json()) as { content?: string };
      return data.content ?? '';
    },

    async writeFile(path, content) {
      const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/files`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} writing ${path}`);
    },

    async deletePath(path) {
      const res = await fetchImpl(joinUrl(baseUrl, path), {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} deleting ${path}`);
    },

    async renamePath(oldPath, newPath) {
      const res = await fetchImpl(joinUrl(baseUrl, oldPath), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ newPath }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} renaming ${oldPath}`);
    },

    async listFilePaths() {
      const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/files`, { headers: headers() });
      const data = await readJson<{ paths?: string[] }>(res);
      return data.paths ?? [];
    },

    async listDirectoryPaths() {
      const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/directories`, {
        headers: headers(),
      });
      if (res.status === 404) return [];
      const data = await readJson<{ paths?: string[] }>(res);
      return data.paths ?? [];
    },
  };
}
