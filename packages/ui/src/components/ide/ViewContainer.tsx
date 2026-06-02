import { forwardRef, type ReactNode } from 'react';

import { cn } from '../../lib/utils.js';

export interface ViewContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const ViewContainer = forwardRef<HTMLElement, ViewContainerProps>(function ViewContainer(
  { title, children, className, contentClassName, style, 'data-testid': testId },
  ref
) {
  return (
    <aside
      ref={ref}
      className={cn('flex min-h-0 min-w-0 flex-col bg-background', className)}
      style={style}
      data-testid={testId}
    >
      <div className="flex h-[var(--ide-tab-height)] shrink-0 items-center border-b border-border px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-hidden', contentClassName)}>{children}</div>
    </aside>
  );
});

export interface PanelContainerProps extends ViewContainerProps {
  tabs?: ReactNode;
}

export const PanelContainer = forwardRef<HTMLDivElement, PanelContainerProps>(
  function PanelContainer(
    { title, tabs, children, className, contentClassName, style, 'data-testid': testId },
    ref
  ) {
  return (
    <div
      ref={ref}
      className={cn('flex min-h-0 flex-col bg-background', className)}
      style={style}
      data-testid={testId}
    >
      {tabs ?? (
        <div className="flex h-[var(--ide-tab-height)] shrink-0 items-center border-b border-border px-3 text-xs">
          {title}
        </div>
      )}
      <div className={cn('min-h-0 flex-1 overflow-auto p-2 font-mono text-xs', contentClassName)}>
        {children}
      </div>
    </div>
  );
  }
);
