import { useCallback, useEffect, useRef } from 'react';

type Direction = 'horizontal' | 'vertical';

/** VS Code-style dead zone before resize activates (px). */
const DRAG_THRESHOLD_PX = 5;

export interface UsePaneResizeOptions {
  direction: Direction;
  /** Minimum size as percentage of container (default 10). */
  minPercent?: number;
  /** Maximum size as percentage of container (default 50). */
  maxPercent?: number;
  invert?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  /** Apply size to pane DOM during drag — avoid React/Zustand updates per frame. */
  onPreview: (percent: number) => void;
  /** Commit final size on pointer up (Zustand + layout persistence). */
  onCommit: (percent: number) => void;
}

interface ResizeState {
  pointerId: number;
  startX: number;
  startY: number;
  containerStart: number;
  containerSize: number;
  lastPercent: number;
  dragging: boolean;
  rafId: number | undefined;
  pendingX: number;
  pendingY: number;
  sashTarget: HTMLElement;
}

const OVERLAY_CLASS = 'mo-resize-overlay';

function ensureOverlay(): HTMLDivElement {
  let overlay = document.querySelector<HTMLDivElement>(`.${OVERLAY_CLASS}`);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }
  return overlay;
}

function removeOverlay(): void {
  document.querySelector(`.${OVERLAY_CLASS}`)?.remove();
}

function axisDelta(direction: Direction, st: ResizeState, x: number, y: number): number {
  return direction === 'horizontal' ? Math.abs(x - st.startX) : Math.abs(y - st.startY);
}

/**
 * Percentage-based pane resize: drag threshold, deferred pointer capture,
 * RAF-coalesced DOM preview, single store commit on release.
 */
export function usePaneResize(options: UsePaneResizeOptions) {
  const {
    direction,
    minPercent = 10,
    maxPercent = 50,
    invert = false,
    containerRef,
    onPreview,
    onCommit,
  } = options;

  const stateRef = useRef<ResizeState | null>(null);
  const onPreviewRef = useRef(onPreview);
  const onCommitRef = useRef(onCommit);
  const directionRef = useRef(direction);

  useEffect(() => {
    onPreviewRef.current = onPreview;
    onCommitRef.current = onCommit;
    directionRef.current = direction;
  }, [onPreview, onCommit, direction]);

  const calcPercent = useCallback(
    (clientX: number, clientY: number, st: ResizeState): number => {
      const dir = directionRef.current;
      const pos = dir === 'horizontal' ? clientX : clientY;
      let relativePos = pos - st.containerStart;
      if (invert) {
        relativePos = st.containerSize - relativePos;
      }
      const minPx = (minPercent * st.containerSize) / 100;
      const maxPx = (maxPercent * st.containerSize) / 100;
      const clamped = Math.max(minPx, Math.min(relativePos, maxPx));
      return Math.round((clamped / st.containerSize) * 1000) / 10;
    },
    [invert, minPercent, maxPercent]
  );

  const calcPercentRef = useRef(calcPercent);
  calcPercentRef.current = calcPercent;

  const flushPreview = useCallback(() => {
    const st = stateRef.current;
    if (!st?.dragging) return;
    st.rafId = undefined;
    const percent = calcPercentRef.current(st.pendingX, st.pendingY, st);
    if (percent === st.lastPercent) return;
    st.lastPercent = percent;
    onPreviewRef.current(percent);
  }, []);

  const schedulePreview = useCallback((clientX: number, clientY: number) => {
    const st = stateRef.current;
    if (!st?.dragging) return;
    st.pendingX = clientX;
    st.pendingY = clientY;
    if (st.rafId !== undefined) return;
    st.rafId = requestAnimationFrame(flushPreview);
  }, [flushPreview]);

  const clearDragChrome = useCallback(() => {
    const dir = directionRef.current;
    document.body.classList.remove(
      'mo-resizing',
      dir === 'horizontal' ? 'mo-resize-col' : 'mo-resize-row'
    );
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.body.style.touchAction = '';
    removeOverlay();
  }, []);

  const finishSessionRef = useRef<(commit: boolean) => void>(() => {});

  const enterDragging = useCallback((st: ResizeState, ev: PointerEvent) => {
    st.dragging = true;
    ev.preventDefault();
    ev.stopPropagation();

    try {
      st.sashTarget.setPointerCapture(st.pointerId);
    } catch {
      finishSessionRef.current(false);
      return;
    }

    const dir = directionRef.current;
    document.body.classList.add(
      'mo-resizing',
      dir === 'horizontal' ? 'mo-resize-col' : 'mo-resize-row'
    );
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
    document.body.style.cursor = dir === 'horizontal' ? 'col-resize' : 'row-resize';
    ensureOverlay();

    const percent = calcPercentRef.current(ev.clientX, ev.clientY, st);
    st.lastPercent = percent;
    onPreviewRef.current(percent);
  }, []);

  const handlePointerMoveRef = useRef<(ev: PointerEvent) => void>(() => {});
  const handlePointerUpRef = useRef<(ev: PointerEvent) => void>(() => {});

  handlePointerMoveRef.current = (ev: PointerEvent) => {
    const st = stateRef.current;
    if (!st || ev.pointerId !== st.pointerId) return;

    st.pendingX = ev.clientX;
    st.pendingY = ev.clientY;

    if (!st.dragging) {
      if (axisDelta(directionRef.current, st, ev.clientX, ev.clientY) < DRAG_THRESHOLD_PX) {
        return;
      }
      enterDragging(st, ev);
      if (!st.dragging) return;
    }

    ev.preventDefault();
    schedulePreview(ev.clientX, ev.clientY);
  };

  handlePointerUpRef.current = (ev: PointerEvent) => {
    const st = stateRef.current;
    if (!st || ev.pointerId !== st.pointerId) return;

    st.pendingX = ev.clientX;
    st.pendingY = ev.clientY;

    if (st.dragging) {
      ev.preventDefault();
      finishSessionRef.current(true);
    } else {
      finishSessionRef.current(false);
    }
  };

  const onDocumentPointerMove = useCallback((ev: PointerEvent) => {
    handlePointerMoveRef.current(ev);
  }, []);

  const onDocumentPointerUp = useCallback((ev: PointerEvent) => {
    handlePointerUpRef.current(ev);
  }, []);

  finishSessionRef.current = (commit: boolean) => {
    const st = stateRef.current;
    if (!st) return;

    if (st.rafId !== undefined) {
      cancelAnimationFrame(st.rafId);
      st.rafId = undefined;
    }

    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerUp);

    if (st.dragging && st.sashTarget.hasPointerCapture(st.pointerId)) {
      try {
        st.sashTarget.releasePointerCapture(st.pointerId);
      } catch {
        /* already released */
      }
    }

    if (commit && st.dragging) {
      const finalPercent = calcPercentRef.current(st.pendingX, st.pendingY, st);
      onPreviewRef.current(finalPercent);
      onCommitRef.current(finalPercent);
    }

    if (st.dragging) {
      clearDragChrome();
    }

    stateRef.current = null;
  };

  useEffect(
    () => () => {
      finishSessionRef.current(false);
    },
    []
  );

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || stateRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerSize =
        directionRef.current === 'horizontal' ? containerRect.width : containerRect.height;
      if (containerSize <= 0) return;

      const containerStart =
        directionRef.current === 'horizontal' ? containerRect.left : containerRect.top;

      stateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        containerStart,
        containerSize,
        lastPercent: NaN,
        dragging: false,
        rafId: undefined,
        pendingX: e.clientX,
        pendingY: e.clientY,
        sashTarget: e.currentTarget,
      };

      document.addEventListener('pointermove', onDocumentPointerMove);
      document.addEventListener('pointerup', onDocumentPointerUp);
      document.addEventListener('pointercancel', onDocumentPointerUp);
    },
    [containerRef, onDocumentPointerMove, onDocumentPointerUp]
  );

  return { startResize };
}
