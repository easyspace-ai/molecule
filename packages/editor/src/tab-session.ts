import type { EditorDocument, WorkspaceAPI } from '@jiulimiai/plugin-api';

import type { EditorPane, OpenTab, SplitDirection } from './editor-store.js';

export const TAB_SESSION_STORAGE_KEY = 'molecule:tab-session';
export const TAB_SESSION_FILE_PATH = '.molecule/session.json';

export interface TabSessionSnapshot {
  tabUris: string[];
  activeTabId: string | null;
  activePaneId: string;
  panes: EditorPane[];
  splitDirection: SplitDirection;
}

export function readTabSession(): TabSessionSnapshot | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabSessionSnapshot;
    if (!Array.isArray(parsed.tabUris)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTabSession(snapshot: TabSessionSnapshot): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

export async function readTabSessionFromWorkspace(
  workspace: WorkspaceAPI
): Promise<TabSessionSnapshot | null> {
  try {
    const raw = await workspace.readFile(TAB_SESSION_FILE_PATH);
    const parsed = JSON.parse(raw) as TabSessionSnapshot;
    if (!Array.isArray(parsed.tabUris)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createDebouncedWorkspaceTabSessionWriter(
  workspace: WorkspaceAPI,
  debounceMs = 400
): (snapshot: TabSessionSnapshot) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (snapshot) => {
    writeTabSession(snapshot);
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      void workspace.writeFile(TAB_SESSION_FILE_PATH, JSON.stringify(snapshot)).catch(() => {
        /* workspace may be read-only in tests */
      });
    }, debounceMs);
  };
}

export function captureTabSession(state: {
  tabs: OpenTab[];
  activeTabId: string | null;
  activePaneId: string;
  panes: EditorPane[];
  splitDirection: SplitDirection;
}): TabSessionSnapshot {
  return {
    tabUris: state.tabs.filter((t) => t.kind !== 'extension-detail').map((t) => t.uri),
    activeTabId: state.activeTabId,
    activePaneId: state.activePaneId,
    panes: state.panes.map((p) => ({ id: p.id, activeTabId: p.activeTabId })),
    splitDirection: state.splitDirection,
  };
}

export async function restoreTabSession(
  snapshot: TabSessionSnapshot,
  loadDocument: (uri: string) => Promise<EditorDocument | undefined>,
  openTab: (doc: EditorDocument) => void,
  applyLayout: (layout: Pick<TabSessionSnapshot, 'panes' | 'activePaneId' | 'activeTabId' | 'splitDirection'>) => void
): Promise<boolean> {
  const uris = [...new Set(snapshot.tabUris)]
    .filter(Boolean)
    .filter((uri) => !uri.startsWith('extension-detail://'));
  if (uris.length === 0) return false;

  let opened = 0;
  for (const uri of uris) {
    const doc = await loadDocument(uri);
    if (!doc) continue;
    openTab(doc);
    opened++;
  }
  if (opened === 0) return false;

  const activeTabId =
    snapshot.activeTabId && uris.includes(snapshot.activeTabId)
      ? snapshot.activeTabId
      : uris[0] ?? null;

  applyLayout({
    panes: snapshot.panes.length ? snapshot.panes : [{ id: 'primary', activeTabId: activeTabId }],
    activePaneId: snapshot.activePaneId || 'primary',
    activeTabId,
    splitDirection: snapshot.splitDirection ?? 'horizontal',
  });
  return true;
}
