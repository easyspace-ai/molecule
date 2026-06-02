import type { ReactNode } from 'react';

import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip.js';

export interface ActivityBarItem {
  id: string;
  title: string;
  icon: ReactNode;
  active?: boolean;
  'data-testid'?: string;
  onClick: () => void;
}

export interface ActivityBarProps {
  items: ActivityBarItem[];
  footer?: ReactNode;
  className?: string;
}

export function ActivityBar({ items, footer, className }: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <nav
        className={cn(
          'flex w-[var(--ide-activitybar-width)] shrink-0 flex-col border-r border-border bg-foreground/5',
          className
        )}
        aria-label="Activity Bar"
      >
        <div className="flex flex-1 flex-col items-center gap-0.5 py-1">
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    'size-10 rounded-none text-muted-foreground hover:text-foreground',
                    item.active && 'border-l-2 border-l-accent bg-foreground/10 text-foreground'
                  )}
                  title={item.title}
                  aria-label={item.title}
                  data-testid={item['data-testid'] ?? `activity-${item.id}`}
                  onClick={item.onClick}
                >
                  {item.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        {footer ? <div className="flex flex-col items-center pb-1">{footer}</div> : null}
      </nav>
    </TooltipProvider>
  );
}
