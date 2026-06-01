import { createGitService, type GitService } from '@easyspace/git';
import type { Disposable, ScmAPI, ScmCommit, ScmFileChange, ScmRepository, WorkspaceAPI } from '@easyspace/plugin-api';

export interface ScmService extends ScmAPI {
  noteChange(path: string): void;
}

function mapStatus(status: string): ScmFileChange['status'] {
  if (status === 'staged') return 'added';
  if (status === 'modified' || status === 'added' || status === 'deleted' || status === 'untracked') {
    return status;
  }
  return 'modified';
}

export function createScmService(workspace: WorkspaceAPI, git?: GitService): ScmService {
  const gitService = git ?? createGitService({ workspace });
  let currentBranch = 'main';

  const refreshBranch = (): void => {
    void gitService.currentBranch().then((b) => {
      currentBranch = b;
    });
  };

  refreshBranch();
  gitService.onDidChange(refreshBranch);

  return {
    getRepositories(): ScmRepository[] {
      return [{ root: workspace.getRoot(), branch: currentBranch }];
    },

    async getStatus(): Promise<ScmFileChange[]> {
      const changes = await gitService.status();
      return changes.map((c) => ({ path: c.path, status: mapStatus(c.status) }));
    },

    async stage(path: string): Promise<void> {
      await gitService.add(path);
    },

    async unstage(path: string): Promise<void> {
      await gitService.resetIndex(path);
    },

    async commit(message: string): Promise<void> {
      await gitService.commit(message);
    },

    async log(limit?: number): Promise<ScmCommit[]> {
      return gitService.log(limit);
    },

    async listBranches(): Promise<string[]> {
      return gitService.listBranches();
    },

    async checkoutBranch(name: string): Promise<void> {
      await gitService.checkout(name);
    },

    onDidChange(handler: () => void): Disposable {
      return gitService.onDidChange(handler);
    },

    noteChange(path: string) {
      gitService.noteChange(path);
    },
  };
}
