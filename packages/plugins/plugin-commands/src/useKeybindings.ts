import { useEffect } from 'react';

import type { KeybindingRegistry } from '@jiulimiai/plugin-runtime';

export interface UseKeybindingsOptions {
  registry: KeybindingRegistry;
  executeCommand: (commandId: string) => void | Promise<void>;
  /** Commands handled outside the plugin command registry (workbench UI actions). */
  overrides?: Record<string, () => void>;
  enabled?: boolean;
}

/**
 * Global keydown listener wired to a KeybindingRegistry.
 * Skips when focus is in input/textarea/contenteditable unless allowInInput is set on override.
 */
export function useKeybindings({
  registry,
  executeCommand,
  overrides = {},
  enabled = true,
}: UseKeybindingsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.isContentEditable ||
        target?.closest('.monaco-editor');

      const commandId = registry.match(event);
      if (!commandId) return;

      if (isEditable && !overrides[commandId] && commandId !== 'workbench.showCommands') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const override = overrides[commandId];
      if (override) {
        override();
        return;
      }

      void executeCommand(commandId);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [registry, executeCommand, overrides, enabled]);
}
