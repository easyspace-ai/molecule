import { describe, expect, it } from 'vitest';

import { parseEditBatch } from './openai-provider.js';

describe('parseEditBatch', () => {
  it('parses fenced JSON edit batch', () => {
    const text = 'Here you go:\n```json\n{"edits":[{"path":"a.ts","newText":"export {}"}]}\n```';
    const edits = parseEditBatch(text);
    expect(edits).toHaveLength(1);
    expect(edits?.[0]?.path).toBe('a.ts');
  });
});
