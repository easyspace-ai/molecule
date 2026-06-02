import type { PluginModule } from '@easyspace/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import { createEditorHost, createMemoryWorkspace } from './host-context.js';
import { PluginManager } from './plugin-manager.js';

const helloPlugin: PluginModule = {
  manifest: {
    id: 'hello',
    name: 'Hello',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      commands: [{ id: 'hello.say', title: 'Say Hello' }],
    },
  },
  activate(ctx) {
    ctx.commands.registerCommand('hello.say', () => 'hi');
    ctx.workbench.setStatusBarItem({ id: 'hello', text: 'Hello', alignment: 'left' });
  },
};

describe('PluginManager', () => {
  it('loads manifests and activates plugin', async () => {
    const onStatusBarChange = vi.fn();
    const manager = new PluginManager({
      plugins: [helloPlugin],
      services: {
        workspace: createMemoryWorkspace(),
        editor: createEditorHost(),
        onViewRegister: () => ({ dispose: () => {} }),
        onStatusBarChange,
        onLayoutChange: () => {},
        layout: {
          auxiliaryBarVisible: false,
          sidebarVisible: true,
          panelVisible: true,
          menuBarVisible: true,
          statusBarVisible: true,
        },
        setLayout: () => {},
        statusBarItems: new Map(),
        notifications: [],
        pushNotification: () => {},
      },
    });
    manager.loadManifests();
    expect(manager.registry.commands.has('hello.say')).toBe(true);
    await manager.activateAll('onStartup');
    expect(onStatusBarChange).toHaveBeenCalled();
    const result = await manager.getContext('hello')?.commands.executeCommand('hello.say');
    expect(result).toBe('hi');
  });
});
