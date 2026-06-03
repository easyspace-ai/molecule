import {
  DEFAULT_MOLECULE_SETTINGS,
  type ConfigurationAPI,
  type ConfigurationChangeEvent,
  type Disposable,
  type MoleculeSettings,
  type WorkspaceAPI,
} from '@jiulimiai/plugin-api';

const SETTINGS_PATH = '.molecule/settings.json';

function getByPath(obj: unknown, key: string): unknown {
  const parts = key.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setByPath(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (cur[part] == null || typeof cur[part] !== 'object') {
      cur[part] = {};
    }
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

function mergeSettings(base: MoleculeSettings, patch: Partial<MoleculeSettings>): MoleculeSettings {
  return {
    editor: { ...base.editor, ...patch.editor },
    theme: { ...base.theme, ...patch.theme },
    locale: patch.locale ?? base.locale,
    search: { ...base.search, ...patch.search },
    keybindings: {
      overrides: {
        ...base.keybindings.overrides,
        ...patch.keybindings?.overrides,
      },
    },
    ai: {
      provider: patch.ai?.provider ?? base.ai.provider,
      openaiCompatible: {
        ...base.ai.openaiCompatible,
        ...patch.ai?.openaiCompatible,
      },
      piRemote: {
        ...base.ai.piRemote,
        ...patch.ai?.piRemote,
      },
    },
  };
}

export interface ConfigurationServiceOptions {
  workspace: WorkspaceAPI;
  /** Bridge user-scoped keys (e.g. theme) to localStorage when workspace file missing. */
  localStorageBridge?: boolean;
}

export function createConfigurationService(options: ConfigurationServiceOptions): ConfigurationAPI {
  const { workspace } = options;
  const bridge = options.localStorageBridge ?? true;
  let settings: MoleculeSettings = structuredClone(DEFAULT_MOLECULE_SETTINGS);
  const listeners = new Set<(event: ConfigurationChangeEvent) => void>();
  let loadPromise: Promise<void> | null = null;

  const notify = (key: string, value: unknown) => {
    for (const handler of listeners) handler({ key, value });
  };

  const persist = async (): Promise<void> => {
    await workspace.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  };

  const load = async (): Promise<void> => {
    try {
      const raw = await workspace.readFile(SETTINGS_PATH);
      const parsed = JSON.parse(raw) as Partial<MoleculeSettings>;
      settings = mergeSettings(structuredClone(DEFAULT_MOLECULE_SETTINGS), parsed);
    } catch {
      settings = structuredClone(DEFAULT_MOLECULE_SETTINGS);
      try {
        await persist();
      } catch {
        /* workspace may not be writable yet */
      }
    }
    if (bridge && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('molecule:theme');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { colorTheme?: string; colorMode?: MoleculeSettings['theme']['colorMode'] };
          if (parsed.colorTheme) settings.theme.colorTheme = parsed.colorTheme;
          if (parsed.colorMode) settings.theme.colorMode = parsed.colorMode;
        } catch {
          // Legacy plain theme id (vs-dark, vs-light, hc-black)
          const legacyMap: Record<string, Partial<MoleculeSettings['theme']>> = {
            'vs-dark': { colorTheme: 'default', colorMode: 'dark' },
            'vs-light': { colorTheme: 'default', colorMode: 'light' },
            'hc-black': { colorTheme: 'dracula', colorMode: 'dark' },
          };
          const migrated = legacyMap[raw] ?? { colorTheme: raw };
          settings.theme = { ...settings.theme, ...migrated };
        }
      }
    }
  };

  const ensureLoaded = (): Promise<void> => {
    if (!loadPromise) loadPromise = load();
    return loadPromise;
  };

  void ensureLoaded();

  return {
    get<T = unknown>(key: string, defaultValue?: T): T {
      const value = getByPath(settings, key);
      return (value !== undefined ? value : defaultValue) as T;
    },

    getSettings(): MoleculeSettings {
      return structuredClone(settings);
    },

    async update(key: string, value: unknown): Promise<void> {
      await ensureLoaded();
      setByPath(settings as unknown as Record<string, unknown>, key, value);
      if (key === 'theme.colorTheme' && bridge && typeof localStorage !== 'undefined') {
        const current = localStorage.getItem('molecule:theme');
        let stored: Record<string, string> = {};
        try {
          stored = current ? (JSON.parse(current) as Record<string, string>) : {};
        } catch {
          stored = {};
        }
        stored.colorTheme = String(value);
        localStorage.setItem('molecule:theme', JSON.stringify(stored));
      }
      if (key === 'theme.colorMode' && bridge && typeof localStorage !== 'undefined') {
        const current = localStorage.getItem('molecule:theme');
        let stored: Record<string, string> = {};
        try {
          stored = current ? (JSON.parse(current) as Record<string, string>) : {};
        } catch {
          stored = { colorTheme: settings.theme.colorTheme };
        }
        stored.colorMode = String(value);
        localStorage.setItem('molecule:theme', JSON.stringify(stored));
      }
      await persist();
      notify(key, value);
    },

    async updateSettings(patch: Partial<MoleculeSettings>): Promise<void> {
      await ensureLoaded();
      settings = mergeSettings(settings, patch);
      if (patch.theme?.colorTheme && bridge && typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'molecule:theme',
          JSON.stringify({
            colorTheme: patch.theme.colorTheme,
            colorMode: patch.theme.colorMode ?? settings.theme.colorMode,
          })
        );
      } else if (patch.theme?.colorMode && bridge && typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'molecule:theme',
          JSON.stringify({
            colorTheme: patch.theme.colorTheme ?? settings.theme.colorTheme,
            colorMode: patch.theme.colorMode,
          })
        );
      }
      await persist();
      notify('*', settings);
    },

    onDidChange(handler: (event: ConfigurationChangeEvent) => void): Disposable {
      listeners.add(handler);
      return {
        dispose() {
          listeners.delete(handler);
        },
      };
    },

    whenReady(): Promise<MoleculeSettings> {
      return ensureLoaded().then(() => structuredClone(settings));
    },
  };
}
