import type { KeybindingContribution } from '@easyspace/plugin-api';

export interface RegisteredKeybinding extends KeybindingContribution {
  /** Lower number = higher priority when multiple bindings match. */
  priority?: number;
}

export function normalizeKeyCombo(key: string): string {
  return key
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => {
      const order = ['ctrl', 'cmd', 'meta', 'shift', 'alt', 'option'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.localeCompare(b);
    })
    .join('+');
}

function eventToCombo(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('cmd');
  if (event.shiftKey) parts.push('shift');
  if (event.altKey) parts.push('alt');

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key === ' ' ? 'space' : key);
  }
  return normalizeKeyCombo(parts.join('+'));
}

function comboMatches(event: KeyboardEvent, bindingKey: string): boolean {
  const normalized = normalizeKeyCombo(bindingKey);
  const eventCombo = eventToCombo(event);
  return normalized === eventCombo;
}

export class KeybindingRegistry {
  private bindings: RegisteredKeybinding[] = [];

  register(binding: RegisteredKeybinding): () => void {
    this.bindings.push(binding);
    this.bindings.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    return () => {
      this.bindings = this.bindings.filter((b) => b !== binding);
    };
  }

  registerAll(bindings: RegisteredKeybinding[]): () => void {
    const disposers = bindings.map((b) => this.register(b));
    return () => disposers.forEach((d) => d());
  }

  getBindings(): RegisteredKeybinding[] {
    return [...this.bindings];
  }

  /** Returns command id for the first matching binding, or undefined. */
  match(event: KeyboardEvent): string | undefined {
    if (event.defaultPrevented) return undefined;
    if (event.repeat) return undefined;

    for (const binding of this.bindings) {
      if (comboMatches(event, binding.key)) {
        return binding.command;
      }
    }
    return undefined;
  }
}

export const DEFAULT_KEYBINDINGS: RegisteredKeybinding[] = [
  { command: 'workbench.showCommands', key: 'ctrl+shift+p', priority: 0 },
  { command: 'workbench.showCommands', key: 'cmd+shift+p', priority: 0 },
  { command: 'workbench.action.toggleSidebarVisibility', key: 'ctrl+b', priority: 10 },
  { command: 'workbench.action.toggleSidebarVisibility', key: 'cmd+b', priority: 10 },
  { command: 'workbench.action.togglePanel', key: 'ctrl+j', priority: 10 },
  { command: 'workbench.action.togglePanel', key: 'cmd+j', priority: 10 },
  { command: 'workbench.openSettings', key: 'ctrl+,', priority: 10 },
  { command: 'workbench.openSettings', key: 'cmd+,', priority: 10 },
  { command: 'workbench.selectColorTheme', key: 'ctrl+k', priority: 10 },
  { command: 'workbench.selectColorTheme', key: 'cmd+k', priority: 10 },
  { command: 'workbench.action.focusSearch', key: 'ctrl+shift+f', priority: 10 },
  { command: 'workbench.action.focusSearch', key: 'cmd+shift+f', priority: 10 },
];

export function createDefaultKeybindingRegistry(): KeybindingRegistry {
  const registry = new KeybindingRegistry();
  registry.registerAll(DEFAULT_KEYBINDINGS);
  return registry;
}

export function applyKeybindingOverrides(
  registry: KeybindingRegistry,
  overrides: Record<string, string> = {}
): () => void {
  const entries = Object.entries(overrides).filter(([, key]) => Boolean(key.trim()));
  return registry.registerAll(
    entries.map(([command, key]) => ({ command, key, priority: 1 }))
  );
}

export function registerManifestKeybindings(
  registry: KeybindingRegistry,
  pluginId: string,
  bindings: KeybindingContribution[] = []
): () => void {
  return registry.registerAll(
    bindings.map((b) => ({ ...b, priority: 5, command: b.command || `${pluginId}.unknown` }))
  );
}
