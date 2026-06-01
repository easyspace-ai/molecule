import { describe, expect, it } from 'vitest';

import {
  KeybindingRegistry,
  createDefaultKeybindingRegistry,
  normalizeKeyCombo,
} from './keybindings.js';

describe('KeybindingRegistry', () => {
  it('matches ctrl+shift+p', () => {
    const registry = createDefaultKeybindingRegistry();
    const event = new KeyboardEvent('keydown', {
      key: 'P',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(registry.match(event)).toBe('workbench.showCommands');
  });

  it('matches ctrl+b for sidebar toggle', () => {
    const registry = createDefaultKeybindingRegistry();
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true });
    expect(registry.match(event)).toBe('workbench.action.toggleSidebarVisibility');
  });

  it('normalizes modifier order', () => {
    expect(normalizeKeyCombo('shift+ctrl+p')).toBe('ctrl+shift+p');
  });

  it('registers custom bindings', () => {
    const registry = new KeybindingRegistry();
    registry.register({ command: 'test.run', key: 'ctrl+shift+t' });
    const event = new KeyboardEvent('keydown', {
      key: 'T',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(registry.match(event)).toBe('test.run');
  });
});
