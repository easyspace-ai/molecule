export type MessageBundle = Record<string, string>;

const BASE_BUNDLE: MessageBundle = {
  'menu.file': 'File',
  'menu.view': 'View',
  'menu.workspace': 'Workspace',
  'menu.help': 'Help',
  'menu.openReadme': 'Open README',
  'menu.switchWorkspace': 'Switch project',
  'menu.newWorkspace': 'New project',
  'menu.toggleSidebar': 'Toggle Sidebar',
  'menu.togglePanel': 'Toggle Panel',
  'menu.toggleAi': 'Toggle AI Panel',
  'menu.commandPalette': 'Command Palette',
  'settings.commandPalette': 'Command Palette',
  'settings.openSettings': 'Settings',
  'settings.colorTheme': 'Color Theme',
  'settings.language': 'Display Language',
  'hello.greet.title': 'Hello: Greet',
  'hello.notification': 'Hello from Molecule Next!',
};

let activeBundle: MessageBundle = { ...BASE_BUNDLE };

export function setMessageBundle(bundle: MessageBundle): void {
  activeBundle = { ...BASE_BUNDLE, ...bundle };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('molecule:locale-changed'));
  }
}

export function getMessageBundle(): MessageBundle {
  return activeBundle;
}

export interface L10nAPI {
  t(key: string, fallback?: string): string;
}

export function createL10n(bundle?: MessageBundle): L10nAPI {
  if (bundle) setMessageBundle(bundle);
  return defaultL10n;
}

export const defaultL10n: L10nAPI = {
  t(key, fallback) {
    return activeBundle[key] ?? fallback ?? BASE_BUNDLE[key] ?? key;
  },
};
