import type { WorkbenchState } from './store.js';

export const LAYOUT_STORAGE_KEY = 'molecule:layout';

export interface PersistedLayout {
  sidebarVisible?: boolean;
  auxiliaryBarVisible?: boolean;
  panelVisible?: boolean;
  menuBarVisible?: boolean;
  statusBarVisible?: boolean;
  sidebarWidth?: number;
  auxiliaryWidth?: number;
  panelHeight?: number;
}

export function readPersistedLayout(): PersistedLayout | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLayout;
  } catch {
    return null;
  }
}

export function writePersistedLayout(state: Pick<
  WorkbenchState,
  | 'sidebarVisible'
  | 'auxiliaryBarVisible'
  | 'panelVisible'
  | 'menuBarVisible'
  | 'statusBarVisible'
  | 'sidebarWidth'
  | 'auxiliaryWidth'
  | 'panelHeight'
>): void {
  if (typeof sessionStorage === 'undefined') return;
  const payload: PersistedLayout = {
    sidebarVisible: state.sidebarVisible,
    auxiliaryBarVisible: state.auxiliaryBarVisible,
    panelVisible: state.panelVisible,
    menuBarVisible: state.menuBarVisible,
    statusBarVisible: state.statusBarVisible,
    sidebarWidth: state.sidebarWidth,
    auxiliaryWidth: state.auxiliaryWidth,
    panelHeight: state.panelHeight,
  };
  sessionStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
}

export function applyPersistedLayout(
  persisted: PersistedLayout,
  apply: Pick<
    WorkbenchState,
    | 'setSidebarVisible'
    | 'setAuxiliaryBarVisible'
    | 'setPanelVisible'
    | 'setMenuBarVisible'
    | 'setStatusBarVisible'
    | 'setSidebarWidth'
    | 'setAuxiliaryWidth'
    | 'setPanelHeight'
  >
): void {
  if (persisted.sidebarVisible !== undefined) apply.setSidebarVisible(persisted.sidebarVisible);
  if (persisted.auxiliaryBarVisible !== undefined) {
    apply.setAuxiliaryBarVisible(persisted.auxiliaryBarVisible);
  }
  if (persisted.panelVisible !== undefined) apply.setPanelVisible(persisted.panelVisible);
  if (persisted.menuBarVisible !== undefined) apply.setMenuBarVisible(persisted.menuBarVisible);
  if (persisted.statusBarVisible !== undefined) apply.setStatusBarVisible(persisted.statusBarVisible);
  if (persisted.sidebarWidth !== undefined) apply.setSidebarWidth(persisted.sidebarWidth);
  if (persisted.auxiliaryWidth !== undefined) apply.setAuxiliaryWidth(persisted.auxiliaryWidth);
  if (persisted.panelHeight !== undefined) apply.setPanelHeight(persisted.panelHeight);
}

/** Migrate legacy pixel values from older sessions to percentages. */
export function normalizeLayoutPercent(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (value > 100) {
    if (value <= 560) return Math.round((value / 1400) * 1000) / 10;
    if (value <= 720) return Math.round((value / 1400) * 1000) / 10;
    return Math.round((value / 800) * 1000) / 10;
  }
  return value;
}
