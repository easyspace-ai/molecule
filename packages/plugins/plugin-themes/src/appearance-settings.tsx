import type { ConfigurationAPI } from '@easyspace/plugin-api';
import { defaultL10n } from '@easyspace/plugin-api';
import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@easyspace/ui';
import { useEffect, useState } from 'react';

import type { ColorMode } from './theme-config.js';
import { THEME_PRESETS } from './theme-presets.js';
import {
  applyColorMode,
  applyTheme,
  getCurrentColorMode,
  getCurrentThemeId,
  getThemeState,
} from './themes-data.js';

const COLOR_MODE_OPTIONS: { value: ColorMode; labelKey: string; fallback: string }[] = [
  { value: 'system', labelKey: 'settings.appearance.system', fallback: 'System' },
  { value: 'light', labelKey: 'settings.appearance.light', fallback: 'Light' },
  { value: 'dark', labelKey: 'settings.appearance.dark', fallback: 'Dark' },
];

function ColorThemeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = THEME_PRESETS.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between font-normal"
          data-testid="appearance-color-theme-trigger"
        >
          <span>{active?.name ?? value}</span>
          <span className="text-muted-foreground">▾</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={defaultL10n.t('settings.appearance.searchThemes', 'Search…')}
            data-testid="appearance-color-theme-search"
          />
          <CommandList>
            <CommandEmpty>{defaultL10n.t('settings.appearance.noThemes', 'No themes found.')}</CommandEmpty>
            <CommandGroup>
              {THEME_PRESETS.map((theme) => (
                <CommandItem
                  key={theme.id}
                  value={theme.name}
                  data-testid={`theme-option-${theme.id}`}
                  onSelect={() => {
                    onChange(theme.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{theme.name}</span>
                  {theme.description ? (
                    <span className="ml-2 truncate text-xs text-muted-foreground">{theme.description}</span>
                  ) : null}
                  {value === theme.id ? ' ✓' : ''}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AppearanceSettingsSection({
  configuration,
}: {
  configuration: ConfigurationAPI;
}) {
  const [colorTheme, setColorTheme] = useState(getCurrentThemeId());
  const [colorMode, setColorMode] = useState<ColorMode>(getCurrentColorMode());

  useEffect(() => {
    void configuration.whenReady().then((settings) => {
      setColorTheme(settings.theme.colorTheme);
      setColorMode(settings.theme.colorMode);
    });
  }, [configuration]);

  useEffect(() => {
    const sub = configuration.onDidChange((e) => {
      if (e.key === 'theme.colorTheme' || e.key === 'theme.colorMode' || e.key === '*') {
        setColorTheme(configuration.get<string>('theme.colorTheme', 'default'));
        setColorMode(configuration.get<ColorMode>('theme.colorMode', 'system'));
      }
    });
    return () => sub.dispose();
  }, [configuration]);

  useEffect(() => {
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; colorMode?: ColorMode }>).detail;
      if (detail?.id) setColorTheme(detail.id);
      if (detail?.colorMode) setColorMode(detail.colorMode);
    };
    window.addEventListener('molecule:theme-changed', onTheme);
    return () => window.removeEventListener('molecule:theme-changed', onTheme);
  }, []);

  const persistTheme = async (next: { colorTheme?: string; colorMode?: ColorMode }) => {
    const state = getThemeState();
    const merged = {
      colorTheme: next.colorTheme ?? state.colorTheme,
      colorMode: next.colorMode ?? state.colorMode,
    };
    applyTheme(merged);
    if (next.colorTheme !== undefined) {
      await configuration.update('theme.colorTheme', merged.colorTheme);
    }
    if (next.colorMode !== undefined) {
      await configuration.update('theme.colorMode', merged.colorMode);
    }
  };

  return (
    <section data-testid="appearance-settings">
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {defaultL10n.t('settings.appearance.title', 'Appearance')}
      </h3>

      <div className="space-y-3 rounded-md border border-border p-3">
        <label className="block text-xs">
          <span className="mb-1.5 block text-muted-foreground">
            {defaultL10n.t('settings.appearance.mode', 'Mode')}
          </span>
          <div
            className="inline-flex w-full rounded-md border border-border p-0.5"
            data-testid="appearance-mode-control"
          >
            {COLOR_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={`appearance-mode-${opt.value}`}
                className={cn(
                  'flex-1 rounded-sm px-2 py-1.5 text-xs transition-colors',
                  colorMode === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-foreground/5'
                )}
                onClick={() => {
                  setColorMode(opt.value);
                  applyColorMode(opt.value);
                  void configuration.update('theme.colorMode', opt.value);
                }}
              >
                {defaultL10n.t(opt.labelKey, opt.fallback)}
              </button>
            ))}
          </div>
        </label>

        <label className="block text-xs">
          <span className="mb-1.5 block text-muted-foreground">
            {defaultL10n.t('settings.appearance.colorTheme', 'Color theme')}
          </span>
          <ColorThemeSelect
            value={colorTheme}
            onChange={(id) => {
              setColorTheme(id);
              void persistTheme({ colorTheme: id });
            }}
          />
        </label>
      </div>
    </section>
  );
}
