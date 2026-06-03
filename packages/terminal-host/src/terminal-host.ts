import type { Disposable, WorkspaceAPI } from '@jiulimiai/plugin-api';

export type TerminalCommandHandler = (args: string[]) => Promise<string> | string;

export interface TerminalSessionOptions {
  name?: string;
  cwd?: string;
}

export interface TerminalSessionHandle {
  id: string;
  name: string;
  cwd: string;
  write(data: string): void;
  dispose(): void;
}

export interface TerminalHostOptions {
  workspace?: WorkspaceAPI;
  prompt?: string;
}

export class TerminalHost {
  private sessions = new Map<string, TerminalSessionHandle & { buffer: string }>();
  private commands = new Map<string, TerminalCommandHandler>();
  private outputListeners = new Set<(sessionId: string, data: string) => void>();
  private closeListeners = new Set<(sessionId: string) => void>();
  private sessionCounter = 0;
  private readonly prompt: string;

  constructor(private readonly options: TerminalHostOptions = {}) {
    this.prompt = options.prompt ?? '$ ';
    this.registerBuiltins();
    if (options.workspace) {
      this.registerWorkspaceCommands(options.workspace);
    }
  }

  onOutput(handler: (sessionId: string, data: string) => void): Disposable {
    this.outputListeners.add(handler);
    return { dispose: () => this.outputListeners.delete(handler) };
  }

  onDidCloseSession(handler: (sessionId: string) => void): Disposable {
    this.closeListeners.add(handler);
    return { dispose: () => this.closeListeners.delete(handler) };
  }

  registerCommand(name: string, handler: TerminalCommandHandler): Disposable {
    this.commands.set(name, handler);
    return { dispose: () => this.commands.delete(name) };
  }

  createSession(options: TerminalSessionOptions = {}): TerminalSessionHandle {
    const id = `terminal-${++this.sessionCounter}`;
    const name = options.name ?? 'Terminal';
    const cwd = options.cwd ?? this.options.workspace?.getRoot() ?? '/';
    const session = {
      id,
      name,
      cwd,
      buffer: '',
      write: (data: string) => this.emit(id, data),
      dispose: () => {
        this.sessions.delete(id);
        for (const listener of this.closeListeners) listener(id);
      },
    };
    this.sessions.set(id, session);
    this.emit(id, `\r\n\x1b[32mWelcome to Molecule Terminal\x1b[0m — ${name}\r\n`);
    if (cwd) this.emit(id, `cwd: ${cwd}\r\n`);
    this.writePrompt(id);
    return session;
  }

  appendOutput(sessionId: string, data: string): void {
    this.emit(sessionId, data);
  }

  async executeLine(sessionId: string, line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) {
      this.writePrompt(sessionId);
      return;
    }

    const [cmd, ...args] = trimmed.split(/\s+/);
    const handler = this.commands.get(cmd);
    if (!handler) {
      this.emit(sessionId, `\r\ncommand not found: ${cmd}\r\n`);
      this.writePrompt(sessionId);
      return;
    }

    try {
      const result = await handler(args);
      if (result) this.emit(sessionId, `\r\n${result}\r\n`);
    } catch (error) {
      this.emit(sessionId, `\r\n\x1b[31m${String(error)}\x1b[0m\r\n`);
    }
    this.writePrompt(sessionId);
  }

  private emit(sessionId: string, data: string): void {
    for (const listener of this.outputListeners) listener(sessionId, data);
  }

  private writePrompt(sessionId: string): void {
    this.emit(sessionId, this.prompt);
  }

  private registerBuiltins(): void {
    this.registerCommand('help', () =>
      [
        'Built-in commands:',
        '  help          Show this help',
        '  clear         Clear screen',
        '  echo <text>   Print text',
        '  pwd           Print working directory',
        '  ls [path]     List workspace files',
        '  cat <file>    Read a file',
      ].join('\r\n')
    );
    this.registerCommand('clear', () => '\x1b[2J\x1b[H');
    this.registerCommand('echo', async (args) => args.join(' '));
  }

  private registerWorkspaceCommands(workspace: WorkspaceAPI): void {
    this.registerCommand('pwd', () => workspace.getRoot());
    this.registerCommand('ls', async (args) => {
      const target = args[0] ?? '/';
      const entries = await workspace.listDirectory(target);
      return entries.map((e) => `${e.isDirectory ? 'd' : '-'} ${e.name}`).join('\r\n') || '(empty)';
    });
    this.registerCommand('cat', async (args) => {
      const path = args[0];
      if (!path) throw new Error('Usage: cat <file>');
      return workspace.readFile(path);
    });
  }
}

export function createTerminalHost(options?: TerminalHostOptions): TerminalHost {
  return new TerminalHost(options);
}
