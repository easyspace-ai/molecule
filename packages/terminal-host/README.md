# @jiulimiai/terminal-host

Minimal terminal session host with pluggable commands. Used by `@jiulimiai/plugin-terminal` and available to third-party apps.

## Usage

```typescript
import { createTerminalHost } from '@jiulimiai/terminal-host';
import { createMemoryWorkspace } from '@jiulimiai/plugin-runtime';

const workspace = createMemoryWorkspace({ 'hello.txt': 'world' });
const host = createTerminalHost({ workspace });
const session = host.createSession({ name: 'main' });

host.onOutput((_id, data) => process.stdout.write(data));
await host.executeLine(session.id, 'ls');
await host.executeLine(session.id, 'cat hello.txt');
```

## Built-in commands

`help`, `clear`, `echo`, `pwd`, `ls`, `cat` (workspace commands when `workspace` is provided).

## Plugin API

Reference IDE wires `createTerminalService({ workspace })` from `@jiulimiai/plugin-runtime`, which adapts this host to `TerminalAPI`.

Extensions register commands via `ctx.terminal.registerCommand` or manifest `contributes.terminalCommands` (loaded at activate).
