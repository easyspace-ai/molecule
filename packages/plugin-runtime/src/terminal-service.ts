import { createTerminalHost, type TerminalHost } from '@jiulimiai/terminal-host';
import type { TerminalAPI, TerminalSession, WorkspaceAPI } from '@jiulimiai/plugin-api';

export interface TerminalService extends TerminalAPI {}

export interface TerminalServiceOptions {
  workspace?: WorkspaceAPI;
  host?: TerminalHost;
}

export function createTerminalService(options: TerminalServiceOptions = {}): TerminalService {
  const host = options.host ?? createTerminalHost({ workspace: options.workspace });

  return {
    appendOutput(sessionId, data) {
      host.appendOutput(sessionId, data);
    },

    registerCommand(name, handler) {
      return host.registerCommand(name, handler);
    },

    createSession(opts = {}): TerminalSession {
      const session = host.createSession(opts);
      return {
        id: session.id,
        name: session.name,
        write: (data) => session.write(data),
        dispose: () => session.dispose(),
      };
    },

    executeLine(sessionId, line) {
      return host.executeLine(sessionId, line);
    },

    onDidCloseTerminal(handler) {
      return host.onDidCloseSession(handler);
    },

    onOutput(handler) {
      return host.onOutput(handler);
    },
  };
}

export { createTerminalHost, TerminalHost } from '@jiulimiai/terminal-host';
