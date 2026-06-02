import { cn } from '../../lib/utils.js';
import { Separator } from '../ui/separator.js';

export interface StatusBarItem {
  id: string;
  text: string;
  alignment?: 'left' | 'right';
}

export interface StatusBarProps {
  leftItems?: StatusBarItem[];
  rightItems?: StatusBarItem[];
  className?: string;
}

export function StatusBar({ leftItems = [], rightItems = [], className }: StatusBarProps) {
  return (
    <footer
      className={cn(
        'flex h-[var(--ide-statusbar-height)] shrink-0 items-center justify-between border-t border-border bg-accent px-2 text-[11px] text-background',
        className
      )}
      data-testid="status-bar"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        {leftItems.map((item, i) => (
          <span key={item.id} className="flex items-center gap-2 truncate" data-testid={`status-${item.id}`}>
            {i > 0 ? <Separator orientation="vertical" className="h-3 bg-background/30" /> : null}
            {item.text}
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rightItems.map((item, i) => (
          <span key={item.id} className="flex items-center gap-2" data-testid={`status-${item.id}`}>
            {i > 0 ? <Separator orientation="vertical" className="h-3 bg-background/30" /> : null}
            {item.text}
          </span>
        ))}
      </div>
    </footer>
  );
}
