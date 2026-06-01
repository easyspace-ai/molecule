import { describe, expect, it } from 'vitest';

import { createGitService } from './git-service.js';
import { createMemoryGitFsAsync } from './memory-fs.js';

describe('createGitService', () => {
  it('initializes repo and tracks commit', async () => {
    const { fs } = await createMemoryGitFsAsync({ 'README.md': '# Hello' });
    const git = createGitService({
      workspace: {
        getRoot: () => '/test',
        readFile: async (path) => {
          const content = await fs.readFile(`/${path}`, { encoding: 'utf8' });
          return String(content);
        },
        writeFile: async (path, content) => {
          await fs.writeFile(`/${path}`, content);
        },
        listDirectory: async () => [],
        listFiles: () => ['README.md'],
        searchInFiles: async () => [],
      },
      fs,
    });

    await git.init();
    await fs.writeFile('/README.md', '# Hello Updated');
    const before = await git.status();
    expect(before.some((f) => f.path === 'README.md')).toBe(true);

    await git.add('README.md');
    const oid = await git.commit('First commit');
    expect(oid).toBeTruthy();

    const log = await git.log();
    expect(log[0]?.message.trim()).toBe('First commit');
    expect(await git.currentBranch()).toBe('main');
  });

  it('lists branches and checks out', async () => {
    const { fs } = await createMemoryGitFsAsync({ 'a.txt': 'a' });
    const git = createGitService({
      workspace: {
        getRoot: () => '/test',
        readFile: async (path) => String(await fs.readFile(`/${path}`, { encoding: 'utf8' })),
        writeFile: async (path, content) => fs.writeFile(`/${path}`, content),
        listDirectory: async () => [],
        listFiles: () => ['a.txt'],
        searchInFiles: async () => [],
      },
      fs,
    });

    await git.init();
    await git.add('a.txt');
    await git.commit('init');
    await fs.writeFile('/a.txt', 'branch-edit');
    await git.checkout('main');
    const branches = await git.listBranches();
    expect(branches).toContain('main');
  });
});
