import type { ThemeContribution } from '@jiulimiai/plugin-api';

import {
  getMonacoTheme,
  getShikiTheme,
  isDarkOnlyTheme,
  isScenicTheme,
  migrateLegacyThemeId,
  resolveColorMode,
  resolveIsDark,
  themeToCSS,
  type ColorMode,
  type ThemeState,
} from './theme-config.js';
import { getDefaultThemeState, getThemePreset, THEME_PRESETS } from './theme-presets.js';

export type ThemeChangeHandler = (state: ThemeState, monacoTheme: string, shikiTheme: string) => void;

export const THEME_STORAGE_KEY = 'molecule:theme';

const STYLE_ID = 'molecule-theme-overrides';

let onThemeChange: ThemeChangeHandler | null = null;
let currentState: ThemeState = getDefaultThemeState();
let systemPreferenceListener: (() => void) | null = null;

export function getCurrentThemeId(): string {
  return currentState.colorTheme;
}

export function getCurrentColorMode(): ColorMode {
  return currentState.colorMode;
}

export function getThemeState(): ThemeState {
  return { ...currentState };
}

function normalizeState(raw: Partial<ThemeState> & { colorTheme?: string }): ThemeState {
  const colorTheme = raw.colorTheme ?? 'default';
  const preset = getThemePreset(colorTheme);
  if (!preset) {
    return getDefaultThemeState();
  }
  return {
    colorTheme,
    colorMode: raw.colorMode ?? 'system',
  };
}

export function readPersistedTheme(): ThemeState | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    if (parsed.colorTheme) {
      return normalizeState(parsed);
    }
  } catch {
    /* legacy plain string */
  }

  return normalizeState(migrateLegacyThemeId(raw));
}

/** @deprecated Use readPersistedTheme */
export function readPersistedThemeId(): string | null {
  return readPersistedTheme()?.colorTheme ?? null;
}

export function writePersistedTheme(state: ThemeState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
}

/** @deprecated Use writePersistedTheme */
export function writePersistedThemeId(id: string): void {
  writePersistedTheme({ ...currentState, colorTheme: id });
}

export function setInitialTheme(state: ThemeState | string): void {
  if (typeof state === 'string') {
    currentState = normalizeState(migrateLegacyThemeId(state));
  } else {
    currentState = normalizeState(state);
  }
}

function injectThemeCSS(preset: ReturnType<typeof getThemePreset>, isDark: boolean): void {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  if (!preset || preset.id === 'default') {
    styleEl.textContent = '';
    return;
  }

  const cssVars = themeToCSS(preset, isDark);
  styleEl.textContent = cssVars ? `:root {\n  ${cssVars}\n}` : '';
}

function applyDomTheme(state: ThemeState): void {
  const preset = getThemePreset(state.colorTheme);
  const isDark = resolveIsDark(preset, state.colorMode);
  const resolvedMode = isDark ? 'dark' : 'light';
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedMode);

  if (state.colorTheme && state.colorTheme !== 'default') {
    root.dataset.theme = state.colorTheme;
  } else {
    delete root.dataset.theme;
  }

  if (isScenicTheme(preset)) {
    root.dataset.scenic = 'true';
    if (preset?.backgroundImage) {
      root.style.setProperty('--background-image', `url("${preset.backgroundImage}")`);
    }
  } else {
    delete root.dataset.scenic;
    root.style.removeProperty('--background-image');
  }

  const themeModeUnsupported =
    preset?.supportedModes &&
    preset.supportedModes.length > 0 &&
    !preset.supportedModes.includes(resolveColorMode(state.colorMode));

  if (themeModeUnsupported || (state.colorMode === 'system' && isDarkOnlyTheme(preset))) {
    root.dataset.themeMismatch = 'true';
  } else {
    delete root.dataset.themeMismatch;
  }

  root.style.colorScheme = isDark ? 'dark' : 'light';
  injectThemeCSS(preset, isDark);
}

function ensureSystemPreferenceListener(): void {
  if (typeof window === 'undefined' || systemPreferenceListener) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (currentState.colorMode === 'system') {
      applyDomTheme(currentState);
      notifyThemeChange();
    }
  };
  mediaQuery.addEventListener('change', handler);
  systemPreferenceListener = () => mediaQuery.removeEventListener('change', handler);
}

function notifyThemeChange(): void {
  const preset = getThemePreset(currentState.colorTheme);
  const isDark = resolveIsDark(preset, currentState.colorMode);
  const monacoTheme = getMonacoTheme(isDark);
  const shikiTheme = getShikiTheme(preset?.shikiTheme, isDark);
  onThemeChange?.(currentState, monacoTheme, shikiTheme);
}

export const THEMES: ThemeContribution[] = THEME_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.name,
  uiTheme: preset.supportedModes?.length === 1 && preset.supportedModes[0] === 'dark' ? 'vs-dark' : 'vs',
}));

export function setThemeChangeHandler(handler: ThemeChangeHandler): void {
  onThemeChange = handler;
}

export function applyTheme(colorThemeOrState: string | ThemeState, colorMode?: ColorMode): void {
  const state: ThemeState =
    typeof colorThemeOrState === 'string'
      ? normalizeState({ colorTheme: colorThemeOrState, colorMode: colorMode ?? currentState.colorMode })
      : normalizeState(colorThemeOrState);

  currentState = state;
  writePersistedTheme(state);
  applyDomTheme(state);
  ensureSystemPreferenceListener();
  notifyThemeChange();

  window.dispatchEvent(
    new CustomEvent('molecule:theme-changed', {
      detail: { id: state.colorTheme, colorMode: state.colorMode },
    })
  );
}

export function applyColorMode(colorMode: ColorMode): void {
  applyTheme({ ...currentState, colorMode });
}

export {
  getMonacoTheme,
  getShikiTheme,
  migrateLegacyThemeId,
  resolveIsDark,
  type ColorMode,
  type ThemeState,
} from './theme-config.js';
export { THEME_PRESETS } from './theme-presets.js';
