/**
 * Pi Remote Provider — connects to the pi-server SSE endpoint from the browser.
 * Implements AIProvider and adds pi-specific capabilities: model listing, switching, thinking level.
 */
import type { AIProvider, AIStreamChunk } from '@jiulimiai/plugin-api';

export interface PiModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens: number;
  cost?: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

export interface PiRemoteConfig {
  baseUrl?: string;
  /** Preferred model ID (e.g. "deepseek-v4-pro") */
  model?: string;
  /** Thinking level: off, minimal, low, medium, high, xhigh */
  thinkingLevel?: string;
}

export class PiRemoteProvider implements AIProvider {
  readonly id = 'pi-remote';
  private baseUrl: string;
  private currentModel: PiModelInfo | null = null;
  private currentThinkingLevel = 'off';
  private availableModels: PiModelInfo[] = [];

  constructor(config: PiRemoteConfig = {}) {
    this.baseUrl = (config.baseUrl ?? 'http://127.0.0.1:5198').replace(/\/$/, '');
    // Apply initial config after init
    if (config.model || config.thinkingLevel) {
      void this.init(config);
    }
  }

  private async init(config: PiRemoteConfig): Promise<void> {
    // Fetch available models
    try {
      const resp = await fetch(`${this.baseUrl}/api/models`);
      const data = await resp.json();
      if (data.ok && Array.isArray(data.models?.models)) {
        this.availableModels = data.models.models;
      }
    } catch { /* ignore */ }

    // Apply model preference
    if (config.model) {
      await this.setModel(config.model);
    }
    if (config.thinkingLevel) {
      await this.setThinkingLevel(config.thinkingLevel);
    }
  }

  /** Get list of available models from the pi-server. */
  async getModels(): Promise<PiModelInfo[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/models`);
      const data = await resp.json();
      if (data.ok && Array.isArray(data.models?.models)) {
        this.availableModels = data.models.models;
      }
    } catch { /* return cached */ }
    return this.availableModels;
  }

  /** Get current model info. */
  getCurrentModel(): PiModelInfo | null {
    return this.currentModel;
  }

  /** Switch to a different model by provider + modelId. */
  async setModel(modelId: string): Promise<boolean> {
    try {
      // Parse "provider/modelId" or just "modelId"
      let provider = '';
      let id = modelId;
      if (modelId.includes('/')) {
        [provider, id] = modelId.split('/');
      } else {
        // Find provider from available models
        const found = this.availableModels.find(m => m.id === modelId);
        if (found) provider = found.provider;
      }
      if (!provider) provider = 'deepseek'; // fallback

      const resp = await fetch(`${this.baseUrl}/api/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, modelId: id }),
      });
      const data = await resp.json();
      if (data.ok && data.model) {
        this.currentModel = data.model as PiModelInfo;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Set thinking level. */
  async setThinkingLevel(level: string): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/thinking-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      const data = await resp.json();
      if (data.ok) {
        this.currentThinkingLevel = level;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Create a model status line for display. */
  getModelStatusLine(): string {
    if (!this.currentModel) return 'Pi (local) — connecting…';
    const thinking = this.currentModel.reasoning && this.currentThinkingLevel !== 'off'
      ? ` · thinking:${this.currentThinkingLevel}`
      : '';
    return `🤖 ${this.currentModel.name} (${this.currentModel.provider})${thinking}`;
  }

  async *streamText(prompt: string, options?: { signal?: AbortSignal }): AsyncIterable<AIStreamChunk> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: options?.signal,
      });
    } catch (err) {
      yield {
        type: 'error',
        error: `Failed to connect to pi-server (${this.baseUrl}). Is the pi-server running?\n\nError: ${String(err)}`,
      };
      return;
    }

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      yield {
        type: 'error',
        error: `Pi server error (${response.status}): ${detail || response.statusText}`,
      };
      return;
    }

    if (!response.body) {
      yield { type: 'error', error: 'No response body from pi-server' };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let textAccumulator = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const rawLines = buffer.split('\n');
        buffer = rawLines.pop() ?? '';
        let currentEvent = '';
        let currentData = '';

        for (const line of rawLines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent) {
            try {
              const data = JSON.parse(currentData);
              const chunk = sseToStreamChunk(currentEvent, data);
              if (chunk) {
                if (chunk.type === 'text' && chunk.text) {
                  textAccumulator += chunk.text;
                }
                yield chunk;
              }
            } catch { /* skip malformed */ }
            currentEvent = '';
            currentData = '';
          }
        }

        if (options?.signal?.aborted) break;
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/** Convenience factory that returns a PiRemoteProvider instance. */
export function createPiRemoteProvider(config: PiRemoteConfig = {}): PiRemoteProvider {
  return new PiRemoteProvider(config);
}

function sseToStreamChunk(
  eventType: string,
  data: Record<string, unknown>,
): AIStreamChunk | null {
  switch (eventType) {
    case 'text_delta':
      return { type: 'text', text: (data.text as string) ?? '' };

    case 'thinking_delta':
      return { type: 'text', text: `\n*${(data.text as string) ?? ''}*\n` };

    case 'tool_start':
      return { type: 'tool-call', toolName: (data.name as string) ?? 'unknown' };

    case 'tool_end':
      return {
        type: 'tool-result',
        toolName: (data.name as string) ?? 'unknown',
        text: formatToolResult(data.name as string, data.result as string, data.isError as boolean),
      };

    case 'error':
      return { type: 'error', error: (data.error as string) ?? 'Unknown error' };

    case 'done':
      return { type: 'done' };

    default:
      return null;
  }
}

function formatToolResult(name: string, result: string, isError?: boolean): string {
  const label =
    name === 'bash' ? 'Shell' : name === 'read' ? 'Read' :
    name === 'write' ? 'Write' : name === 'edit' ? 'Edit' :
    name === 'grep' ? 'Grep' : name === 'find' ? 'Find' :
    name === 'ls' ? 'List' : name;
  const prefix = isError ? `❌ ${label} error:` : `✅ ${label}:`;
  const maxLen = 500;
  const truncated = result.length > maxLen ? result.slice(0, maxLen) + '\n...' : result;
  return `${prefix}\n\`\`\`\n${truncated}\n\`\`\``;
}
