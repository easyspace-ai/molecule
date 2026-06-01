import { describe, expect, it } from 'vitest';

import { AIHost, createMockProvider } from './ai-host.js';

describe('AIHost', () => {
  it('streams chat via registered provider', async () => {
    const host = new AIHost(true);
    host.registerProvider(createMockProvider());
    const chunks: string[] = [];
    for await (const c of host.streamChat('s1', 'hello')) {
      if (c.type === 'text' && c.text) chunks.push(c.text);
    }
    expect(chunks.join('')).toContain('Mock response');
    expect(host.getSessions()).toHaveLength(1);
  });
});
