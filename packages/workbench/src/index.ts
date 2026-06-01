export { Workbench, type WorkbenchProps } from './Workbench.js';
export { type SettingsMenuAction } from './ActivityBarSettings.js';
export { EditorTabs, type EditorTab, type EditorTabsProps } from './EditorTabs.js';
export { useWorkbenchStore, type WorkbenchState, type ViewSlot } from './store.js';
export {
  LAYOUT_STORAGE_KEY,
  applyPersistedLayout,
  normalizeLayoutPercent,
  readPersistedLayout,
  writePersistedLayout,
  type PersistedLayout,
} from './layout-persistence.js';
