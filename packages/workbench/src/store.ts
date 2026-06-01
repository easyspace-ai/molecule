import type { StatusBarItem } from '@easyspace/plugin-api';
import type { ReactNode } from 'react';
import { create } from 'zustand';

export interface ViewSlot {
  id: string;
  location: string;
  title: string;
  icon?: string;
  extensionId?: string;
  render: () => ReactNode;
}

export interface ExtensionActivityItem {
  id: string;
  extensionId: string;
  title: string;
  icon: string;
  viewId: string;
}

export interface WorkbenchState {
  sidebarVisible: boolean;
  auxiliaryBarVisible: boolean;
  panelVisible: boolean;
  menuBarVisible: boolean;
  statusBarVisible: boolean;
  sidebarWidth: number;
  auxiliaryWidth: number;
  panelHeight: number;
  activeSidebarView: string | null;
  activeAuxiliaryView: string | null;
  activePanelView: string | null;
  activeActivity: string;
  statusBarItems: StatusBarItem[];
  notifications: { id: string; message: string; type: 'info' | 'warn' | 'error' }[];
  views: ViewSlot[];
  extensionActivityItems: ExtensionActivityItem[];
  panelLogs: Record<string, string[]>;
  setSidebarVisible: (v: boolean) => void;
  setAuxiliaryBarVisible: (v: boolean) => void;
  setPanelVisible: (v: boolean) => void;
  setSidebarWidth: (w: number) => void;
  setAuxiliaryWidth: (w: number) => void;
  setPanelHeight: (h: number) => void;
  setMenuBarVisible: (v: boolean) => void;
  setStatusBarVisible: (v: boolean) => void;
  setActiveActivity: (id: string) => void;
  setActiveSidebarView: (id: string | null) => void;
  setActiveAuxiliaryView: (id: string | null) => void;
  setActivePanelView: (id: string | null) => void;
  registerView: (slot: ViewSlot) => { dispose: () => void };
  registerExtensionActivityItem: (item: ExtensionActivityItem) => { dispose: () => void };
  setStatusBarItems: (items: StatusBarItem[]) => void;
  appendPanelLog: (panelId: string, line: string) => void;
  pushNotification: (message: string, type?: 'info' | 'warn' | 'error') => void;
  dismissNotification: (id: string) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  sidebarVisible: true,
  auxiliaryBarVisible: false,
  panelVisible: false,
  menuBarVisible: true,
  statusBarVisible: true,
  /** Sidebar width as % of workbench main row (see ADR 004). */
  sidebarWidth: 18,
  /** Auxiliary bar width as % of workbench main row. */
  auxiliaryWidth: 25,
  /** Panel height as % of editor column. */
  panelHeight: 28,
  activeSidebarView: null,
  activeAuxiliaryView: null,
  activePanelView: null,
  activeActivity: 'explorer',
  statusBarItems: [],
  notifications: [],
  views: [],
  extensionActivityItems: [],
  panelLogs: { output: ['[Output] Molecule Next ready.'] },
  setSidebarVisible: (sidebarVisible) => set({ sidebarVisible }),
  setAuxiliaryBarVisible: (auxiliaryBarVisible) => set({ auxiliaryBarVisible }),
  setPanelVisible: (panelVisible) => set({ panelVisible }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setAuxiliaryWidth: (auxiliaryWidth) => set({ auxiliaryWidth }),
  setPanelHeight: (panelHeight) => set({ panelHeight }),
  setMenuBarVisible: (menuBarVisible) => set({ menuBarVisible }),
  setStatusBarVisible: (statusBarVisible) => set({ statusBarVisible }),
  setActiveActivity: (activeActivity) => set({ activeActivity }),
  setActiveSidebarView: (activeSidebarView) => set({ activeSidebarView }),
  setActiveAuxiliaryView: (activeAuxiliaryView) => set({ activeAuxiliaryView }),
  setActivePanelView: (activePanelView) => set({ activePanelView }),
  appendPanelLog: (panelId, line) =>
    set((s) => ({
      panelLogs: {
        ...s.panelLogs,
        [panelId]: [...(s.panelLogs[panelId] ?? []), line],
      },
    })),
  registerView: (slot): { dispose: () => void } => {
    set((s) => ({
      views: [...s.views.filter((v) => v.id !== slot.id), slot],
      activeSidebarView:
        slot.location === 'sidebar' && !s.activeSidebarView ? slot.id : s.activeSidebarView,
      activeAuxiliaryView:
        slot.location === 'auxiliaryBar' && !s.activeAuxiliaryView ? slot.id : s.activeAuxiliaryView,
      activePanelView:
        slot.location === 'panel' && !s.activePanelView ? slot.id : s.activePanelView,
    }));
    return {
      dispose: () => {
        set((s) => ({
          views: s.views.filter((v) => v.id !== slot.id),
        }));
      },
    };
  },
  registerExtensionActivityItem: (item): { dispose: () => void } => {
    set((s) => ({
      extensionActivityItems: [
        ...s.extensionActivityItems.filter((a) => a.id !== item.id),
        item,
      ],
    }));
    return {
      dispose: () => {
        set((s) => ({
          extensionActivityItems: s.extensionActivityItems.filter((a) => a.id !== item.id),
        }));
      },
    };
  },
  setStatusBarItems: (statusBarItems) => set({ statusBarItems }),
  pushNotification: (message, type = 'info') =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        { id: `${Date.now()}`, message, type },
      ],
    })),
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}));
