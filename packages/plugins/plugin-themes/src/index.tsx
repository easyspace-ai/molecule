import type { ConfigurationAPI, PluginModule } from '@easyspace/plugin-api';
import { defaultL10n } from '@easyspace/plugin-api';
import { DEFAULT_KEYBINDINGS, normalizeKeyCombo } from '@easyspace/plugin-runtime';
import { useEffect, useState } from 'react';

import {
  applyTheme,
  getCurrentThemeId,
  THEMES,
} from './themes-data.js';

export {
  applyTheme,
  getCurrentThemeId,
  readPersistedThemeId,
  setInitialTheme,
  setThemeChangeHandler,
  ThemePickerHost,
  writePersistedThemeId,
  THEMES,
} from './themes-data.js';

function SettingsView({
  configuration,
  onPickTheme,
}: {
  configuration: ConfigurationAPI;
  onPickTheme: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState(getCurrentThemeId());
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
  const [locale, setLocale] = useState(configuration.get<string>('locale', 'en'));
  const [aiProvider, setAiProvider] = useState(
    configuration.get<string>('ai.provider', 'mock') as 'mock' | 'openai-compatible'
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
      setActiveId(settings.theme.colorTheme);
      setOverrides(settings.keybindings.overrides);
      setOverridesJson(JSON.stringify(settings.keybindings.overrides, null, 2));
      setLocale(settings.locale);
      setAiProvider(settings.ai.provider);
      setAiApiKey(settings.ai.openaiCompatible.apiKey);
      setAiBaseUrl(settings.ai.openaiCompatible.baseURL);
      setAiModel(settings.ai.openaiCompatible.model);
    });
  }, [configuration]);

  useEffect(() => {
    const sub = configuration.onDidChange((e) => {
      if (e.key === 'theme.colorTheme' || e.key === '*') {
        setActiveId(configuration.get<string>('theme.colorTheme', 'vs-dark'));
      }
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
        setLocale(configuration.get<string>('locale', 'en'));
      }
      if (e.key.startsWith('ai.') || e.key === '*') {
        setAiProvider(configuration.get<string>('ai.provider', 'mock') as 'mock' | 'openai-compatible');
        setAiApiKey(configuration.get<string>('ai.openaiCompatible.apiKey', ''));
        setAiBaseUrl(configuration.get<string>('ai.openaiCompatible.baseURL', 'https://api.openai.com/v1'));
        setAiModel(configuration.get<string>('ai.openaiCompatible.model', 'gpt-4o-mini'));
      }
    });
    return () => sub.dispose();
  }, [configuration]);

  useEffect(() => {
    const onTheme = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setActiveId(id);
    };
    window.addEventListener('molecule:theme-changed', onTheme);
    return () => window.removeEventListener('molecule:theme-changed', onTheme);
  }, []);

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '6px 8px',
    background: 'var(--mo-bg)',
    border: '1px solid var(--mo-border)',
    color: 'inherit',
    borderRadius: 4,
    marginTop: 4,
  };

  return (
    <div data-testid="settings-view" style={{ padding: '8px 12px', overflow: 'auto' }}>
      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          {defaultL10n.t('settings.language', 'Display Language')}
        </h3>
        <label style={{ display: 'block', fontSize: 12 }}>
          <select
            value={locale}
            data-testid="settings-locale"
            onChange={(e) => {
              const v = e.target.value;
              setLocale(v);
              void configuration.update('locale', v);
            }}
            style={fieldStyle}
          >
            <option value="en">{defaultL10n.t('settings.language.en', 'English')}</option>
            <option value="zh-CN">{defaultL10n.t('settings.language.zh', '中文')}</option>
            <option value="ja">{defaultL10n.t('settings.language.ja', '日本語')}</option>
          </select>
        </label>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          {defaultL10n.t('settings.ai', 'AI Provider')}
        </h3>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
          {defaultL10n.t('settings.ai.provider', 'Provider')}
          <select
            value={aiProvider}
            data-testid="settings-ai-provider"
            onChange={(e) => {
              const v = e.target.value as 'mock' | 'openai-compatible';
              setAiProvider(v);
              void configuration.update('ai.provider', v);
            }}
            style={fieldStyle}
          >
            <option value="mock">Mock (offline)</option>
            <option value="openai-compatible">OpenAI Compatible</option>
          </select>
        </label>
        {aiProvider === 'openai-compatible' ? (
          <>
            <p style={{ fontSize: 10, color: 'var(--mo-warning, #c90)', margin: '0 0 8px' }}>
              {defaultL10n.t('settings.ai.apiKeyWarning', 'Stored in workspace settings — do not commit secrets.')}
            </p>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              {defaultL10n.t('settings.ai.apiKey', 'API Key')}
              <input
                type="password"
                value={aiApiKey}
                data-testid="settings-ai-api-key"
                onChange={(e) => setAiApiKey(e.target.value)}
                onBlur={() => void configuration.update('ai.openaiCompatible.apiKey', aiApiKey)}
                style={fieldStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              {defaultL10n.t('settings.ai.baseURL', 'Base URL')}
              <input
                type="text"
                value={aiBaseUrl}
                data-testid="settings-ai-base-url"
                onChange={(e) => setAiBaseUrl(e.target.value)}
                onBlur={() => void configuration.update('ai.openaiCompatible.baseURL', aiBaseUrl)}
                style={fieldStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 12 }}>
              {defaultL10n.t('settings.ai.model', 'Model')}
              <input
                type="text"
                value={aiModel}
                data-testid="settings-ai-model"
                onChange={(e) => setAiModel(e.target.value)}
                onBlur={() => void configuration.update('ai.openaiCompatible.model', aiModel)}
                style={fieldStyle}
              />
            </label>
          </>
        ) : null}
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          Editor
        </h3>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
          Font size
          <input
            type="number"
            min={10}
            max={24}
            value={fontSize}
            data-testid="settings-font-size"
            onChange={(e) => {
              const v = Number(e.target.value);
              setFontSize(v);
              void configuration.update('editor.fontSize', v);
              window.dispatchEvent(new CustomEvent('molecule:editor-settings-changed', { detail: { fontSize: v } }));
            }}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', fontSize: 12 }}>
          Tab size
          <input
            type="number"
            min={1}
            max={8}
            value={tabSize}
            data-testid="settings-tab-size"
            onChange={(e) => {
              const v = Number(e.target.value);
              setTabSize(v);
              void configuration.update('editor.tabSize', v);
              window.dispatchEvent(new CustomEvent('molecule:editor-settings-changed', { detail: { tabSize: v } }));
            }}
            style={fieldStyle}
          />
        </label>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          Search
        </h3>
        <label style={{ display: 'block', fontSize: 12 }}>
          Exclude globs (comma-separated)
          <textarea
            rows={3}
            value={excludeText}
            data-testid="settings-search-exclude"
            onChange={(e) => setExcludeText(e.target.value)}
            onBlur={() => {
              const globs = excludeText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              void configuration.update('search.exclude', globs);
            }}
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--mo-font-mono)' }}
          />
        </label>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          Keybindings
        </h3>
        <p style={{ fontSize: 11, color: 'var(--mo-fg-muted)', margin: '0 0 8px' }}>
          Override common shortcuts (e.g. ctrl+shift+p). Import/export JSON below.
        </p>
        {editableBindings.map(({ command, label }) => (
          <label key={command} style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
            {label}
            <input
              type="text"
              value={overrides[command] ?? ''}
              placeholder={
                DEFAULT_KEYBINDINGS.find((b) => b.command === command)?.key ?? 'ctrl+…'
              }
              data-testid={`settings-keybinding-${command}`}
              onChange={(e) => {
                const value = normalizeKeyCombo(e.target.value);
                const next = { ...overrides };
                if (value) next[command] = value;
                else delete next[command];
                setOverrides(next);
                setOverridesJson(JSON.stringify(next, null, 2));
                void configuration.update('keybindings.overrides', next);
              }}
              style={fieldStyle}
            />
          </label>
        ))}
        <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
          Overrides JSON
          <textarea
            rows={4}
            value={overridesJson}
            data-testid="settings-keybindings-json"
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
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--mo-font-mono)' }}
          />
        </label>
        <button
          type="button"
          data-testid="settings-keybindings-reset"
          onClick={() => {
            setOverrides({});
            setOverridesJson('{}');
            void configuration.update('keybindings.overrides', {});
          }}
          style={{ fontSize: 11, cursor: 'pointer' }}
        >
          Reset keybinding overrides
        </button>
      </section>

      <section>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--mo-fg-muted)' }}>
          Color Theme
        </h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                data-testid={`theme-option-${t.id}`}
                onClick={() => onPickTheme(t.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  marginBottom: 4,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: activeId === t.id ? 'var(--mo-accent)' : 'transparent',
                  color: activeId === t.id ? '#fff' : 'inherit',
                }}
              >
                {t.label}
                {activeId === t.id ? ' ✓' : ''}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
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
        views: [{ id: 'settings', name: 'Settings', location: 'sidebar', icon: '⚙' }],
        commands: [
          { id: 'theme.setDark', title: 'Preferences: Dark Theme' },
          { id: 'theme.setLight', title: 'Preferences: Light Theme' },
          { id: 'workbench.selectColorTheme', title: 'Preferences: Color Theme' },
          { id: 'workbench.openSettings', title: 'Preferences: Open Settings' },
        ],
      },
    },
    activate(ctx) {
      const pick = async (id: string) => {
        applyTheme(id);
        const config = ctx.configuration ?? getConfiguration();
        if (config) await config.update('theme.colorTheme', id);
        ctx.workbench.showNotification(`Theme: ${THEMES.find((t) => t.id === id)?.label ?? id}`);
      };

      ctx.workbench.registerView('sidebar', 'settings', () => {
        const config = ctx.configuration ?? getConfiguration();
        if (!config) return null;
        return <SettingsView configuration={config} onPickTheme={(id) => void pick(id)} />;
      });

      ctx.commands.registerCommand('theme.setDark', () => void pick('vs-dark'));
      ctx.commands.registerCommand('theme.setLight', () => void pick('vs-light'));
      ctx.commands.registerCommand('workbench.selectColorTheme', () => {
        window.dispatchEvent(new CustomEvent('molecule:show-theme-picker'));
      });
      ctx.commands.registerCommand('workbench.openSettings', () => {
        ctx.workbench.setSidebarVisible(true);
        window.dispatchEvent(new CustomEvent('molecule:open-settings'));
      });

      const config = ctx.configuration ?? getConfiguration();
      const themeId = config?.get<string>('theme.colorTheme') ?? getCurrentThemeId();
      applyTheme(themeId);
    },
  };
}

export const themesPlugin = createThemesPlugin(() => undefined);

export default themesPlugin;
