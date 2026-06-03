import type { MessageBundle } from '@jiulimiai/plugin-api';

export const EN_BUNDLE: MessageBundle = {
  'menu.file': 'File',
  'menu.view': 'View',
  'menu.workspace': 'Workspace',
  'menu.help': 'Help',
  'menu.openReadme': 'Open README',
  'menu.switchWorkspace': 'Switch project',
  'menu.newWorkspace': 'New project',
  'menu.selectWorkspace': 'Select workspace…',
  'menu.toggleSidebar': 'Toggle Sidebar',
  'menu.togglePanel': 'Toggle Panel',
  'menu.toggleAi': 'Toggle AI Panel',
  'menu.commandPalette': 'Command Palette',
  'settings.commandPalette': 'Command Palette',
  'settings.openSettings': 'Settings',
  'settings.colorTheme': 'Color Theme',
  'settings.appearance.title': 'Appearance',
  'settings.appearance.mode': 'Mode',
  'settings.appearance.system': 'System',
  'settings.appearance.light': 'Light',
  'settings.appearance.dark': 'Dark',
  'settings.appearance.colorTheme': 'Color theme',
  'settings.appearance.searchThemes': 'Search…',
  'settings.appearance.noThemes': 'No themes found.',
  'settings.language': 'Display Language',
  'settings.language.en': 'English',
  'settings.language.zh': '中文 (简体)',
  'settings.language.ja': '日本語',
  'settings.ai': 'AI Provider',
  'settings.ai.provider': 'Provider',
  'settings.ai.apiKey': 'API Key',
  'settings.ai.apiKeyWarning': 'Stored in workspace settings — do not commit secrets.',
  'settings.ai.baseURL': 'Base URL',
  'settings.ai.model': 'Model',
};

export const ZH_BUNDLE: MessageBundle = {
  'menu.file': '文件',
  'menu.view': '视图',
  'menu.workspace': '工作区',
  'menu.help': '帮助',
  'menu.openReadme': '打开 README',
  'menu.switchWorkspace': '切换项目',
  'menu.newWorkspace': '新建项目',
  'menu.selectWorkspace': '选择工作区…',
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
  'settings.language.en': 'English',
  'settings.language.zh': '中文 (简体)',
  'settings.language.ja': '日语',
  'hello.greet.title': 'Hello: 问候',
  'hello.notification': '来自 Molecule Next 的问候！',
  'settings.ai': 'AI 提供商',
  'settings.ai.provider': '提供商',
  'settings.ai.apiKey': 'API 密钥',
  'settings.ai.apiKeyWarning': '保存在工作区设置中 — 请勿提交密钥。',
  'settings.ai.baseURL': 'Base URL',
  'settings.ai.model': '模型',
};

export const JA_BUNDLE: MessageBundle = {
  'menu.file': 'ファイル',
  'menu.view': '表示',
  'menu.workspace': 'ワークスペース',
  'menu.help': 'ヘルプ',
  'menu.openReadme': 'README を開く',
  'menu.switchWorkspace': 'プロジェクトを切替',
  'menu.newWorkspace': '新規プロジェクト',
  'menu.selectWorkspace': 'ワークスペースを選択…',
  'menu.toggleSidebar': 'サイドバー切替',
  'menu.togglePanel': 'パネル切替',
  'menu.toggleAi': 'AI パネル切替',
  'menu.commandPalette': 'コマンドパレット',
  'settings.commandPalette': 'コマンドパレット',
  'settings.openSettings': '設定',
  'settings.colorTheme': 'カラーテーマ',
  'settings.appearance.title': '外観',
  'settings.appearance.mode': 'モード',
  'settings.appearance.system': 'システム',
  'settings.appearance.light': 'ライト',
  'settings.appearance.dark': 'ダーク',
  'settings.appearance.colorTheme': 'カラーテーマ',
  'settings.appearance.searchThemes': '検索…',
  'settings.appearance.noThemes': 'テーマが見つかりません。',
  'settings.language': '表示言語',
  'settings.language.en': 'English',
  'settings.language.zh': '中文 (简体)',
  'settings.language.ja': '日本語',
  'settings.ai': 'AI プロバイダ',
  'settings.ai.provider': 'プロバイダ',
  'settings.ai.apiKey': 'API キー',
  'settings.ai.apiKeyWarning': 'ワークスペース設定に保存 — 秘密情報をコミットしないでください。',
  'settings.ai.baseURL': 'Base URL',
  'settings.ai.model': 'モデル',
};

/** Bundled locale ids exposed in settings / quick pick. */
export const BUNDLED_LOCALES = ['en', 'zh-CN', 'ja'] as const;

export type BundledLocale = (typeof BUNDLED_LOCALES)[number];

const LOCALE_BUNDLES: Record<BundledLocale, MessageBundle> = {
  en: EN_BUNDLE,
  'zh-CN': ZH_BUNDLE,
  ja: JA_BUNDLE,
};

export function bundleForLocale(locale: string): MessageBundle {
  if (locale.startsWith('zh')) return ZH_BUNDLE;
  if (locale.startsWith('ja')) return JA_BUNDLE;
  return EN_BUNDLE;
}

export function mergeLocalizationContributions(
  base: MessageBundle,
  contributions: { locale: string; translations: Record<string, string> }[],
  locale: string
): MessageBundle {
  let merged = { ...base };
  for (const entry of contributions) {
    if (entry.locale === locale || (locale.startsWith('zh') && entry.locale.startsWith('zh'))) {
      merged = { ...merged, ...entry.translations };
    }
  }
  return merged;
}

export { LOCALE_BUNDLES };
