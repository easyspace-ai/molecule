import type {
  AIHostAPI,
  AIProvider,
  AIStreamChunk,
  AIToolHandler,
  Disposable,
} from '@easyspace/plugin-api';

export interface ChatSession {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export interface ToolPermissionRequest {
  toolId: string;
  args: Record<string, unknown>;
  approve: () => void;
  deny: () => void;
}

export type ToolPermissionHandler = (req: ToolPermissionRequest) => void;

export class AIHost implements AIHostAPI {
  private providers = new Map<string, AIProvider>();
  private tools = new Map<string, AIToolHandler>();
  private contextSources = new Map<string, () => Promise<Record<string, unknown>>>();
  private sessions = new Map<string, ChatSession>();
  private defaultProviderId: string | null = null;
  private permissionHandler: ToolPermissionHandler = (req) => req.approve();

  constructor(private readonly autoApproveTools = false) {}

  setPermissionHandler(handler: ToolPermissionHandler): void {
    this.permissionHandler = handler;
  }

  registerProvider(provider: AIProvider): Disposable {
    this.providers.set(provider.id, provider);
    if (!this.defaultProviderId) this.defaultProviderId = provider.id;
    return {
      dispose: () => {
        this.providers.delete(provider.id);
        if (this.defaultProviderId === provider.id) {
          this.defaultProviderId = this.providers.keys().next().value ?? null;
        }
      },
    };
  }

  registerTool(id: string, handler: AIToolHandler): Disposable {
    this.tools.set(id, handler);
    return { dispose: () => this.tools.delete(id) };
  }

  registerContextSource(
    id: string,
    getContext: () => Promise<Record<string, unknown>>
  ): Disposable {
    this.contextSources.set(id, getContext);
    return { dispose: () => this.contextSources.delete(id) };
  }

  getSessions(): { id: string; title: string }[] {
    return [...this.sessions.values()].map((s) => ({ id: s.id, title: s.title }));
  }

  private getOrCreateSession(sessionId: string): ChatSession {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { id: sessionId, title: 'New Chat', messages: [] };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  private async buildPrompt(userPrompt: string): Promise<string> {
    const contexts: Record<string, unknown>[] = [];
    for (const source of this.contextSources.values()) {
      contexts.push(await source());
    }
    const contextBlock =
      contexts.length > 0
        ? `\n\nContext:\n${JSON.stringify(contexts, null, 2)}`
        : '';
    return `${userPrompt}${contextBlock}`;
  }

  async *streamChat(
    sessionId: string,
    prompt: string,
    signal?: AbortSignal
  ): AsyncIterable<AIStreamChunk> {
    const providerId = this.defaultProviderId;
    if (!providerId) {
      yield { type: 'error', error: 'No AI provider registered' };
      return;
    }
    const provider = this.providers.get(providerId)!;
    const session = this.getOrCreateSession(sessionId);
    session.messages.push({ role: 'user', content: prompt });
    if (session.title === 'New Chat') {
      session.title = prompt.slice(0, 40);
    }

    const fullPrompt = await this.buildPrompt(prompt);
    let assistantText = '';

    for await (const chunk of provider.streamText(fullPrompt, { signal })) {
      if (chunk.type === 'text' && chunk.text) {
        assistantText += chunk.text;
      }
      if (chunk.type === 'edit') {
        yield chunk;
      }
      if (chunk.type === 'tool-call' && chunk.toolName) {
        const handler = this.tools.get(chunk.toolName);
        if (handler) {
          let approved = this.autoApproveTools;
          if (!approved) {
            await new Promise<void>((resolve, reject) => {
              this.permissionHandler({
                toolId: chunk.toolName!,
                args: {},
                approve: () => {
                  approved = true;
                  resolve();
                },
                deny: () => reject(new Error('Tool denied')),
              });
            });
          }
          if (approved) {
            try {
              const result = await handler({});
              yield { type: 'tool-result', toolName: chunk.toolName, text: String(result) };
            } catch (e) {
              yield { type: 'error', error: String(e) };
            }
          }
        }
      }
      yield chunk;
      if (signal?.aborted) break;
    }

    session.messages.push({ role: 'assistant', content: assistantText });
    yield { type: 'done' };
  }
}

export function createMockProvider(id = 'mock'): AIProvider {
  return {
    id,
    async *streamText(prompt: string) {
      const lower = prompt.toLowerCase();
      if (lower.includes('multi edit')) {
        yield {
          type: 'edit',
          edits: [
            { path: 'README.md', oldText: '# Molecule', newText: '# Molecule Next' },
            { path: 'package.json', newText: '{ "name": "updated" }' },
          ],
        };
        yield { type: 'text', text: 'Proposed edits to 2 files — review in the AI panel.' };
        return;
      }
      if (lower.includes('suggest edit') || lower.includes('apply edit')) {
        yield {
          type: 'edit',
          edit: {
            path: 'README.md',
            oldText: '# Molecule',
            newText: '# Molecule Next',
          },
        };
        yield { type: 'text', text: 'Proposed an edit to **README.md** — review in the AI panel.' };
        return;
      }
      if (lower.includes('run tool') || lower.includes('use tool')) {
        yield { type: 'tool-call', toolName: 'readActiveFile' };
        yield { type: 'tool-result', toolName: 'readActiveFile', text: 'README.md (42 lines)' };
        yield {
          type: 'text',
          text: 'Read the active file via tool.\n\n```typescript\nexport const ok = true;\n```',
        };
        return;
      }
      const reply = `Mock response to: ${prompt.slice(0, 80)}...`;
      for (const word of reply.split(' ')) {
        yield { type: 'text', text: word + ' ' };
        await new Promise((r) => setTimeout(r, 30));
      }
    },
  };
}
