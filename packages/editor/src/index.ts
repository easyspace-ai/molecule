export { MonacoEditor, type MonacoEditorProps } from './MonacoEditor.js';
export { EditorArea } from './EditorPaneHost.js';
export { EditorPaneHost } from './EditorPaneHost.js';
export {
  useEditorStore,
  type EditorStoreState,
  type OpenTab,
  type EditorPane,
  type SplitDirection,
  type EditorTabKind,
  type ExtensionDetailData,
} from './editor-store.js';
export { ExtensionDetailTab } from './ExtensionDetailTab.js';
export { setupEditorAutoSave } from './useEditorAutoSave.js';
export {
  TAB_SESSION_STORAGE_KEY,
  TAB_SESSION_FILE_PATH,
  captureTabSession,
  createDebouncedWorkspaceTabSessionWriter,
  readTabSession,
  readTabSessionFromWorkspace,
  restoreTabSession,
  writeTabSession,
  type TabSessionSnapshot,
} from './tab-session.js';
