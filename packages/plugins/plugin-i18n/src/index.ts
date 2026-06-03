import type { ConfigurationAPI, PluginModule } from '@jiulimiai/plugin-api';
import { setMessageBundle } from '@jiulimiai/plugin-api';

import { BUNDLED_LOCALES, bundleForLocale, mergeLocalizationContributions } from './bundles.js';

export { EN_BUNDLE, ZH_BUNDLE, JA_BUNDLE, BUNDLED_LOCALES, bundleForLocale } from './bundles.js';

const extensionLocalizations: { locale: string; translations: Record<string, string> }[] = [];

export function registerExtensionLocalizations(
  entries: { locale: string; translations: Record<string, string> }[]
): void {
  extensionLocalizations.push(...entries);
}

export function applyLocale(locale: string): void {
  const base = bundleForLocale(locale);
  setMessageBundle(mergeLocalizationContributions(base, extensionLocalizations, locale));
}

function syncFromConfiguration(configuration: ConfigurationAPI): void {
  const locale = configuration.get<string>('locale', 'zh-CN');
  applyLocale(locale);
}

export const i18nPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.i18n',
    name: 'Internationalization',
    version: '0.2.0',
    activationEvents: ['onStartup'],
    contributes: {
      commands: [{ id: 'workbench.setLocale', title: 'Preferences: Change Display Language' }],
      localizations: [
        { locale: 'en', translations: {} },
        { locale: 'zh-CN', translations: {} },
        { locale: 'ja', translations: {} },
      ],
    },
  },
  activate(ctx) {
    if (!ctx.configuration) {
      applyLocale('zh-CN');
      return;
    }

    void ctx.configuration.whenReady().then(() => syncFromConfiguration(ctx.configuration!));

    ctx.configuration.onDidChange((e) => {
      if (e.key === 'locale' || e.key === '*') {
        syncFromConfiguration(ctx.configuration!);
      }
    });

    ctx.commands.registerCommand('workbench.setLocale', async () => {
      const current = ctx.configuration!.get<string>('locale', 'zh-CN');
      const next = await ctx.ui.showQuickPick([...BUNDLED_LOCALES], 'Display language');
      if (!next || next === current) return;
      await ctx.configuration!.update('locale', next);
      applyLocale(next);
      ctx.workbench.showNotification(`Language: ${next}`, 'info');
    });
  },
};

export default i18nPlugin;
