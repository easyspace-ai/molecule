import { useCallback, useEffect, useRef } from 'react';

type Direction = 'horizontal' | 'vertical';

export interface UsePaneResizeOptions {
  direction: Direction;
  /** Minimum size as percentage of container (default 10). */
  minPercent?: number;
  /** Maximum size as percentage of container (default 50). */
  maxPercent?: number;
  invert?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  onResize: (percent: number) => void;
}

interface ResizeState {
  isResizing: boolean;
  containerStart: number;
  containerSize: number;
  rafId: number | undefined;
}

/**
 * Percentage-based pane resize with RAF smoothing and touch support.
 * Inspired by Pyxis usePaneResize; adapted for single-pane sizing.
 */
export function usePaneResize(options: UsePaneResizeOptions) {
  const { direction, minPercent = 10, maxPercent = 50, invert = false, onResize, containerRef } =
    options;

  const stateRef = useRef<ResizeState>({
    isResizing: false,
    containerStart: 0,
    containerSize: 0,
    rafId: undefined,
  });

  const mouseMoveHandler = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandler = useRef<(() => void) | null>(null);
  const touchMoveHandler = useRef<((e: TouchEvent) => void) | null>(null);
  const touchEndHandler = useRef<(() => void) | null>(null);

  const handleStop = useCallback(() => {
    const state = stateRef.current;
    if (!state.isResizing) return;

    state.isResizing = false;

    if (state.rafId !== undefined) {
      cancelAnimationFrame(state.rafId);
      state.rafId = undefined;
    }

    if (mouseMoveHandler.current) {
      document.removeEventListener('mousemove', mouseMoveHandler.current);
    }
    if (mouseUpHandler.current) {
      document.removeEventListener('mouseup', mouseUpHandler.current);
    }
    if (touchMoveHandler.current) {
      document.removeEventListener('touchmove', touchMoveHandler.current);
    }
    if (touchEndHandler.current) {
      document.removeEventListener('touchend', touchEndHandler.current);
    }

    document.body.classList.remove(
      direction === 'horizontal' ? 'mo-resize-col' : 'mo-resize-row'
    );
    document.body.style.userSelect = '';
  }, [direction]);

  useEffect(() => () => handleStop(), [handleStop]);

  const startResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const state = stateRef.current;
      state.isResizing = true;
      state.containerStart = direction === 'horizontal' ? containerRect.left : containerRect.top;
      state.containerSize =
        direction === 'horizontal' ? containerRect.width : containerRect.height;

      if (state.containerSize <= 0) return;

      document.body.classList.add(
        direction === 'horizontal' ? 'mo-resize-col' : 'mo-resize-row'
      );
      document.body.style.userSelect = 'none';

      const handleMove = (clientX: number, clientY: number) => {
        const st = stateRef.current;
        if (st.rafId !== undefined) cancelAnimationFrame(st.rafId);

        st.rafId = requestAnimationFrame(() => {
          const pos = direction === 'horizontal' ? clientX : clientY;
          let relativePos = pos - st.containerStart;
          if (invert) {
            relativePos = st.containerSize - relativePos;
          }

          const minPx = (minPercent * st.containerSize) / 100;
          const maxPx = (maxPercent * st.containerSize) / 100;
          const clamped = Math.max(minPx, Math.min(relativePos, maxPx));
          const percent = (clamped / st.containerSize) * 100;

          onResize(Math.round(percent * 10) / 10);
          st.rafId = undefined;
        });
      };

      mouseMoveHandler.current = (ev: MouseEvent) => {
        ev.preventDefault();
        handleMove(ev.clientX, ev.clientY);
      };
      mouseUpHandler.current = () => handleStop();

      touchMoveHandler.current = (ev: TouchEvent) => {
        ev.preventDefault();
        const touch = ev.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
      };
      touchEndHandler.current = () => handleStop();

      document.addEventListener('mousemove', mouseMoveHandler.current);
      document.addEventListener('mouseup', mouseUpHandler.current);
      document.addEventListener('touchmove', touchMoveHandler.current, { passive: false });
      document.addEventListener('touchend', touchEndHandler.current);
    },
    [containerRef, direction, invert, minPercent, maxPercent, onResize, handleStop]
  );

  return { startResize };
}
