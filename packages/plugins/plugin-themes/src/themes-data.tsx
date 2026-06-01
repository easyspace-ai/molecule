import type { ThemeContribution } from '@easyspace/plugin-api';
import { useEffect, useState } from 'react';

export type ThemeChangeHandler = (themeId: string, monacoTheme: string) => void;

export const THEME_STORAGE_KEY = 'molecule:theme';

let onThemeChange: ThemeChangeHandler | null = null;
let currentThemeId = 'vs-dark';

export function getCurrentThemeId(): string {
  return currentThemeId;
}

export function readPersistedThemeId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(THEME_STORAGE_KEY);
}

export function writePersistedThemeId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, id);
}

export function setInitialTheme(id: string): void {
  currentThemeId = id;
}

export const THEMES: ThemeContribution[] = [
  { id: 'vs-dark', label: 'Dark+', uiTheme: 'vs-dark' },
  { id: 'vs-light', label: 'Light+', uiTheme: 'vs' },
  { id: 'hc-black', label: 'High Contrast', uiTheme: 'hc-black' },
];

export function setThemeChangeHandler(handler: ThemeChangeHandler): void {
  onThemeChange = handler;
}

export function applyTheme(id: string): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  currentThemeId = theme.id;
  writePersistedThemeId(theme.id);
  onThemeChange?.(theme.id, theme.uiTheme);
  document.documentElement.dataset.theme = theme.id;
  window.dispatchEvent(new CustomEvent('molecule:theme-changed', { detail: { id: theme.id } }));
}

export function ThemePickerHost() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(currentThemeId);

  useEffect(() => {
    const onTheme = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setActiveId(id);
    };
    window.addEventListener('molecule:theme-changed', onTheme);
    return () => window.removeEventListener('molecule:theme-changed', onTheme);
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('molecule:show-theme-picker', show);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('molecule:show-theme-picker', show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Color Theme"
      data-testid="theme-picker"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        zIndex: 2000,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 400,
          background: 'var(--mo-bg-secondary)',
          border: '1px solid var(--mo-border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--mo-border)',
            fontSize: 11,
            textTransform: 'uppercase',
            color: 'var(--mo-fg-muted)',
          }}
        >
          选择颜色主题
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                data-testid={`theme-picker-${t.id}`}
                onClick={() => {
                  applyTheme(t.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  background: activeId === t.id ? 'var(--mo-accent)' : 'transparent',
                  color: activeId === t.id ? '#fff' : 'inherit',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
