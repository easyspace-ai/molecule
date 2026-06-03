import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Icon_Settings,
  Icon_User,
} from '@jiulimiai/ui';
import { defaultL10n } from '@jiulimiai/plugin-api';
import { useEffect, useMemo, useState } from 'react';

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
  const [localeTick, setLocaleTick] = useState(0);
  const items = useMemo(() => menuItems(), [localeTick]);

  useEffect(() => {
    const onLocale = () => setLocaleTick((n) => n + 1);
    window.addEventListener('molecule:locale-changed', onLocale);
    return () => window.removeEventListener('molecule:locale-changed', onLocale);
  }, []);

  const run = (action: SettingsMenuAction) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col items-center gap-0.5" data-testid="activity-bar-footer">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 rounded-none text-muted-foreground"
              title="Account"
              aria-label="Account"
              data-testid="activity-account"
            >
              <Icon_User className="size-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Account</TooltipContent>
        </Tooltip>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 rounded-none text-muted-foreground data-[state=open]:bg-foreground/10"
              title="Manage"
              aria-label="Settings"
              data-testid="activity-settings"
            >
              <Icon_Settings className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="min-w-52" data-testid="settings-menu">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                data-testid={`settings-menu-${item.id}`}
                onClick={() => run(item.id)}
                className="flex justify-between gap-4"
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.keys}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
