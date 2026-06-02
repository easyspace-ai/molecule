import type { ReactNode } from 'react';

import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.js';

export interface EditorTabItem {
  id: string;
  label: string;
  dirty?: boolean;
}

export interface EditorTabBarProps {
  tabs: EditorTabItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  className?: string;
}

export function EditorTabBar({ tabs, activeId, onSelect, onClose, className }: EditorTabBarProps) {
  return (
    <div
      className={cn(
        'flex h-[var(--ide-tab-height)] shrink-0 overflow-x-auto border-b border-border bg-foreground/5',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeId === tab.id}
          variant="ghost"
          className={cn(
            'h-full shrink-0 rounded-none border-r border-border px-3 text-xs font-normal',
            activeId === tab.id && 'border-b-2 border-b-accent bg-background text-foreground'
          )}
          onClick={() => onSelect(tab.id)}
        >
          {tab.dirty ? `${tab.label} •` : tab.label}
          {onClose ? (
            <span
              role="button"
              tabIndex={-1}
              className="ml-2 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}

export interface EditorTabContentProps {
  children: ReactNode;
  className?: string;
}

export function EditorTabContent({ children, className }: EditorTabContentProps) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>{children}</div>
  );
}
