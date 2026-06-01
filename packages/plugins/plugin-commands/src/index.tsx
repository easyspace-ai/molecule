import type { PluginModule, UIAPI } from '@easyspace/plugin-api';
import { useEffect, useRef, useState } from 'react';

function CommandPalette({
  commands,
  onExecute,
  onClose,
}: {
  commands: { id: string; title: string }[];
  onExecute: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(filter.toLowerCase()) ||
      c.id.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const focusable = node.querySelector<HTMLElement>('input, button, [href], [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(
        'input, button, [href], [tabindex]:not([tabindex="-1"])'
      )].filter((el) => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', trap);
    return () => node.removeEventListener('keydown', trap);
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-testid="command-palette"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          background: 'var(--mo-bg-secondary)',
          border: '1px solid var(--mo-border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type a command..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 12,
            border: 'none',
            borderBottom: '1px solid var(--mo-border)',
            background: 'var(--mo-bg)',
            color: 'inherit',
            fontSize: 14,
          }}
        />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 300, overflow: 'auto' }}>
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => {
                  onExecute(cmd.id);
                  onClose();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {cmd.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

let commandList: { id: string; title: string }[] = [];
let executeCommand: (id: string) => Promise<unknown> = async () => {};

export function setCommandPaletteApi(
  commands: { id: string; title: string }[],
  execute: (id: string) => Promise<unknown>
): void {
  commandList = commands;
  executeCommand = execute;
}

export function CommandPaletteHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('molecule:show-command-palette', show);
    return () => {
      window.removeEventListener('molecule:show-command-palette', show);
    };
  }, []);

  if (!open) return null;
  return (
    <CommandPalette
      commands={commandList}
      onExecute={(id) => void executeCommand(id)}
      onClose={() => setOpen(false)}
    />
  );
}

interface QuickPickDetail<T extends string> {
  items: T[];
  placeHolder?: string;
  resolve: (value: T | undefined) => void;
}

function QuickPickHost() {
  const [state, setState] = useState<QuickPickDetail<string> | null>(null);
  const [filter, setFilter] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onShow = (e: Event) => {
      const detail = (e as CustomEvent<QuickPickDetail<string>>).detail;
      if (!detail?.items) return;
      setFilter('');
      setState(detail);
    };
    window.addEventListener('molecule:show-quick-pick', onShow);
    return () => window.removeEventListener('molecule:show-quick-pick', onShow);
  }, []);

  useEffect(() => {
    if (!state) return;
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>('input')?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>('input, button')].filter(
        (el) => !el.hasAttribute('disabled')
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener('keydown', trap);
    return () => node?.removeEventListener('keydown', trap);
  }, [state]);

  if (!state) return null;

  const filtered = state.items.filter((item) =>
    item.toLowerCase().includes(filter.toLowerCase())
  );

  const close = (value?: string) => {
    state.resolve(value);
    setState(null);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Pick"
      data-testid="quick-pick"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        zIndex: 2000,
      }}
      onClick={() => close(undefined)}
    >
      <div
        style={{
          width: 420,
          background: 'var(--mo-bg-secondary)',
          border: '1px solid var(--mo-border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={state.placeHolder ?? 'Select an item'}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 12,
            border: 'none',
            borderBottom: '1px solid var(--mo-border)',
            background: 'var(--mo-bg)',
            color: 'inherit',
          }}
        />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 280, overflow: 'auto' }}>
          {filtered.map((item) => (
            <li key={item}>
              <button
                type="button"
                data-testid={`quick-pick-item-${item}`}
                onClick={() => close(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function createQuickPickUI(): UIAPI {
  return {
    showInputBox: async (prompt) => {
      if (typeof window === 'undefined') return undefined;
      const value = window.prompt(prompt);
      if (value === null || value.trim() === '') return undefined;
      return value.trim();
    },
    showQuickPick: async <T extends string>(items: T[], placeHolder?: string) =>
      new Promise<T | undefined>((resolve) => {
        window.dispatchEvent(
          new CustomEvent('molecule:show-quick-pick', {
            detail: { items, placeHolder, resolve },
          })
        );
      }),
  };
}

export { QuickPickHost };

export const commandsPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.commands',
    name: 'Commands',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      commands: [{ id: 'workbench.showCommands', title: 'Show Command Palette' }],
    },
  },
  activate(ctx) {
    ctx.commands.registerCommand('workbench.showCommands', () => {
      window.dispatchEvent(new CustomEvent('molecule:show-command-palette'));
    });
  },
};

export default commandsPlugin;

export { useKeybindings, type UseKeybindingsOptions } from './useKeybindings.js';
