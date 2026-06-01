import type { PluginModule, ScmAPI, ScmFileChange } from '@easyspace/plugin-api';
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
    <div data-testid="scm-view" style={{ padding: '8px 12px', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mo-fg-muted)', marginBottom: 8 }}>
        Branch: {branch}
      </div>

      {staged.length > 0 ? (
        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--mo-fg-muted)' }}>Staged</h4>
          <FileList files={staged} scm={scm} onRefresh={refresh} showStage={false} />
        </section>
      ) : null}

      <section style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--mo-fg-muted)' }}>Changes</h4>
        {unstaged.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--mo-fg-muted)' }}>No changed files.</p>
        ) : (
          <FileList files={unstaged} scm={scm} onRefresh={refresh} showStage />
        )}
      </section>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message"
        data-testid="scm-commit-message"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 12,
          padding: '6px 8px',
          marginBottom: 8,
          border: '1px solid var(--mo-border)',
          borderRadius: 4,
          background: 'var(--mo-bg)',
          color: 'inherit',
        }}
      />
      <button
        type="button"
        data-testid="scm-commit"
        onClick={() => void scm.commit(message || 'Commit').then(() => { setMessage(''); return refresh(); })}
        style={{ fontSize: 11, cursor: 'pointer' }}
      >
        Commit
      </button>

      {commits.length > 0 ? (
        <section style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--mo-fg-muted)' }}>Recent commits</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 11 }}>
            {commits.map((c) => (
              <li key={c.oid} style={{ padding: '2px 0', fontFamily: 'var(--mo-font-mono)' }}>
                <span style={{ color: 'var(--mo-accent)' }}>{c.oid}</span> {c.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p style={{ fontSize: 10, color: 'var(--mo-fg-muted)', marginTop: 8 }}>
        Powered by <code>@easyspace/git</code> (isomorphic-git).
      </p>
    </div>
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
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {files.map((file) => (
        <li
          key={file.path}
          style={{
            display: 'flex',
            gap: 8,
            padding: '4px 0',
            fontSize: 12,
            fontFamily: 'var(--mo-font-mono)',
          }}
        >
          <span style={{ width: 16, color: 'var(--mo-accent)' }}>{STATUS_LABEL[file.status]}</span>
          <span>{file.path}</span>
          {showStage && (file.status === 'modified' || file.status === 'untracked') ? (
            <button
              type="button"
              onClick={() => void scm.stage(file.path).then(onRefresh)}
              style={{ marginLeft: 'auto', fontSize: 10, cursor: 'pointer' }}
            >
              Stage
            </button>
          ) : null}
          {!showStage && scm.unstage ? (
            <button
              type="button"
              onClick={() => void scm.unstage!(file.path).then(onRefresh)}
              style={{ marginLeft: 'auto', fontSize: 10, cursor: 'pointer' }}
            >
              Unstage
            </button>
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
      views: [{ id: 'scm', name: 'Source Control', location: 'sidebar', icon: '⎇' }],
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
