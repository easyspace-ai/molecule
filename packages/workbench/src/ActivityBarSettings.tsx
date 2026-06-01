import { defaultL10n } from '@easyspace/plugin-api';
import { useEffect, useMemo, useRef, useState } from 'react';

export type SettingsMenuAction = 'commandPalette' | 'settings' | 'colorTheme';

export interface ActivityBarSettingsProps {
  onAction: (action: SettingsMenuAction) => void;
}

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function shortcut(keys: string): string {
  return keys.replace('Mod', isMac ? '⌘' : 'Ctrl');
}

function menuItems(): { id: SettingsMenuAction; label: string; keys: string }[] {
  const t = defaultL10n.t.bind(defaultL10n);
  return [
    { id: 'commandPalette', label: t('settings.commandPalette'), keys: shortcut('Mod+Shift+P') },
    { id: 'settings', label: t('settings.openSettings'), keys: shortcut('Mod+,') },
    { id: 'colorTheme', label: t('settings.colorTheme'), keys: shortcut('Mod+K') },
  ];
}

export function ActivityBarSettings({ onAction }: ActivityBarSettingsProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [localeTick, setLocaleTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => menuItems(), [localeTick]);

  const run = (action: SettingsMenuAction) => {
    setOpen(false);
    onAction(action);
  };

  useEffect(() => {
    const onLocale = () => setLocaleTick((n) => n + 1);
    window.addEventListener('molecule:locale-changed', onLocale);
    return () => window.removeEventListener('molecule:locale-changed', onLocale);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((i) => (i + 1) % items.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((i) => (i - 1 + items.length) % items.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        run(items[focusIndex]!.id);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, focusIndex, items, onAction]);

  return (
    <div className="mo-activity-bar__footer" ref={rootRef} data-testid="activity-bar-footer">
      <button
        type="button"
        className="mo-activity-bar__item"
        title="Account"
        aria-label="Account"
        data-testid="activity-account"
      >
        <span className="mo-activity-bar__icon-svg" aria-hidden>
          ◉
        </span>
      </button>
      <div className="mo-activity-bar__settings-wrap">
        <button
          type="button"
          className={`mo-activity-bar__item${open ? ' mo-activity-bar__item--active' : ''}`}
          title="Manage"
          aria-label="Settings"
          aria-expanded={open}
          aria-haspopup="menu"
          data-testid="activity-settings"
          onClick={() => {
            setOpen((v) => !v);
            setFocusIndex(0);
          }}
        >
          <span className="mo-activity-bar__icon-svg mo-activity-bar__icon-svg--gear" aria-hidden>
            ⚙
          </span>
        </button>
        {open && (
          <div className="mo-settings-menu" role="menu" data-testid="settings-menu">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="mo-settings-menu__item"
                data-testid={`settings-menu-${item.id}`}
                tabIndex={index === focusIndex ? 0 : -1}
                onClick={() => run(item.id)}
              >
                <span>{item.label}</span>
                <span className="mo-settings-menu__keys">{item.keys}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
