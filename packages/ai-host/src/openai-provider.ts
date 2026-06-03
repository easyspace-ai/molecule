import type { AIEditProposal, AIProvider, AIStreamChunk } from '@jiulimiai/plugin-api';

/** Parse structured edit JSON from streamed assistant text. */
export function parseEditBatch(text: string): AIEditProposal[] | null {
  const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"edits"[\s\S]*?\})\s*```/);
  const raw = fenceMatch?.[1] ?? (text.includes('"edits"') ? text : null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { edits?: AIEditProposal[] };
    if (Array.isArray(parsed.edits) && parsed.edits.length > 0) return parsed.edits;
  } catch {
    /* ignore */
  }
  return null;
}

/** Incrementally scan buffer for completed edit JSON blocks. */
export function extractEditsFromStream(buffer: string): {
  edits: AIEditProposal[];
  remaining: string;
} {
  const edits: AIEditProposal[] = [];
  const batch = parseEditBatch(buffer);
  if (batch) {
    edits.push(...batch);
    return { edits, remaining: '' };
  }
  return { edits, remaining: buffer };
}

export interface OpenAICompatibleConfig {
  id?: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): AIProvider {
  const id = config.id ?? 'openai-compatible';

  return {
    id,
    async *streamText(prompt: string, options = {}) {
      if (!config.apiKey) {
        yield { type: 'error', error: 'AI API key not configured. Set ai.openaiCompatible.apiKey in settings.' };
        return;
      }

      const url = `${config.baseURL.replace(/\/$/, '')}/chat/completions`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: 'system',
                content:
                  'When proposing file edits, emit a JSON block: {"edits":[{"path":"file.ts","oldText":"optional","newText":"content"}]}.',
              },
              { role: 'user', content: prompt },
            ],
            stream: true,
          }),
          signal: options.signal,
        });
      } catch (error) {
        yield { type: 'error', error: String(error) };
        return;
      }

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => response.statusText);
        yield { type: 'error', error: `OpenAI-compatible API error (${response.status}): ${errText}` };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              textBuffer += delta;
              yield { type: 'text', text: delta };
              const { edits } = extractEditsFromStream(textBuffer);
              if (edits.length > 0) {
                yield { type: 'edit', edits };
                textBuffer = '';
              }
            }
          } catch {
            /* skip malformed SSE chunk */
          }
        }
        if (options.signal?.aborted) break;
      }

      const trailing = parseEditBatch(textBuffer);
      if (trailing?.length) {
        yield { type: 'edit', edits: trailing };
      }
    },
  };
}

export function chunksFromEditBatch(edits: AIEditProposal[]): AIStreamChunk[] {
  if (edits.length === 1) return [{ type: 'edit', edit: edits[0] }];
  return [{ type: 'edit', edits }];
}
