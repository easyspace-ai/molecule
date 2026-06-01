import {
  pluginManifestSchema,
  type PluginContext,
  type PluginModule,
} from '@easyspace/plugin-api';

import { createPluginContext, type HostServices } from './host-context.js';
import { registerManifestKeybindings } from './keybindings.js';
import { createRegistry } from './registry.js';
import type { KeybindingRegistry } from './keybindings.js';

export interface PluginManagerOptions {
  plugins: PluginModule[];
  services: Omit<HostServices, 'registry'>;
  keybindingRegistry?: KeybindingRegistry;
}

export class PluginManager {
  readonly registry = createRegistry();
  private activated = new Set<string>();
  private contexts = new Map<string, PluginContext>();
  private keybindingDisposers: (() => void)[] = [];

  constructor(private readonly options: PluginManagerOptions) {}

  loadManifests(): void {
    for (const disposer of this.keybindingDisposers) disposer();
    this.keybindingDisposers = [];

    for (const plugin of this.options.plugins) {
      pluginManifestSchema.parse(plugin.manifest);
      const { contributes } = plugin.manifest;
      if (!contributes) continue;

      for (const cmd of contributes.commands ?? []) {
        this.registry.commands.set(cmd.id, { ...cmd, pluginId: plugin.manifest.id });
      }
      for (const view of contributes.views ?? []) {
        this.registry.views.set(view.id, { ...view, pluginId: plugin.manifest.id });
      }
      for (const theme of contributes.themes ?? []) {
        this.registry.themes.set(theme.id, { ...theme, pluginId: plugin.manifest.id });
      }
      if (this.options.keybindingRegistry && contributes.keybindings?.length) {
        const dispose = registerManifestKeybindings(
          this.options.keybindingRegistry,
          plugin.manifest.id,
          contributes.keybindings
        );
        this.keybindingDisposers.push(dispose);
      }
    }
  }

  shouldActivate(plugin: PluginModule, event?: string): boolean {
    const events = plugin.manifest.activationEvents;
    if (!events?.length) return true;
    if (!event) return events.includes('*') || events.includes('onStartup');
    return events.some((e) => e === '*' || e === event || e === `onCommand:${event}`);
  }

  async activate(plugin: PluginModule, event?: string): Promise<void> {
    if (this.activated.has(plugin.manifest.id)) return;
    if (!this.shouldActivate(plugin, event)) return;

    const services: HostServices = {
      ...this.options.services,
      registry: this.registry,
    };
    const ctx = createPluginContext(services);
    this.contexts.set(plugin.manifest.id, ctx);
    await plugin.activate(ctx);
    this.activated.add(plugin.manifest.id);
  }

  async activateAll(event?: string): Promise<void> {
    for (const plugin of this.options.plugins) {
      await this.activate(plugin, event);
    }
  }

  async deactivateAll(): Promise<void> {
    for (const plugin of [...this.options.plugins].reverse()) {
      if (plugin.deactivate) await plugin.deactivate();
      const ctx = this.contexts.get(plugin.manifest.id);
      ctx?.subscriptions.dispose();
    }
    this.activated.clear();
    this.contexts.clear();
  }

  getContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }
}
