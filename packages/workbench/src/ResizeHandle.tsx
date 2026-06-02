/** Percentage bounds for sidebar width. */
export const SIDEBAR_MIN = 10;
export const SIDEBAR_MAX = 40;
/** Percentage bounds for auxiliary bar width. */
export const AUXILIARY_MIN = 15;
export const AUXILIARY_MAX = 45;
/** Percentage bounds for panel height. */
export const PANEL_MIN = 10;
export const PANEL_MAX = 55;

export { usePaneResize, type UsePaneResizeOptions } from './usePaneResize.js';

/** @deprecated Use Workbench built-in sash — kept for API compatibility. */
export function ResizeHandle(): null {
  return null;
}
