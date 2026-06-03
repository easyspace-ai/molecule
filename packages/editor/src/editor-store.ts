import type { EditorDocument, ExtensionDetailData } from '@jiulimiai/plugin-api';
import { create } from 'zustand';

import { scheduleEditorAutoSave } from './auto-save-scheduler.js';

export type SplitDirection = 'horizontal' | 'vertical';
export type EditorTabKind = 'document' | 'extension-detail';

export type { ExtensionDetailData };

export interface OpenTab {
  id: string;
  uri: string;
  label: string;
  languageId: string;
  content: string;
  dirty: boolean;
  savedContent: string;
  kind: EditorTabKind;
  extensionDetail?: ExtensionDetailData;
}

export interface EditorPane {
  id: string;
  activeTabId: string | null;
}

export interface EditorStoreState {
  tabs: OpenTab[];
  panes: EditorPane[];
  activePaneId: string;
  activeTabId: string | null;
  splitDirection: SplitDirection;
  theme: string;
  fontSize: number;
  tabSize: number;
  openTab: (doc: EditorDocument) => void;
  openExtensionDetailTab: (detail: ExtensionDetailData) => void;
  closeExtensionDetailTab: (extensionId: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string, paneId?: string) => void;
  setActivePane: (paneId: string) => void;
  splitEditorHorizontal: () => void;
  splitEditorVertical: () => void;
  closeSecondaryPane: () => void;
  updateTabContent: (id: string, content: string) => void;
  markTabSaved: (id: string, content?: string) => void;
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  applySessionLayout: (
    layout: Pick<EditorStoreState, 'panes' | 'activePaneId' | 'activeTabId' | 'splitDirection'>
  ) => void;
  getActiveDocument: () => EditorDocument | undefined;
  getPaneActiveTab: (paneId: string) => OpenTab | undefined;
}

function createTab(doc: EditorDocument): OpenTab {
  return {
    id: doc.uri,
    uri: doc.uri,
    label: doc.uri.split('/').pop() ?? doc.uri,
    languageId: doc.languageId,
    content: doc.content,
    dirty: false,
    savedContent: doc.content,
    kind: 'document',
  };
}

function extensionDetailUri(extensionId: string): string {
  return `extension-detail://${extensionId}`;
}

function createExtensionDetailTab(detail: ExtensionDetailData): OpenTab {
  const uri = extensionDetailUri(detail.extensionId);
  return {
    id: uri,
    uri,
    label: detail.name,
    languageId: 'extension-detail',
    content: '',
    dirty: false,
    savedContent: '',
    kind: 'extension-detail',
    extensionDetail: detail,
  };
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  tabs: [],
  panes: [{ id: 'primary', activeTabId: null }],
  activePaneId: 'primary',
  activeTabId: null,
  splitDirection: 'horizontal',
  theme: 'vs-dark',
  fontSize: 13,
  tabSize: 2,
  openTab(doc) {
    const id = doc.uri;
    set((s) => {
      const exists = s.tabs.find((t) => t.id === id);
      const panes = s.panes.map((p) =>
        p.id === s.activePaneId ? { ...p, activeTabId: id } : p
      );
      if (exists) {
        return { activeTabId: id, panes };
      }
      return {
        tabs: [...s.tabs, createTab(doc)],
        activeTabId: id,
        panes,
      };
    });
  },
  openExtensionDetailTab(detail) {
    const id = extensionDetailUri(detail.extensionId);
    set((s) => {
      const exists = s.tabs.find((t) => t.id === id);
      const panes = s.panes.map((p) =>
        p.id === s.activePaneId ? { ...p, activeTabId: id } : p
      );
      if (exists) {
        return {
          activeTabId: id,
          panes,
          tabs: s.tabs.map((t) =>
            t.id === id ? { ...createExtensionDetailTab(detail), dirty: t.dirty } : t
          ),
        };
      }
      return {
        tabs: [...s.tabs, createExtensionDetailTab(detail)],
        activeTabId: id,
        panes,
      };
    });
  },
  closeExtensionDetailTab(extensionId) {
    get().closeTab(extensionDetailUri(extensionId));
  },
  closeTab(id) {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const panes = s.panes.map((p) => {
        if (p.activeTabId !== id) return p;
        const activeTabId = tabs[tabs.length - 1]?.id ?? null;
        return { ...p, activeTabId };
      });
      const activePane = panes.find((p) => p.id === s.activePaneId);
      const activeTabId =
        s.activeTabId === id ? (activePane?.activeTabId ?? null) : s.activeTabId;
      return { tabs, panes, activeTabId };
    });
  },
  setActiveTab(id, paneId) {
    set((s) => {
      const targetPane = paneId ?? s.activePaneId;
      return {
        activeTabId: id,
        activePaneId: targetPane,
        panes: s.panes.map((p) => (p.id === targetPane ? { ...p, activeTabId: id } : p)),
      };
    });
  },
  setActivePane(paneId) {
    set((s) => {
      const pane = s.panes.find((p) => p.id === paneId);
      return { activePaneId: paneId, activeTabId: pane?.activeTabId ?? s.activeTabId };
    });
  },
  splitEditorHorizontal() {
    set((s) => {
      if (s.panes.length >= 2) return { splitDirection: 'horizontal' as SplitDirection };
      const newPane: EditorPane = {
        id: `pane-${Date.now()}`,
        activeTabId: s.activeTabId,
      };
      return { panes: [...s.panes, newPane], splitDirection: 'horizontal' };
    });
  },
  splitEditorVertical() {
    set((s) => {
      if (s.panes.length >= 2) return { splitDirection: 'vertical' as SplitDirection };
      const newPane: EditorPane = {
        id: `pane-${Date.now()}`,
        activeTabId: s.activeTabId,
      };
      return { panes: [...s.panes, newPane], splitDirection: 'vertical' };
    });
  },
  closeSecondaryPane() {
    set((s) => {
      if (s.panes.length <= 1) return s;
      const primary = s.panes[0]!;
      return {
        panes: [primary],
        activePaneId: primary.id,
        activeTabId: primary.activeTabId ?? s.activeTabId,
        splitDirection: 'horizontal' as SplitDirection,
      };
    });
  },
  updateTabContent(id, content) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, content, dirty: content !== t.savedContent } : t
      ),
    }));
    const tab = get().tabs.find((t) => t.id === id);
    if (tab) scheduleEditorAutoSave(id, tab.uri, content);
  },
  markTabSaved(id, content) {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const saved = content ?? t.content;
        return { ...t, savedContent: saved, dirty: t.content !== saved };
      }),
    }));
  },
  setTheme(theme) {
    set({ theme });
  },
  setFontSize(fontSize) {
    set({ fontSize });
  },
  setTabSize(tabSize) {
    set({ tabSize });
  },
  applySessionLayout(layout) {
    set({
      panes: layout.panes.length ? layout.panes : [{ id: 'primary', activeTabId: layout.activeTabId }],
      activePaneId: layout.activePaneId,
      activeTabId: layout.activeTabId,
      splitDirection: layout.splitDirection,
    });
  },
  getActiveDocument() {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return undefined;
    return {
      uri: tab.uri,
      languageId: tab.languageId,
      content: tab.content,
    };
  },
  getPaneActiveTab(paneId) {
    const { tabs, panes } = get();
    const pane = panes.find((p) => p.id === paneId);
    if (!pane?.activeTabId) return undefined;
    return tabs.find((t) => t.id === pane.activeTabId);
  },
}));
