import type { Disposable } from './context.js';

/** Workspace/user settings aligned with ADR 004. */
export interface MoleculeSettings {
  editor: {
    fontSize: number;
    tabSize: number;
  };
  theme: {
    colorTheme: string;
    colorMode: 'system' | 'light' | 'dark';
  };
  locale: string;
  search: {
    exclude: string[];
    useRegex: boolean;
  };
  keybindings: {
    overrides: Record<string, string>;
  };
  ai: {
    provider: 'mock' | 'openai-compatible' | 'pi-remote';
    openaiCompatible: {
      baseURL: string;
      apiKey: string;
      model: string;
    };
    piRemote: {
      baseUrl: string;
      model?: string;
      thinkingLevel?: string;
    };
  };
}

export const DEFAULT_MOLECULE_SETTINGS: MoleculeSettings = {
  editor: {
    fontSize: 13,
    tabSize: 2,
  },
  theme: {
    colorTheme: 'default',
    colorMode: 'system',
  },
  locale: 'zh-CN',
  search: {
    exclude: ['**/node_modules/**', '**/.git/**'],
    useRegex: false,
  },
  keybindings: {
    overrides: {},
  },
  ai: {
    provider: 'pi-remote',
    openaiCompatible: {
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    },
    piRemote: {
      baseUrl: 'http://127.0.0.1:5198',
    },
  },
};

export interface ConfigurationChangeEvent {
  key: string;
  value: unknown;
}

export interface ConfigurationAPI {
  get<T = unknown>(key: string, defaultValue?: T): T;
  getSettings(): MoleculeSettings;
  update(key: string, value: unknown): Promise<void>;
  updateSettings(patch: Partial<MoleculeSettings>): Promise<void>;
  onDidChange(handler: (event: ConfigurationChangeEvent) => void): Disposable;
  /** Resolves when settings have been loaded from workspace storage. */
  whenReady(): Promise<MoleculeSettings>;
}
