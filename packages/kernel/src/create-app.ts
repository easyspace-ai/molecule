import type { PluginModule } from '@easyspace/plugin-api';

import { parseAppConfig, type AppConfig } from './config.js';
import { EventBus, KernelEvents } from './events.js';

export interface CreateAppOptions {
  config?: Partial<AppConfig>;
  plugins?: PluginModule[];
}

export interface MoleculeApp {
  readonly config: AppConfig;
  readonly events: EventBus;
  readonly plugins: PluginModule[];
  dispose(): void;
}

export function createApp(options: CreateAppOptions = {}): MoleculeApp {
  const config = parseAppConfig(options.config);
  const events = new EventBus();
  const plugins = options.plugins ?? [];

  events.emit(KernelEvents.BeforeInit);

  const app: MoleculeApp = {
    config,
    events,
    plugins,
    dispose() {
      events.clear();
    },
  };

  events.emit(KernelEvents.AfterInit, app);
  return app;
}
