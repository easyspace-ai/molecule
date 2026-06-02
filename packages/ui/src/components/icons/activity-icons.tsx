import type { ComponentType, ReactNode } from 'react';

import { Icon_Bot } from './lucide-icons.js';
import { Icon_Calculator } from './lucide-icons.js';
import { Icon_Files } from './lucide-icons.js';
import { Icon_FlaskConical } from './lucide-icons.js';
import { Icon_GitBranch } from './lucide-icons.js';
import { Icon_Puzzle } from './lucide-icons.js';
import { Icon_Search } from './lucide-icons.js';
import { Icon_Settings } from './lucide-icons.js';
import { Icon_Sparkles } from './lucide-icons.js';
import { Icon_SquareCheck } from './lucide-icons.js';
import { Icon_Terminal } from './lucide-icons.js';
import type { IconProps } from './types.js';

/** Semantic activity-bar icon ids used in plugin manifests. */
export type ActivityIconId =
  | 'explorer'
  | 'search'
  | 'scm'
  | 'extensions'
  | 'settings'
  | 'test'
  | 'terminal'
  | 'ai'
  | 'todo'
  | 'calculator'
  | 'sample'
  | 'default';

const ACTIVITY_ICON_MAP: Record<ActivityIconId, ComponentType<IconProps>> = {
  explorer: Icon_Files,
  search: Icon_Search,
  scm: Icon_GitBranch,
  extensions: Icon_Puzzle,
  settings: Icon_Settings,
  test: Icon_FlaskConical,
  terminal: Icon_Terminal,
  ai: Icon_Sparkles,
  todo: Icon_SquareCheck,
  calculator: Icon_Calculator,
  sample: Icon_Bot,
  default: Icon_Files,
};

const LEGACY_ICON_ALIASES: Record<string, ActivityIconId> = {
  '◫': 'explorer',
  '⌕': 'search',
  '⎇': 'scm',
  '⊞': 'extensions',
  '⚙': 'settings',
  '✦': 'ai',
  '☑': 'todo',
  '🧮': 'calculator',
  '◈': 'sample',
};

export function resolveActivityIconId(icon?: string, viewId?: string): ActivityIconId {
  if (icon && icon in ACTIVITY_ICON_MAP) return icon as ActivityIconId;
  if (icon && icon in LEGACY_ICON_ALIASES) return LEGACY_ICON_ALIASES[icon];
  if (viewId === 'explorer') return 'explorer';
  if (viewId === 'search') return 'search';
  if (viewId === 'scm') return 'scm';
  if (viewId === 'extensions') return 'extensions';
  if (viewId === 'settings' || viewId === 'testPane') return viewId === 'testPane' ? 'test' : 'settings';
  if (viewId === 'ai.chat') return 'ai';
  if (viewId?.includes('terminal')) return 'terminal';
  if (viewId?.includes('todo')) return 'todo';
  if (viewId?.includes('calc')) return 'calculator';
  return 'default';
}

export function ActivityIcon({
  icon,
  viewId,
  className = 'size-4',
  ...props
}: IconProps & { icon?: string; viewId?: string }) {
  const id = resolveActivityIconId(icon, viewId);
  const Component = ACTIVITY_ICON_MAP[id];
  return <Component className={className} aria-hidden {...props} />;
}

export function resolveActivityIcon(
  icon?: string,
  viewId?: string,
  className = 'size-4'
): ReactNode {
  if (icon && icon.length <= 2 && !ACTIVITY_ICON_MAP[icon as ActivityIconId] && !(icon in LEGACY_ICON_ALIASES)) {
    return (
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
    );
  }
  return <ActivityIcon icon={icon} viewId={viewId} className={className} />;
}
