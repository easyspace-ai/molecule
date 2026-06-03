# @jiulimiai/git

Real Git operations for browser workspaces via [isomorphic-git](https://isomorphic-git.com/), bridged to `@jiulimiai/plugin-api` `WorkspaceAPI`.

## Usage (third-party host)

```typescript
import { createGitService } from '@jiulimiai/git';
import { createMemoryWorkspace } from '@jiulimiai/plugin-runtime';

const workspace = createMemoryWorkspace({ 'README.md': '# Hi' });
const git = createGitService({ workspace });

await git.init();
await git.add('README.md');
await git.commit('Initial commit');
const status = await git.status();
```

## API

- `createGitService({ workspace, dir?, author?, fs? })` — GitService
- `createWorkspaceGitFs(workspace)` — isomorphic-git FS adapter
- `createMemoryGitFs(initial)` — in-memory FS for tests

## ScmAPI integration

Use `@jiulimiai/plugin-runtime` `createScmService(workspace)` which wraps this package for the plugin facade.
