import type {
  CommandContribution,
  ThemeContribution,
  ViewContribution,
  ViewLocation,
} from '@easyspace/plugin-api';

export interface ContributionRegistry {
  commands: Map<string, CommandContribution & { pluginId: string }>;
  views: Map<string, ViewContribution & { pluginId: string }>;
  themes: Map<string, ThemeContribution & { pluginId: string }>;
  viewRenderers: Map<string, () => import('react').ReactNode>;
  commandHandlers: Map<string, (...args: unknown[]) => unknown>;
}

export function createRegistry(): ContributionRegistry {
  return {
    commands: new Map(),
    views: new Map(),
    themes: new Map(),
    viewRenderers: new Map(),
    commandHandlers: new Map(),
  };
}

export function viewsByLocation(
  registry: ContributionRegistry,
  location: ViewLocation
): (ViewContribution & { pluginId: string })[] {
  return [...registry.views.values()].filter((v) => v.location === location);
}
