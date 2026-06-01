import { useCallback } from 'react';

import { usePaneResize } from './usePaneResize.js';

/** Percentage bounds for sidebar width. */
export const SIDEBAR_MIN = 10;
export const SIDEBAR_MAX = 40;
/** Percentage bounds for auxiliary bar width. */
export const AUXILIARY_MIN = 15;
export const AUXILIARY_MAX = 45;
/** Percentage bounds for panel height. */
export const PANEL_MIN = 10;
export const PANEL_MAX = 55;

export interface ResizeHandleProps {
  axis: 'horizontal' | 'vertical';
  /** When true, drag toward start shrinks the trailing pane (auxiliary bar). */
  invert?: boolean;
  getPercent: () => number;
  onResize: (percent: number) => void;
  minPercent: number;
  maxPercent: number;
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  'data-testid'?: string;
}

export function ResizeHandle({
  axis,
  invert = false,
  getPercent,
  onResize,
  minPercent,
  maxPercent,
  containerRef,
  className = '',
  'data-testid': testId,
}: ResizeHandleProps) {
  const { startResize } = usePaneResize({
    direction: axis === 'horizontal' ? 'horizontal' : 'vertical',
    minPercent,
    maxPercent,
    invert,
    containerRef,
    onResize,
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      startResize(e);
    },
    [startResize]
  );

  return (
    <div
      role="separator"
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(getPercent())}
      aria-valuemin={minPercent}
      aria-valuemax={maxPercent}
      className={`mo-sash mo-sash--${axis} ${className}`.trim()}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onMouseDown={startResize}
      onTouchStart={startResize}
    />
  );
}
