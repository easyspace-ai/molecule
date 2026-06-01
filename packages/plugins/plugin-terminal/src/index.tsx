import type { PluginModule, TerminalAPI } from '@easyspace/plugin-api';
import type { TerminalService } from '@easyspace/plugin-runtime';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';

import '@xterm/xterm/css/xterm.css';

function TerminalView({ terminal }: { terminal: TerminalService }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ReturnType<TerminalAPI['createSession']> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const session = terminal.createSession({ name: 'Molecule' });
    sessionRef.current = session;

    (window as unknown as { __moleculeTerminalRun?: (line: string) => Promise<void> }).__moleculeTerminalRun =
      (line) => terminal.executeLine(session.id, line);

    const xterm = new Terminal({
      cursorBlink: true,
      fontFamily: 'var(--mo-font-mono, Menlo, monospace)',
      fontSize: 13,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
    });
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();

    const outputSub = terminal.onOutput((sessionId, data) => {
      if (sessionId !== session.id) return;
      xterm.write(data);
      const el = containerRef.current;
      if (el) {
        const prev = el.getAttribute('data-terminal-output') ?? '';
        el.setAttribute('data-terminal-output', prev + data.replace(/\x1b\[[0-9;]*m/g, ''));
      }
    });

    let lineBuffer = '';
    xterm.onData((data) => {
      if (data === '\r') {
        xterm.write('\r\n');
        const input = lineBuffer;
        lineBuffer = '';
        void terminal.executeLine(session.id, input);
        return;
      }
      if (data === '\u007f') {
        if (lineBuffer.length > 0) {
          lineBuffer = lineBuffer.slice(0, -1);
          xterm.write('\b \b');
        }
        return;
      }
      lineBuffer += data;
      xterm.write(data);
    });

    const resize = () => fitAddon.fit();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      outputSub.dispose();
      delete (window as unknown as { __moleculeTerminalRun?: (line: string) => Promise<void> })
        .__moleculeTerminalRun;
    };
  }, [terminal]);

  return (
    <div
      ref={containerRef}
      data-testid="panel-terminal"
      style={{ width: '100%', height: '100%', minHeight: 120, padding: 4, boxSizing: 'border-box' }}
    />
  );
}

let terminalService: TerminalService | null = null;

export function setTerminalService(service: TerminalService): void {
  terminalService = service;
}

export const terminalPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.terminal',
    name: 'Terminal',
    version: '0.2.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'terminal', name: 'Terminal', location: 'panel' }],
      commands: [
        { id: 'terminal.focus', title: 'View: Focus Terminal' },
        { id: 'panel.showTerminal', title: 'View: Show Terminal' },
      ],
      keybindings: [
        { command: 'terminal.focus', key: 'ctrl+`' },
        { command: 'terminal.focus', key: 'cmd+`' },
      ],
    },
  },
  activate(ctx) {
    const terminal = ctx.terminal ?? terminalService;
    if (!terminal) return;

    ctx.workbench.registerView('panel', 'terminal', () => {
      if (!('onOutput' in terminal)) return null;
      return <TerminalView terminal={terminal as TerminalService} />;
    });

    const focusTerminal = () => {
      ctx.workbench.setPanelVisible(true);
      window.dispatchEvent(new CustomEvent('molecule:focus-panel', { detail: { viewId: 'terminal' } }));
    };

    ctx.commands.registerCommand('terminal.focus', focusTerminal);
    ctx.commands.registerCommand('panel.showTerminal', focusTerminal);
  },
};

export default terminalPlugin;
