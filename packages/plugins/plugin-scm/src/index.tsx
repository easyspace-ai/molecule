import type { PluginModule, ScmAPI, ScmFileChange } from '@easyspace/plugin-api';
import { Button, Input, ScrollArea } from '@easyspace/ui';
import { useCallback, useEffect, useState } from 'react';

const STATUS_LABEL: Record<ScmFileChange['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  untracked: 'U',
};

function SourceControlView({ scm }: { scm: ScmAPI }) {
  const [files, setFiles] = useState<ScmFileChange[]>([]);
  const [branch, setBranch] = useState('…');
  const [message, setMessage] = useState('');
  const [commits, setCommits] = useState<{ oid: string; message: string }[]>([]);

  const refresh = useCallback(async () => {
    setFiles(await scm.getStatus());
    setBranch(scm.getRepositories()[0]?.branch ?? 'main');
    if (scm.log) {
      const log = await scm.log(5);
      setCommits(log.map((c) => ({ oid: c.oid.slice(0, 7), message: c.message })));
    }
  }, [scm]);

  useEffect(() => {
    void refresh();
    const sub = scm.onDidChange(() => void refresh());
    return () => sub.dispose();
  }, [scm, refresh]);

  const staged = files.filter((f) => f.status === 'added');
  const unstaged = files.filter((f) => f.status !== 'added');

  return (
    <ScrollArea className="h-full">
      <div data-testid="scm-view" className="space-y-3 p-3 text-xs">
        <div className="text-muted-foreground">Branch: {branch}</div>

        {staged.length > 0 ? (
          <section>
            <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">Staged</h4>
            <FileList files={staged} scm={scm} onRefresh={refresh} showStage={false} />
          </section>
        ) : null}

        <section>
          <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">Changes</h4>
          {unstaged.length === 0 ? (
            <p className="text-muted-foreground">No changed files.</p>
          ) : (
            <FileList files={unstaged} scm={scm} onRefresh={refresh} showStage />
          )}
        </section>

        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message"
          data-testid="scm-commit-message"
        />
        <Button
          type="button"
          size="sm"
          data-testid="scm-commit"
          onClick={() => void scm.commit(message || 'Commit').then(() => { setMessage(''); return refresh(); })}
        >
          Commit
        </Button>

        {commits.length > 0 ? (
          <section>
            <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">Recent commits</h4>
            <ul className="space-y-0.5 font-mono text-[11px]">
              {commits.map((c) => (
                <li key={c.oid}>
                  <span className="text-accent">{c.oid}</span> {c.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-[10px] text-muted-foreground">
          Powered by <code>@easyspace/git</code> (isomorphic-git).
        </p>
      </div>
    </ScrollArea>
  );
}

function FileList({
  files,
  scm,
  onRefresh,
  showStage,
}: {
  files: ScmFileChange[];
  scm: ScmAPI;
  onRefresh: () => void;
  showStage: boolean;
}) {
  return (
    <ul className="space-y-1">
      {files.map((file) => (
        <li key={file.path} className="flex items-center gap-2 font-mono">
          <span className="w-4 text-accent">{STATUS_LABEL[file.status]}</span>
          <span className="min-w-0 flex-1 truncate">{file.path}</span>
          {showStage && (file.status === 'modified' || file.status === 'untracked') ? (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => void scm.stage(file.path).then(onRefresh)}>
              Stage
            </Button>
          ) : null}
          {!showStage && scm.unstage ? (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => void scm.unstage!(file.path).then(onRefresh)}>
              Unstage
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export const scmPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.scm',
    name: 'Source Control',
    version: '0.2.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'scm', name: 'Source Control', location: 'sidebar', icon: 'scm' }],
      commands: [{ id: 'scm.refresh', title: 'SCM: Refresh' }],
    },
  },
  activate(ctx) {
    const scm = ctx.scm;
    if (!scm) return;

    ctx.workbench.registerView('sidebar', 'scm', () => <SourceControlView scm={scm} />);

    ctx.commands.registerCommand('scm.refresh', async () => {
      ctx.workbench.showNotification('Source control refreshed', 'info');
    });

    const updateBranchStatus = () => {
      const branch = scm.getRepositories()[0]?.branch ?? 'main';
      ctx.workbench.setStatusBarItem({
        id: 'scm.branch',
        text: `$(git-branch) ${branch}`,
        alignment: 'left',
        priority: 20,
      });
    };

    updateBranchStatus();
    ctx.subscriptions.add(scm.onDidChange(updateBranchStatus));
  },
};

export default scmPlugin;
