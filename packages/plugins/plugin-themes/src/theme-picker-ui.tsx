import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@easyspace/ui';
import { useEffect, useState } from 'react';

import { THEME_PRESETS } from './theme-presets.js';
import { applyTheme, getCurrentThemeId, getThemeState } from './themes-data.js';

export function ThemePickerHost() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(getCurrentThemeId());

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
    return () => window.removeEventListener('molecule:show-theme-picker', show);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div data-testid="theme-picker">
        <CommandInput placeholder="Search color themes…" />
        <CommandList>
          <CommandEmpty>No themes found.</CommandEmpty>
          <CommandGroup heading="Color Theme">
            {THEME_PRESETS.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.name} ${t.description ?? ''}`}
                data-testid={`theme-picker-${t.id}`}
                onSelect={() => {
                  applyTheme({ ...getThemeState(), colorTheme: t.id });
                  setOpen(false);
                }}
              >
                {t.name}
                {activeId === t.id ? ' ✓' : ''}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
