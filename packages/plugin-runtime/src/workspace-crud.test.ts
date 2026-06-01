import { describe, expect, it } from 'vitest';

import { createMemoryWorkspace } from './host-context.js';

describe('createMemoryWorkspace CRUD', () => {
  it('creates files and directories', async () => {
    const ws = createMemoryWorkspace({ 'README.md': '# Hello' });
    await ws.createFile('src/index.ts', 'export {}');
    await ws.createDirectory('src/lib');

    const root = await ws.listDirectory('/');
    expect(root.some((f) => f.path === 'src' && f.isDirectory)).toBe(true);
    expect(root.some((f) => f.path === 'README.md')).toBe(true);

    const src = await ws.listDirectory('src');
    expect(src.some((f) => f.path === 'src/index.ts')).toBe(true);
    expect(src.some((f) => f.path === 'src/lib' && f.isDirectory)).toBe(true);
  });

  it('rejects duplicate file creation', async () => {
    const ws = createMemoryWorkspace({ 'a.txt': 'a' });
    await expect(ws.createFile('a.txt', 'b')).rejects.toThrow(/already exists/i);
  });

  it('deletes files and directory trees', async () => {
    const ws = createMemoryWorkspace({
      'src/a.ts': 'a',
      'src/nested/b.ts': 'b',
    });
    await ws.deletePath('src');
    expect(ws.listFiles()).toEqual([]);
    const root = await ws.listDirectory('/');
    expect(root).toEqual([]);
  });

  it('renames files and updates paths', async () => {
    const ws = createMemoryWorkspace({ 'old/name.ts': 'content' });
    await ws.renamePath('old', 'new');
    expect(ws.listFiles()).toEqual(['new/name.ts']);
    expect(await ws.readFile('new/name.ts')).toBe('content');
  });

  it('shows empty directories', async () => {
    const ws = createMemoryWorkspace({});
    await ws.createDirectory('empty/folder');
    const root = await ws.listDirectory('/');
    const empty = root.find((f) => f.path === 'empty');
    expect(empty?.isDirectory).toBe(true);
    const nested = empty?.children?.find((f) => f.path === 'empty/folder');
    expect(nested?.isDirectory).toBe(true);
  });
});

describe('buildWorkspaceTree ordering', () => {
  it('lists directories before files at the same level', async () => {
    const ws = createMemoryWorkspace({
      'z-file.txt': 'z',
      'a-dir/nested.ts': 'n',
    });
    await ws.createDirectory('empty-dir');
    const root = await ws.listDirectory('/');
    const names = root.map((f) => f.name);
    const dirIndex = names.indexOf('a-dir');
    const fileIndex = names.indexOf('z-file.txt');
    expect(dirIndex).toBeGreaterThanOrEqual(0);
    expect(fileIndex).toBeGreaterThanOrEqual(0);
    expect(dirIndex).toBeLessThan(fileIndex);
  });
});
