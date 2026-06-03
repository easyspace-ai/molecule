import type { ConfigurationAPI, PluginModule } from '@jiulimiai/plugin-api';
import { defaultL10n } from '@jiulimiai/plugin-api';
import { DEFAULT_KEYBINDINGS, normalizeKeyCombo } from '@jiulimiai/plugin-runtime';
import { Button, Input, ScrollArea, Textarea, cn } from '@jiulimiai/ui';
import { useEffect, useState } from 'react';

import { AppearanceSettingsSection } from './appearance-settings.js';
import {
  applyColorMode,
  applyTheme,
  getThemeState,
  THEMES,
} from './themes-data.js';

export {
  applyColorMode,
  applyTheme,
  getCurrentColorMode,
  getCurrentThemeId,
  getThemeState,
  migrateLegacyThemeId,
  readPersistedTheme,
  readPersistedThemeId,
  setInitialTheme,
  setThemeChangeHandler,
  writePersistedTheme,
  writePersistedThemeId,
  THEME_PRESETS,
  THEMES,
} from './themes-data.js';
export { ThemePickerHost } from './theme-picker-ui.js';
export type { ColorMode, ThemeState } from './theme-config.js';

function SettingsView({
  configuration,
}: {
  configuration: ConfigurationAPI;
}) {
  const [fontSize, setFontSize] = useState(configuration.get<number>('editor.fontSize', 13));
  const [tabSize, setTabSize] = useState(configuration.get<number>('editor.tabSize', 2));
  const [excludeText, setExcludeText] = useState(
    (configuration.get<string[]>('search.exclude', []) ?? []).join(', ')
  );
  const [overrides, setOverrides] = useState<Record<string, string>>(
    configuration.get<Record<string, string>>('keybindings.overrides', {}) ?? {}
  );
  const [overridesJson, setOverridesJson] = useState(() =>
    JSON.stringify(configuration.get<Record<string, string>>('keybindings.overrides', {}) ?? {}, null, 2)
  );
  const [locale, setLocale] = useState(configuration.get<string>('locale', 'zh-CN'));
  const [aiProvider, setAiProvider] = useState(
    configuration.get<string>('ai.provider', 'mock') as 'mock' | 'openai-compatible' | 'pi-remote'
  );
  const [piBaseUrl, setPiBaseUrl] = useState(
    configuration.get<string>('ai.piRemote.baseUrl', 'http://127.0.0.1:5198')
  );
  const [piModel, setPiModel] = useState(
    configuration.get<string>('ai.piRemote.model', '')
  );
  const [piThinkingLevel, setPiThinkingLevel] = useState(
    configuration.get<string>('ai.piRemote.thinkingLevel', 'off')
  );
  const [aiApiKey, setAiApiKey] = useState(configuration.get<string>('ai.openaiCompatible.apiKey', ''));
  const [aiBaseUrl, setAiBaseUrl] = useState(
    configuration.get<string>('ai.openaiCompatible.baseURL', 'https://api.openai.com/v1')
  );
  const [aiModel, setAiModel] = useState(
    configuration.get<string>('ai.openaiCompatible.model', 'gpt-4o-mini')
  );
  const editableBindings = [
    { command: 'workbench.showCommands', label: 'Command palette' },
    { command: 'workbench.action.toggleSidebarVisibility', label: 'Toggle sidebar' },
    { command: 'workbench.openSettings', label: 'Open settings' },
  ] as const;

  useEffect(() => {
    void configuration.whenReady().then((settings) => {
      setFontSize(settings.editor.fontSize);
      setTabSize(settings.editor.tabSize);
      setExcludeText(settings.search.exclude.join(', '));
      setOverrides(settings.keybindings.overrides);
      setOverridesJson(JSON.stringify(settings.keybindings.overrides, null, 2));
      setLocale(settings.locale);
      setAiProvider(settings.ai.provider);
      setAiApiKey(settings.ai.openaiCompatible.apiKey);
      setAiBaseUrl(settings.ai.openaiCompatible.baseURL);
      setAiModel(settings.ai.openaiCompatible.model);
      setPiBaseUrl(settings.ai.piRemote.baseUrl);
      setPiModel(settings.ai.piRemote.model ?? '');
      setPiThinkingLevel(settings.ai.piRemote.thinkingLevel ?? 'off');
    });
  }, [configuration]);

  useEffect(() => {
    const sub = configuration.onDidChange((e) => {
      if (e.key.startsWith('editor.') || e.key === '*') {
        setFontSize(configuration.get<number>('editor.fontSize', 13));
        setTabSize(configuration.get<number>('editor.tabSize', 2));
      }
      if (e.key.startsWith('search.') || e.key === '*') {
        setExcludeText((configuration.get<string[]>('search.exclude', []) ?? []).join(', '));
      }
      if (e.key.startsWith('keybindings.') || e.key === '*') {
        const next = configuration.get<Record<string, string>>('keybindings.overrides', {}) ?? {};
        setOverrides(next);
        setOverridesJson(JSON.stringify(next, null, 2));
      }
      if (e.key === 'locale' || e.key === '*') {
        setLocale(configuration.get<string>('locale', 'zh-CN'));
      }
      if (e.key.startsWith('ai.') || e.key === '*') {
        setAiProvider(configuration.get<string>('ai.provider', 'mock') as 'mock' | 'openai-compatible' | 'pi-remote');
        setAiApiKey(configuration.get<string>('ai.openaiCompatible.apiKey', ''));
        setAiBaseUrl(configuration.get<string>('ai.openaiCompatible.baseURL', 'https://api.openai.com/v1'));
        setAiModel(configuration.get<string>('ai.openaiCompatible.model', 'gpt-4o-mini'));
        setPiBaseUrl(configuration.get<string>('ai.piRemote.baseUrl', 'http://127.0.0.1:5198'));
        setPiModel(configuration.get<string>('ai.piRemote.model', '') ?? '');
        setPiThinkingLevel(configuration.get<string>('ai.piRemote.thinkingLevel', 'off') ?? 'off');
      }
    });
    return () => sub.dispose();
  }, [configuration]);

  const fieldClass = 'mt-1 w-full';

  return (
    <ScrollArea className="h-full">
      <div data-testid="settings-view" className="space-y-5 p-3">
        <AppearanceSettingsSection configuration={configuration} />

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {defaultL10n.t('settings.language', 'Display Language')}
          </h3>
          <label className="block text-xs">
            <select
              value={locale}
              data-testid="settings-locale"
              onChange={(e) => {
                const v = e.target.value;
                setLocale(v);
                void configuration.update('locale', v);
              }}
              className={cn(fieldClass, 'h-9 rounded-md border border-input bg-background px-2')}
            >
              <option value="en">{defaultL10n.t('settings.language.en', 'English')}</option>
              <option value="zh-CN">{defaultL10n.t('settings.language.zh', '中文')}</option>
              <option value="ja">{defaultL10n.t('settings.language.ja', '日语')}</option>
            </select>
          </label>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {defaultL10n.t('settings.ai', 'AI Provider')}
          </h3>
          <label className="mb-2 block text-xs">
            {defaultL10n.t('settings.ai.provider', 'Provider')}
            <select
              value={aiProvider}
              data-testid="settings-ai-provider"
              onChange={(e) => {
                const v = e.target.value as 'mock' | 'openai-compatible' | 'pi-remote';
                setAiProvider(v);
                void configuration.update('ai.provider', v);
              }}
              className={cn(fieldClass, 'h-9 rounded-md border border-input bg-background px-2')}
            >
              <option value="mock">Mock (offline)</option>
              <option value="openai-compatible">OpenAI Compatible</option>
              <option value="pi-remote">Pi (Local)</option>
            </select>
          </label>
          {aiProvider === 'openai-compatible' ? (
            <>
              <p className="mb-2 text-[10px] text-info">
                {defaultL10n.t('settings.ai.apiKeyWarning', 'Stored in workspace settings — do not commit secrets.')}
              </p>
              <label className="mb-2 block text-xs">
                {defaultL10n.t('settings.ai.apiKey', 'API Key')}
                <Input
                  type="password"
                  value={aiApiKey}
                  data-testid="settings-ai-api-key"
                  className={fieldClass}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  onBlur={() => void configuration.update('ai.openaiCompatible.apiKey', aiApiKey)}
                />
              </label>
              <label className="mb-2 block text-xs">
                {defaultL10n.t('settings.ai.baseURL', 'Base URL')}
                <Input
                  type="text"
                  value={aiBaseUrl}
                  data-testid="settings-ai-base-url"
                  className={fieldClass}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  onBlur={() => void configuration.update('ai.openaiCompatible.baseURL', aiBaseUrl)}
                />
              </label>
              <label className="block text-xs">
                {defaultL10n.t('settings.ai.model', 'Model')}
                <Input
                  type="text"
                  value={aiModel}
                  data-testid="settings-ai-model"
                  className={fieldClass}
                  onChange={(e) => setAiModel(e.target.value)}
                  onBlur={() => void configuration.update('ai.openaiCompatible.model', aiModel)}
                />
              </label>
            </>
          ) : null}
          {aiProvider === 'pi-remote' ? (
            <>
              <label className="mb-2 block text-xs">
                Server URL
                <Input
                  type="text"
                  value={piBaseUrl}
                  data-testid="settings-pi-base-url"
                  className={fieldClass}
                  onChange={(e) => setPiBaseUrl(e.target.value)}
                  onBlur={() => void configuration.update('ai.piRemote.baseUrl', piBaseUrl)}
                />
              </label>
              <label className="mb-2 block text-xs">
                Model (optional)
                <Input
                  type="text"
                  value={piModel}
                  placeholder="deepseek-v4-pro"
                  className={fieldClass}
                  onChange={(e) => setPiModel(e.target.value)}
                  onBlur={() => void configuration.update('ai.piRemote.model', piModel)}
                />
              </label>
              <label className="block text-xs">
                Thinking Level
                <select
                  value={piThinkingLevel}
                  className={cn(fieldClass, 'h-9 rounded-md border border-input bg-background px-2')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPiThinkingLevel(v);
                    void configuration.update('ai.piRemote.thinkingLevel', v);
                  }}
                >
                  <option value="off">Off</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </>
          ) : null}
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Editor</h3>
          <label className="mb-2 block text-xs">
            Font size
            <Input
              type="number"
              min={10}
              max={24}
              value={fontSize}
              data-testid="settings-font-size"
              className={fieldClass}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFontSize(v);
                void configuration.update('editor.fontSize', v);
                window.dispatchEvent(new CustomEvent('molecule:editor-settings-changed', { detail: { fontSize: v } }));
              }}
            />
          </label>
          <label className="block text-xs">
            Tab size
            <Input
              type="number"
              min={1}
              max={8}
              value={tabSize}
              data-testid="settings-tab-size"
              className={fieldClass}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTabSize(v);
                void configuration.update('editor.tabSize', v);
                window.dispatchEvent(new CustomEvent('molecule:editor-settings-changed', { detail: { tabSize: v } }));
              }}
            />
          </label>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Search</h3>
          <label className="block text-xs">
            Exclude globs (comma-separated)
            <Textarea
              rows={3}
              value={excludeText}
              data-testid="settings-search-exclude"
              className={cn(fieldClass, 'font-mono')}
              onChange={(e) => setExcludeText(e.target.value)}
              onBlur={() => {
                const globs = excludeText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                void configuration.update('search.exclude', globs);
              }}
            />
          </label>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keybindings</h3>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Override common shortcuts (e.g. ctrl+shift+p). Import/export JSON below.
          </p>
          {editableBindings.map(({ command, label }) => (
            <label key={command} className="mb-2 block text-xs">
              {label}
              <Input
                type="text"
                value={overrides[command] ?? ''}
                placeholder={DEFAULT_KEYBINDINGS.find((b) => b.command === command)?.key ?? 'ctrl+…'}
                data-testid={`settings-keybinding-${command}`}
                className={fieldClass}
                onChange={(e) => {
                  const value = normalizeKeyCombo(e.target.value);
                  const next = { ...overrides };
                  if (value) next[command] = value;
                  else delete next[command];
                  setOverrides(next);
                  setOverridesJson(JSON.stringify(next, null, 2));
                  void configuration.update('keybindings.overrides', next);
                }}
              />
            </label>
          ))}
          <label className="mb-2 block text-xs">
            Overrides JSON
            <Textarea
              rows={4}
              value={overridesJson}
              data-testid="settings-keybindings-json"
              className={cn(fieldClass, 'font-mono')}
              onChange={(e) => setOverridesJson(e.target.value)}
              onBlur={() => {
                try {
                  const parsed = JSON.parse(overridesJson || '{}') as Record<string, string>;
                  setOverrides(parsed);
                  void configuration.update('keybindings.overrides', parsed);
                } catch {
                  setOverridesJson(JSON.stringify(overrides, null, 2));
                }
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="settings-keybindings-reset"
            onClick={() => {
              setOverrides({});
              setOverridesJson('{}');
              void configuration.update('keybindings.overrides', {});
            }}
          >
            Reset keybinding overrides
          </Button>
        </section>
      </div>
    </ScrollArea>
  );
}

export function createThemesPlugin(getConfiguration: () => ConfigurationAPI | undefined): PluginModule {
  return {
    manifest: {
      id: 'easyspace.themes',
      name: 'Themes',
      version: '0.1.0',
      activationEvents: ['onStartup'],
      contributes: {
        themes: THEMES,
        views: [{ id: 'settings', name: 'Settings', location: 'sidebar', icon: 'settings' }],
        commands: [
          { id: 'theme.setDark', title: 'Preferences: Dark Mode' },
          { id: 'theme.setLight', title: 'Preferences: Light Mode' },
          { id: 'theme.setSystem', title: 'Preferences: System Mode' },
          { id: 'workbench.selectColorTheme', title: 'Preferences: Color Theme' },
          { id: 'workbench.openSettings', title: 'Preferences: Open Settings' },
        ],
      },
    },
    activate(ctx) {
      ctx.workbench.registerView('sidebar', 'settings', () => {
        const config = ctx.configuration ?? getConfiguration();
        if (!config) return null;
        return <SettingsView configuration={config} />;
      });

      ctx.commands.registerCommand('theme.setDark', () => {
        applyColorMode('dark');
        const config = ctx.configuration ?? getConfiguration();
        void config?.update('theme.colorMode', 'dark');
      });
      ctx.commands.registerCommand('theme.setLight', () => {
        applyColorMode('light');
        const config = ctx.configuration ?? getConfiguration();
        void config?.update('theme.colorMode', 'light');
      });
      ctx.commands.registerCommand('theme.setSystem', () => {
        applyColorMode('system');
        const config = ctx.configuration ?? getConfiguration();
        void config?.update('theme.colorMode', 'system');
      });
      ctx.commands.registerCommand('workbench.selectColorTheme', () => {
        window.dispatchEvent(new CustomEvent('molecule:show-theme-picker'));
      });
      ctx.commands.registerCommand('workbench.openSettings', () => {
        ctx.workbench.setSidebarVisible(true);
        window.dispatchEvent(new CustomEvent('molecule:open-settings'));
      });

      const config = ctx.configuration ?? getConfiguration();
      const settings = config?.getSettings();
      const persisted = getThemeState();
      const themeState = {
        colorTheme: settings?.theme.colorTheme ?? persisted.colorTheme,
        colorMode: settings?.theme.colorMode ?? persisted.colorMode,
      };
      applyTheme(themeState);
    },
  };
}

export const themesPlugin = createThemesPlugin(() => undefined);

export default themesPlugin;
