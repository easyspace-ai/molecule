import { describe, expect, it, vi } from 'vitest';

import { createHttpWorkspaceClient } from './http-workspace-client.js';
import { createHttpWorkspace } from './http-workspace.js';

function mockFetch(handlers: Record<string, (init?: RequestInit) => Response | Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) throw new Error(`Unhandled fetch: ${url}`);
    return handlers[key]!(init);
  }) as typeof fetch;
}

describe('createHttpWorkspaceClient', () => {
  it('reads and writes files via REST', async () => {
    const store = new Map<string, string>([['README.md', '# Hello']]);
    const fetchImpl = mockFetch({
      '/files/README.md': (init) => {
        if (init?.method === 'DELETE') {
          store.delete('README.md');
          return new Response(null, { status: 204 });
        }
        return Response.json({ content: store.get('README.md') ?? '' });
      },
      '/files': (init) => {
        if (init?.method === 'PUT') {
          const body = JSON.parse(String(init.body)) as { path: string; content: string };
          store.set(body.path, body.content);
          return new Response(null, { status: 204 });
        }
        return Response.json({ paths: [...store.keys()] });
      },
      '/directories': () => Response.json({ paths: [] }),
    });

    const client = createHttpWorkspaceClient({ baseUrl: 'https://api.test/ws', fetchImpl });
    expect(await client.readFile('README.md')).toBe('# Hello');
    await client.writeFile('src/a.ts', 'export {}');
    expect(await client.listFilePaths()).toContain('src/a.ts');
  });
});

describe('createHttpWorkspace', () => {
  it('lists directory tree from remote paths', async () => {
    const fetchImpl = mockFetch({
      '/files': () =>
        Response.json({ paths: ['README.md', 'src/index.ts', 'src/util.ts'] }),
      '/directories': () => Response.json({ paths: ['src'] }),
    });
    const client = createHttpWorkspaceClient({ baseUrl: 'https://api.test/ws', fetchImpl });
    const ws = createHttpWorkspace({ client, root: 'demo' });

    expect(ws.getRoot()).toBe('/demo');
    const entries = await ws.listDirectory('/');
    expect(entries.some((e) => e.name === 'README.md')).toBe(true);
    expect(entries.some((e) => e.name === 'src' && e.isDirectory)).toBe(true);
  });
});
