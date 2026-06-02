/**
 * Theme configuration — adapted from Craft Agent (@craft-agent/shared/config/theme)
 */

export type CSSColor = string;

export interface ThemeColors {
  background?: CSSColor;
  foreground?: CSSColor;
  accent?: CSSColor;
  info?: CSSColor;
  success?: CSSColor;
  destructive?: CSSColor;
}

export interface SurfaceColors {
  paper?: CSSColor;
  navigator?: CSSColor;
  input?: CSSColor;
  popover?: CSSColor;
  popoverSolid?: CSSColor;
}

export type ThemeMode = 'solid' | 'scenic';

export interface ThemeOverrides extends ThemeColors, SurfaceColors {
  dark?: ThemeColors & SurfaceColors;
  mode?: ThemeMode;
  backgroundImage?: string;
}

export interface ShikiThemeConfig {
  light?: string;
  dark?: string;
}

export interface ThemePreset extends ThemeOverrides {
  id: string;
  name: string;
  description?: string;
  supportedModes?: ('light' | 'dark')[];
  shikiTheme?: ShikiThemeConfig;
}

export type ColorMode = 'system' | 'light' | 'dark';

export interface ThemeState {
  colorTheme: string;
  colorMode: ColorMode;
}

export const DEFAULT_SHIKI_THEME: ShikiThemeConfig = {
  light: 'github-light',
  dark: 'github-dark',
};

function hexToRgbValues(hex: string, darkenFactor = 1): string | null {
  let r: number;
  let g: number;
  let b: number;

  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (match) {
    r = parseInt(match[1]!, 16);
    g = parseInt(match[2]!, 16);
    b = parseInt(match[3]!, 16);
  } else {
    const shortMatch = hex.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
    if (!shortMatch) return null;
    r = parseInt(shortMatch[1]! + shortMatch[1]!, 16);
    g = parseInt(shortMatch[2]! + shortMatch[2]!, 16);
    b = parseInt(shortMatch[3]! + shortMatch[3]!, 16);
  }

  r = Math.round(r * darkenFactor);
  g = Math.round(g * darkenFactor);
  b = Math.round(b * darkenFactor);
  return `${r}, ${g}, ${b}`;
}

export function themeToCSS(theme: ThemeOverrides, isDark: boolean): string {
  const vars: string[] = [];
  const colors: ThemeColors & SurfaceColors =
    isDark && theme.dark ? { ...theme, ...theme.dark } : theme;

  if (colors.background) vars.push(`--background: ${colors.background};`);
  if (colors.foreground) {
    vars.push(`--foreground: ${colors.foreground};`);
    const rgbValues = hexToRgbValues(colors.foreground);
    if (rgbValues) vars.push(`--foreground-rgb: ${rgbValues};`);
  }
  if (colors.accent) {
    vars.push(`--accent: ${colors.accent};`);
    const rgbValues = hexToRgbValues(colors.accent, 0.7);
    if (rgbValues) vars.push(`--accent-rgb: ${rgbValues};`);
  }
  if (colors.info) vars.push(`--info: ${colors.info};`);
  if (colors.success) vars.push(`--success: ${colors.success};`);
  if (colors.destructive) vars.push(`--destructive: ${colors.destructive};`);

  const bg = colors.background || 'var(--background)';
  vars.push(`--paper: ${colors.paper || bg};`);
  vars.push(`--navigator: ${colors.navigator || bg};`);
  vars.push(`--input: ${colors.input || bg};`);
  vars.push(`--popover: ${colors.popover || bg};`);
  vars.push(`--popover-solid: ${colors.popoverSolid || colors.popover || bg};`);

  return vars.join('\n  ');
}

export function getShikiTheme(
  shikiConfig: ShikiThemeConfig | undefined,
  isDark: boolean
): string {
  const config = shikiConfig || DEFAULT_SHIKI_THEME;
  return isDark ? config.dark || 'github-dark' : config.light || 'github-light';
}

export function getMonacoTheme(isDark: boolean): 'vs' | 'vs-dark' {
  return isDark ? 'vs-dark' : 'vs';
}

export function getSystemPreference(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function resolveColorMode(colorMode: ColorMode): 'light' | 'dark' {
  return colorMode === 'system' ? getSystemPreference() : colorMode;
}

export function isDarkOnlyTheme(preset: ThemePreset | undefined): boolean {
  return preset?.supportedModes?.length === 1 && preset.supportedModes[0] === 'dark';
}

export function isScenicTheme(preset: ThemePreset | undefined): boolean {
  return preset?.mode === 'scenic' && !!preset.backgroundImage;
}

export function resolveIsDark(
  preset: ThemePreset | undefined,
  colorMode: ColorMode
): boolean {
  if (isScenicTheme(preset) || isDarkOnlyTheme(preset)) return true;
  return resolveColorMode(colorMode) === 'dark';
}

/** Map legacy VS Code theme ids to Craft-style state. */
export function migrateLegacyThemeId(id: string): ThemeState {
  switch (id) {
    case 'vs-dark':
      return { colorTheme: 'default', colorMode: 'dark' };
    case 'vs-light':
      return { colorTheme: 'default', colorMode: 'light' };
    case 'hc-black':
      return { colorTheme: 'dracula', colorMode: 'dark' };
    default:
      return { colorTheme: id, colorMode: 'system' };
  }
}
