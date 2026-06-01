import type { Disposable } from './context.js';

/** Workspace/user settings aligned with ADR 004. */
export interface MoleculeSettings {
  editor: {
    fontSize: number;
    tabSize: number;
  };
  theme: {
    colorTheme: string;
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
    provider: 'mock' | 'openai-compatible';
    openaiCompatible: {
      baseURL: string;
      apiKey: string;
      model: string;
    };
  };
}

export const DEFAULT_MOLECULE_SETTINGS: MoleculeSettings = {
  editor: {
    fontSize: 13,
    tabSize: 2,
  },
  theme: {
    colorTheme: 'vs-dark',
  },
  locale: 'en',
  search: {
    exclude: ['**/node_modules/**', '**/.git/**'],
    useRegex: false,
  },
  keybindings: {
    overrides: {},
  },
  ai: {
    provider: 'mock',
    openaiCompatible: {
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
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
