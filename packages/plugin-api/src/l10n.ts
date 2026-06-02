export type MessageBundle = Record<string, string>;

const BASE_BUNDLE: MessageBundle = {
  'menu.file': '文件',
  'menu.view': '视图',
  'menu.workspace': '工作区',
  'menu.help': '帮助',
  'menu.openReadme': '打开 README',
  'menu.switchWorkspace': '切换项目',
  'menu.newWorkspace': '新建项目',
  'menu.toggleSidebar': '切换侧边栏',
  'menu.togglePanel': '切换面板',
  'menu.toggleAi': '切换 AI 面板',
  'menu.commandPalette': '命令面板',
  'settings.commandPalette': '命令面板',
  'settings.openSettings': '设置',
  'settings.colorTheme': '颜色主题',
  'settings.appearance.title': '外观',
  'settings.appearance.mode': '模式',
  'settings.appearance.system': '系统',
  'settings.appearance.light': '浅色',
  'settings.appearance.dark': '深色',
  'settings.appearance.colorTheme': '颜色主题',
  'settings.appearance.searchThemes': '搜索…',
  'settings.appearance.noThemes': '未找到主题。',
  'settings.language': '显示语言',
  'hello.greet.title': 'Hello: 问候',
  'hello.notification': '来自 Molecule Next 的问候！',
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
