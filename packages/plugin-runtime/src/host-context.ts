import {
  DisposableStore,
  type AIHostAPI,
  type CommandAPI,
  type ConfigurationAPI,
  type Disposable,
  type EditorAPI,
  EditorDocument,
  PluginContext,
  type ScmAPI,
  StatusBarItem,
  type TerminalAPI,
  UIAPI,
  WorkbenchAPI,
  WorkspaceAPI,
} from '@easyspace/plugin-api';
import type { ReactNode } from 'react';

import type { ContributionRegistry } from './registry.js';
import {
  createMemoryWorkspaceCrud,
  createMemoryWorkspaceStore,
} from './memory-workspace-crud.js';
import { searchFilesInWorker, type SearchOptions } from './search.js';

export interface MemoryWorkspaceOptions {
  searchOptions?: SearchOptions | (() => SearchOptions);
}

export interface HostServices {
  registry: ContributionRegistry;
  workspace: WorkspaceAPI;
  configuration?: ConfigurationAPI;
  editor: EditorAPI;
  ai?: AIHostAPI;
  terminal?: TerminalAPI;
  scm?: ScmAPI;
  ui?: UIAPI;
  onViewRegister: (viewId: string, location: string, render: () => ReactNode) => Disposable;
  onStatusBarChange: () => void;
  onLayoutChange: () => void;
  layout: {
    auxiliaryBarVisible: boolean;
    sidebarVisible: boolean;
    panelVisible: boolean;
    menuBarVisible: boolean;
    statusBarVisible: boolean;
  };
  setLayout: (patch: Partial<HostServices['layout']>) => void;
  appendPanelLog?: (panelId: string, line: string) => void;
  statusBarItems: Map<string, StatusBarItem>;
  notifications: { message: string; type: 'info' | 'warn' | 'error' }[];
  pushNotification: (message: string, type?: 'info' | 'warn' | 'error') => void;
}

export function createPluginContext(services: HostServices): PluginContext {
  const subscriptions = new DisposableStore();

  const workbench: WorkbenchAPI = {
    registerView(location, viewId, render) {
      services.registry.viewRenderers.set(viewId, render);
      return services.onViewRegister(viewId, location, render);
    },
    setStatusBarItem(item) {
      services.statusBarItems.set(item.id, item);
      services.onStatusBarChange();
      return {
        dispose() {
          services.statusBarItems.delete(item.id);
          services.onStatusBarChange();
        },
      };
    },
    showNotification(message, type = 'info') {
      services.pushNotification(message, type);
    },
    getLayoutState() {
      return { ...services.layout };
    },
    setSidebarVisible(visible) {
      services.setLayout({ sidebarVisible: visible });
      services.onLayoutChange();
    },
    setAuxiliaryBarVisible(visible) {
      services.setLayout({ auxiliaryBarVisible: visible });
      services.onLayoutChange();
    },
    setPanelVisible(visible) {
      services.setLayout({ panelVisible: visible });
      services.onLayoutChange();
    },
    setMenuBarVisible(visible) {
      services.setLayout({ menuBarVisible: visible });
      services.onLayoutChange();
    },
    setStatusBarVisible(visible) {
      services.setLayout({ statusBarVisible: visible });
      services.onLayoutChange();
    },
    appendPanelLog(panelId, line) {
      services.appendPanelLog?.(panelId, line);
    },
  };

  const commands: CommandAPI = {
    registerCommand(id, handler) {
      services.registry.commandHandlers.set(id, handler);
      return {
        dispose() {
          services.registry.commandHandlers.delete(id);
        },
      };
    },
    async executeCommand(id, ...args) {
      const handler = services.registry.commandHandlers.get(id);
      if (!handler) throw new Error(`Command not found: ${id}`);
      return handler(...args);
    },
  };

  const ui: UIAPI =
    services.ui ??
    ({
      showInputBox: async () => undefined,
      showQuickPick: async () => undefined,
    } satisfies UIAPI);

  return {
    workspace: services.workspace,
    configuration: services.configuration,
    workbench,
    editor: services.editor,
    commands,
    ui,
    ai: services.ai,
    terminal: services.terminal,
    scm: services.scm,
    subscriptions,
  };
}

export function createMemoryWorkspace(
  files: Record<string, string> = {},
  options: MemoryWorkspaceOptions = {}
): WorkspaceAPI {
  const store = createMemoryWorkspaceStore(files);
  const crud = createMemoryWorkspaceCrud(store);

  const getSearchOptions = (): SearchOptions => {
    if (typeof options.searchOptions === 'function') return options.searchOptions();
    return options.searchOptions ?? {};
  };

  return {
    getRoot: () => '/',
    readFile: crud.readFile,
    writeFile: crud.writeFile,
    createFile: crud.createFile,
    createDirectory: crud.createDirectory,
    deletePath: crud.deletePath,
    renamePath: crud.renamePath,
    listDirectory: crud.listDirectory,
    listFiles: crud.listFiles,
    async searchInFiles(query) {
      const filesObj = Object.fromEntries(store.files);
      return searchFilesInWorker(filesObj, query, getSearchOptions());
    },
  };
}

export function createEditorHost(): EditorAPI & { _setActive: (doc?: EditorDocument) => void } {
  let active: EditorDocument | undefined;
  const listeners = new Set<(doc: EditorDocument | undefined) => void>();

  const api: EditorAPI & { _setActive: (doc?: EditorDocument) => void } = {
    async openDocument(doc) {
      active = doc;
      for (const l of listeners) l(active);
    },
    getActiveDocument() {
      return active;
    },
    getSelection() {
      return active ? { start: 0, end: active.content.length } : undefined;
    },
    onDidChangeActiveDocument(handler) {
      listeners.add(handler);
      return {
        dispose() {
          listeners.delete(handler);
        },
      };
    },
    _setActive(doc) {
      active = doc;
      for (const l of listeners) l(active);
    },
  };
  return api;
}
