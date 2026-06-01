import type { AIEditProposal, AIHostAPI, PluginModule } from '@easyspace/plugin-api';
import { useCallback, useRef, useState } from 'react';

function DiffPreview({
  edits,
  onAccept,
  onAcceptOne,
  onReject,
}: {
  edits: AIEditProposal[];
  onAccept: () => void;
  onAcceptOne: (edit: AIEditProposal) => void;
  onReject: () => void;
}) {
  return (
    <div
      data-testid="ai-diff-preview"
      style={{
        margin: 8,
        padding: 10,
        border: '1px solid var(--mo-border)',
        borderRadius: 6,
        background: 'var(--mo-bg-tertiary)',
        fontSize: 12,
      }}
    >
      <strong>
        Proposed edit{edits.length > 1 ? 's' : ''} ({edits.length} file{edits.length > 1 ? 's' : ''})
      </strong>
      {edits.map((edit) => (
        <div key={edit.path} data-testid={`ai-diff-file-${edit.path}`} style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code>{edit.path}</code>
            {edits.length > 1 ? (
              <button
                type="button"
                data-testid={`ai-diff-accept-file-${edit.path}`}
                onClick={() => onAcceptOne(edit)}
                style={{ marginLeft: 'auto', fontSize: 10, cursor: 'pointer' }}
              >
                Accept file
              </button>
            ) : null}
          </div>
          <pre
            style={{
              margin: '4px 0 0',
              maxHeight: 80,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: 11,
            }}
          >
            {edit.newText.slice(0, 300)}
            {edit.newText.length > 300 ? '…' : ''}
          </pre>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          data-testid="ai-diff-accept"
          onClick={onAccept}
          style={{
            padding: '6px 10px',
            background: 'var(--mo-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Accept all
        </button>
        <button
          type="button"
          data-testid="ai-diff-reject"
          onClick={onReject}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            color: 'inherit',
            border: '1px solid var(--mo-border)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ChatView({
  ai,
  sessionId,
  pendingEdits,
  onPendingEdits,
  onApplyEdit,
}: {
  ai: AIHostAPI;
  sessionId: string;
  pendingEdits: AIEditProposal[];
  onPendingEdits: (edits: AIEditProposal[]) => void;
  onApplyEdit: (edit: AIEditProposal) => Promise<void>;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setStreaming(true);
    abortRef.current = new AbortController();
    let assistant = '';
    setMessages((m) => [...m, { role: 'assistant', text: '' }]);

    try {
      for await (const chunk of ai.streamChat(sessionId, text, abortRef.current.signal)) {
        if (chunk.type === 'edit') {
          const incoming = chunk.edits ?? (chunk.edit ? [chunk.edit] : []);
          if (incoming.length) onPendingEdits(incoming);
        }
        if (chunk.type === 'text' && chunk.text) {
          assistant += chunk.text;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', text: assistant };
            return copy;
          });
        }
        if (chunk.type === 'tool-result' && chunk.text) {
          assistant += `\n[tool] ${chunk.text}`;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', text: assistant };
            return copy;
          });
        }
        if (chunk.type === 'error') {
          assistant += `\nError: ${chunk.error}`;
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [ai, sessionId, input, streaming, onPendingEdits]);

  return (
    <div
      data-testid="ai-chat"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}
    >
      {pendingEdits.length > 0 && (
        <DiffPreview
          edits={pendingEdits}
          onAccept={() => {
            void Promise.all(pendingEdits.map(onApplyEdit)).then(() => onPendingEdits([]));
          }}
          onAcceptOne={(edit) => {
            void onApplyEdit(edit).then(() =>
              onPendingEdits(pendingEdits.filter((e) => e.path !== edit.path))
            );
          }}
          onReject={() => onPendingEdits([])}
        />
      )}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: 'var(--mo-fg-muted)', margin: 8 }}>Ask anything about your workspace…</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '8px 10px',
              borderRadius: 6,
              background:
                msg.role === 'user' ? 'var(--mo-accent)' : 'var(--mo-bg-tertiary)',
              color: msg.role === 'user' ? '#fff' : 'inherit',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.text || (streaming && msg.role === 'assistant' ? '…' : '')}
          </div>
        ))}
      </div>
      <div style={{ padding: 8, borderTop: '1px solid var(--mo-border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
          placeholder="Message AI…"
          disabled={streaming}
          style={{
            flex: 1,
            padding: 8,
            border: '1px solid var(--mo-border)',
            borderRadius: 4,
            background: 'var(--mo-bg)',
            color: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={streaming}
          data-testid="ai-send"
          style={{
            padding: '8px 12px',
            background: 'var(--mo-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function AiChatPanel({
  ai,
  onApplyEdit,
}: {
  ai: AIHostAPI;
  onApplyEdit: (edit: AIEditProposal) => Promise<void>;
}) {
  const [pendingEdits, setPendingEdits] = useState<AIEditProposal[]>([]);
  return (
    <ChatView
      ai={ai}
      sessionId="default"
      pendingEdits={pendingEdits}
      onPendingEdits={setPendingEdits}
      onApplyEdit={onApplyEdit}
    />
  );
}

let aiApi: AIHostAPI | null = null;

function langFor(path: string): string {
  const ext = path.split('.').pop() ?? '';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'plaintext';
}

export const aiPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.ai',
    name: 'AI Assistant',
    version: '0.2.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'ai.chat', name: 'AI Chat', location: 'auxiliaryBar', icon: '✦' }],
      commands: [
        { id: 'ai.openChat', title: 'AI: Open Chat' },
        { id: 'ai.askSelection', title: 'AI: Ask About Selection' },
      ],
      aiProviders: [
        { id: 'mock', label: 'Mock Provider', protocol: 'custom' },
        { id: 'openai-compatible', label: 'OpenAI Compatible', protocol: 'openai-compatible' },
      ],
      aiTools: [
        {
          id: 'readActiveFile',
          name: 'readActiveFile',
          description: 'Read the currently active editor file',
        },
      ],
    },
  },
  activate(ctx) {
    if (!ctx.ai) {
      console.warn('plugin-ai: ai-host not loaded');
      return;
    }
    aiApi = ctx.ai;

    const applyEdit = async (edit: AIEditProposal) => {
      let content = edit.newText;
      try {
        const existing = await ctx.workspace.readFile(edit.path);
        if (edit.oldText && existing.includes(edit.oldText)) {
          content = existing.replace(edit.oldText, edit.newText);
        }
      } catch {
        /* new file */
      }
      await ctx.workspace.writeFile(edit.path, content);
      await ctx.editor.openDocument({
        uri: edit.path,
        languageId: langFor(edit.path),
        content,
      });
      ctx.workbench.showNotification(`Applied edit to ${edit.path}`, 'info');
    };

    ctx.workbench.registerView('auxiliaryBar', 'ai.chat', () => {
      if (!aiApi) return null;
      return <AiChatPanel ai={aiApi} onApplyEdit={applyEdit} />;
    });

    ctx.commands.registerCommand('ai.openChat', () => {
      ctx.workbench.setAuxiliaryBarVisible(true);
    });

    ctx.commands.registerCommand('ai.askSelection', async () => {
      const doc = ctx.editor.getActiveDocument();
      if (!doc) {
        ctx.workbench.showNotification('No active file', 'warn');
        return;
      }
      ctx.workbench.setAuxiliaryBarVisible(true);
      for await (const _ of ctx.ai!.streamChat(
        'default',
        `Explain this code:\n\`\`\`\n${doc.content.slice(0, 1500)}\n\`\`\``
      )) {
        /* stream handled in ChatView if mounted */
      }
    });

    ctx.workbench.setStatusBarItem({
      id: 'ai-status',
      text: 'AI Ready',
      alignment: 'right',
    });
  },
};

export default aiPlugin;
