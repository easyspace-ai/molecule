import { cn } from '../../lib/utils.js';

export interface SashHandleProps {
  axis: 'horizontal' | 'vertical';
  className?: string;
  'data-testid'?: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
}

export function SashHandle({
  axis,
  className,
  'data-testid': testId,
  onPointerDown,
  onMouseDown,
  onTouchStart,
  valueNow,
  valueMin,
  valueMax,
}: SashHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-valuenow={valueNow}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      data-testid={testId}
      data-axis={axis}
      className={cn(
        'mo-sash relative z-[var(--z-local)] shrink-0 touch-none bg-transparent transition-colors hover:bg-accent/40 active:bg-accent/60',
        axis === 'horizontal'
          ? 'w-[var(--ide-sash-size)] cursor-col-resize'
          : 'h-[var(--ide-sash-size)] cursor-row-resize',
        className
      )}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  );
}
