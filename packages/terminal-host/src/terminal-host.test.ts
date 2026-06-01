import { describe, expect, it } from 'vitest';

import { createTerminalHost } from './terminal-host.js';

describe('TerminalHost', () => {
  it('runs echo and help commands', async () => {
    const host = createTerminalHost();
    const session = host.createSession({ name: 'test' });
    const outputs: string[] = [];
    host.onOutput((_id, data) => outputs.push(data));

    await host.executeLine(session.id, 'echo hello');
    expect(outputs.join('')).toContain('hello');

    await host.executeLine(session.id, 'help');
    expect(outputs.join('')).toContain('Built-in commands');
  });

  it('registers custom commands', async () => {
    const host = createTerminalHost();
    host.registerCommand('ping', () => 'pong');
    const session = host.createSession();
    const outputs: string[] = [];
    host.onOutput((_id, data) => outputs.push(data));

    await host.executeLine(session.id, 'ping');
    expect(outputs.join('')).toContain('pong');
  });
});
