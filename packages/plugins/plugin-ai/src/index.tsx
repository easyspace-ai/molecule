import type { AIEditProposal, AIHostAPI, PluginModule } from '@easyspace/plugin-api';
import { Button, Input, ScrollArea, cn, Icon_Send } from '@easyspace/ui';
import { useCallback, useRef, useState } from 'react';

import { ChatMarkdown } from './chat-markdown.js';
import { ShikiDiffViewer } from './shiki-diff-viewer.js';
import { ToolCallCard, type ToolCallEntry } from './tool-call-card.js';

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
      className="m-2 rounded-md border border-border bg-foreground/5 p-2.5 text-xs"
    >
      <strong>
        Proposed edit{edits.length > 1 ? 's' : ''} ({edits.length} file{edits.length > 1 ? 's' : ''})
      </strong>
      {edits.map((edit) => (
        <div key={edit.path} data-testid={`ai-diff-file-${edit.path}`} className="mt-2">
          <div className="flex items-center gap-2">
            <code className="font-mono">{edit.path}</code>
            {edits.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-6 text-[10px]"
                data-testid={`ai-diff-accept-file-${edit.path}`}
                onClick={() => onAcceptOne(edit)}
              >
                Accept file
              </Button>
            ) : null}
          </div>
          <ShikiDiffViewer oldText={edit.oldText ?? ''} newText={edit.newText} className="mt-1" />
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" data-testid="ai-diff-accept" onClick={onAccept}>
          Accept all
        </Button>
        <Button type="button" variant="outline" size="sm" data-testid="ai-diff-reject" onClick={onReject}>
          Reject
        </Button>
      </div>
    </div>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  tools: ToolCallEntry[];
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text, tools: [] }]);
    setStreaming(true);
    abortRef.current = new AbortController();
    let assistant = '';
    let tools: ToolCallEntry[] = [];
    setMessages((m) => [...m, { role: 'assistant', text: '', tools: [] }]);

    const patchAssistant = (nextText: string, nextTools: ToolCallEntry[]) => {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', text: nextText, tools: nextTools };
        return copy;
      });
    };

    try {
      for await (const chunk of ai.streamChat(sessionId, text, abortRef.current.signal)) {
        if (chunk.type === 'edit') {
          const incoming = chunk.edits ?? (chunk.edit ? [chunk.edit] : []);
          if (incoming.length) onPendingEdits(incoming);
        }
        if (chunk.type === 'tool-call' && chunk.toolName) {
          tools = [...tools, { name: chunk.toolName, status: 'running' }];
          patchAssistant(assistant, tools);
        }
        if (chunk.type === 'tool-result' && chunk.toolName) {
          tools = tools.map((t) =>
            t.name === chunk.toolName
              ? { ...t, status: 'done' as const, result: chunk.text }
              : t
          );
          patchAssistant(assistant, tools);
        }
        if (chunk.type === 'text' && chunk.text) {
          assistant += chunk.text;
          patchAssistant(assistant, tools);
        }
        if (chunk.type === 'error') {
          assistant += `\nError: ${chunk.error}`;
          patchAssistant(assistant, tools);
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [ai, sessionId, input, streaming, onPendingEdits]);

  return (
    <div data-testid="ai-chat" className="flex h-full min-h-[300px] flex-col">
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
      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="m-2 text-sm text-muted-foreground">Ask anything about your workspace…</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[90%] rounded-md px-2.5 py-2 text-sm',
                msg.role === 'user'
                  ? 'ml-auto bg-accent text-background'
                  : 'bg-foreground/5 text-foreground'
              )}
            >
              {msg.role === 'assistant' && msg.tools.length > 0 ? (
                <div className="mb-2 space-y-1.5">
                  {msg.tools.map((tool) => (
                    <ToolCallCard key={tool.name} tool={tool} />
                  ))}
                </div>
              ) : null}
              {msg.role === 'assistant' ? (
                msg.text ? (
                  <ChatMarkdown source={msg.text} />
                ) : streaming ? (
                  <span className="text-muted-foreground">…</span>
                ) : null
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t border-border p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
          placeholder="Message AI…"
          disabled={streaming}
          className="flex-1"
        />
        <Button type="button" size="icon" onClick={() => void send()} disabled={streaming} data-testid="ai-send">
          <Icon_Send className="size-4" aria-hidden />
        </Button>
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
      views: [{ id: 'ai.chat', name: 'AI Chat', location: 'auxiliaryBar', icon: 'ai' }],
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
