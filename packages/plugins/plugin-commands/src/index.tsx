import type { PluginModule, UIAPI } from '@jiulimiai/plugin-api';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@jiulimiai/ui';
import { useEffect, useState } from 'react';

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div data-testid="command-palette">
        <CommandInput placeholder="Type a command..." autoFocus />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup>
            {commandList.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.title} ${cmd.id}`}
                onSelect={() => {
                  void executeCommand(cmd.id);
                  setOpen(false);
                }}
              >
                {cmd.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}

interface QuickPickDetail<T extends string> {
  items: T[];
  placeHolder?: string;
  resolve: (value: T | undefined) => void;
}

function QuickPickHost() {
  const [state, setState] = useState<QuickPickDetail<string> | null>(null);
  const open = state !== null;

  useEffect(() => {
    const onShow = (e: Event) => {
      const detail = (e as CustomEvent<QuickPickDetail<string>>).detail;
      if (!detail?.items) return;
      setState(detail);
    };
    window.addEventListener('molecule:show-quick-pick', onShow);
    return () => window.removeEventListener('molecule:show-quick-pick', onShow);
  }, []);

  const close = (value?: string) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close(undefined);
      }}
    >
      <div data-testid="quick-pick">
        <CommandInput placeholder={state?.placeHolder ?? 'Select an item'} autoFocus />
        <CommandList>
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup>
            {(state?.items ?? []).map((item) => (
              <CommandItem
                key={item}
                value={item}
                data-testid={`quick-pick-item-${item}`}
                onSelect={() => close(item)}
              >
                {item}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
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
