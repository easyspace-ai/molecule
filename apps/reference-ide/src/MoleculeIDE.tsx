import { AIHost, createMockProvider, createOpenAICompatibleProvider } from '@easyspace/ai-host';
import {
  captureTabSession,
  createDebouncedWorkspaceTabSessionWriter,
  EditorPaneHost,
  readTabSession,
  readTabSessionFromWorkspace,
  restoreTabSession,
  setupEditorAutoSave,
  useEditorStore,
} from '@easyspace/editor';
import { createApp } from '@easyspace/kernel';
import { aiPlugin } from '@easyspace/plugin-ai';
import type { ConfigurationAPI, ExtensionDetailData, PluginModule, StatusBarItem, WorkspaceAPI } from '@easyspace/plugin-api';
import { DEFAULT_MOLECULE_SETTINGS } from '@easyspace/plugin-api';
import {
  CommandPaletteHost,
  commandsPlugin,
  createQuickPickUI,
  QuickPickHost,
  setCommandPaletteApi,
  useKeybindings,
} from '@easyspace/plugin-commands';
import { i18nPlugin, registerExtensionLocalizations } from '@easyspace/plugin-i18n';
import { explorerPlugin } from '@easyspace/plugin-explorer';
import { extensionsPlugin } from '@easyspace/plugin-extensions';
import { helloPlugin } from '@easyspace/plugin-hello';
import { panelPlugin } from '@easyspace/plugin-panel';
import { scmPlugin } from '@easyspace/plugin-scm';
import {
  applyKeybindingOverrides,
  createConfigurationService,
  createDefaultKeybindingRegistry,
  createEditorHost,
  createScmService,
  createTerminalService,
  loadExtensionPlugins,
  PluginManager,
} from '@easyspace/plugin-runtime';
import { searchPlugin } from '@easyspace/plugin-search';
import { terminalPlugin } from '@easyspace/plugin-terminal';
import {
  applyTheme,
  createThemesPlugin,
  migrateLegacyThemeId,
  readPersistedTheme,
  setInitialTheme,
  setThemeChangeHandler,
  ThemePickerHost,
} from '@easyspace/plugin-themes';
import { testPanePlugin } from '@easyspace/plugin-test-pane';
import {
  applyPersistedLayout,
  normalizeLayoutPercent,
  readPersistedLayout,
  useWorkbenchStore,
  Workbench,
  writePersistedLayout,
} from '@easyspace/workbench';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createReferenceWorkspace,
  listWorkspaceRoots,
  getActiveWorkspaceRoot,
  switchWorkspaceRoot,
} from './create-workspace.js';
import { SAMPLE_WORKSPACE } from './workspace.js';

const keybindingRegistry = createDefaultKeybindingRegistry();
const configurationRef: { current: ConfigurationAPI | null } = { current: null };

const referenceCommandsPlugin: PluginModule = {
  manifest: {
    id: 'reference.commands',
    name: 'Reference Commands',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      commands: [
        { id: 'workbench.openReadme', title: 'File: Open README' },
        { id: 'workbench.action.toggleSidebarVisibility', title: 'View: Toggle Sidebar' },
        { id: 'workbench.action.togglePanel', title: 'View: Toggle Panel' },
        { id: 'workbench.splitEditorHorizontal', title: 'View: Split Editor Horizontal' },
        { id: 'workbench.splitEditorVertical', title: 'View: Split Editor Vertical' },
        { id: 'workbench.closeSecondaryEditorPane', title: 'View: Close Secondary Editor Pane' },
        { id: 'workbench.selectWorkspace', title: 'Workspace: Select Project' },
        { id: 'workbench.switchWorkspace', title: 'Workspace: Switch Project' },
        { id: 'workbench.newWorkspace', title: 'Workspace: New Project' },
      ],
    },
  },
  activate(ctx) {
    ctx.commands.registerCommand('workbench.openReadme', async () => {
      const content = await ctx.workspace.readFile('README.md');
      await ctx.editor.openDocument({
        uri: 'README.md',
        languageId: 'markdown',
        content,
      });
    });
    ctx.commands.registerCommand('workbench.action.toggleSidebarVisibility', () => {
      const layout = ctx.workbench.getLayoutState();
      ctx.workbench.setSidebarVisible(!layout.sidebarVisible);
    });
    ctx.commands.registerCommand('workbench.action.togglePanel', () => {
      const layout = ctx.workbench.getLayoutState();
      ctx.workbench.setPanelVisible(!layout.panelVisible);
    });
    ctx.commands.registerCommand('workbench.splitEditorHorizontal', () => {
      useEditorStore.getState().splitEditorHorizontal();
    });
    ctx.commands.registerCommand('workbench.splitEditorVertical', () => {
      useEditorStore.getState().splitEditorVertical();
    });
    ctx.commands.registerCommand('workbench.closeSecondaryEditorPane', () => {
      useEditorStore.getState().closeSecondaryPane();
    });
    ctx.commands.registerCommand('workbench.selectWorkspace', async () => {
      const roots = await listWorkspaceRoots();
      const current = await getActiveWorkspaceRoot();
      const createLabel = '+ New project';
      const pick = await ctx.ui.showQuickPick([...roots, createLabel], 'Select workspace');
      if (!pick) return;
      if (pick === createLabel) {
        const id = `project-${Date.now()}`;
        await switchWorkspaceRoot(id, { create: true });
        window.location.reload();
        return;
      }
      if (pick !== current) {
        await switchWorkspaceRoot(pick);
        window.location.reload();
      }
    });
    ctx.commands.registerCommand('workbench.switchWorkspace', async () => {
      const roots = await listWorkspaceRoots();
      const current = await getActiveWorkspaceRoot();
      const next = roots.find((r) => r !== current) ?? 'project-2';
      await switchWorkspaceRoot(next);
      window.location.reload();
    });
    ctx.commands.registerCommand('workbench.newWorkspace', async () => {
      const id = `project-${Date.now()}`;
      await switchWorkspaceRoot(id, { create: true });
      window.location.reload();
    });
  },
};

function buildPlugins(): PluginModule[] {
  return [
    i18nPlugin,
    helloPlugin,
    createThemesPlugin(() => configurationRef.current ?? undefined),
    explorerPlugin,
    extensionsPlugin,
    searchPlugin,
    scmPlugin,
    panelPlugin,
    terminalPlugin,
    testPanePlugin,
    commandsPlugin,
    referenceCommandsPlugin,
    aiPlugin,
  ];
}

function findViewMeta(
  viewId: string,
  registry?: Map<string, { name: string; icon?: string; pluginId: string }>
): { name: string; icon?: string; extensionId?: string } {
  const fromRegistry = registry?.get(viewId);
  if (fromRegistry) {
    return { name: fromRegistry.name, icon: fromRegistry.icon, extensionId: fromRegistry.pluginId };
  }
  for (const plugin of buildPlugins()) {
    const view = plugin.manifest.contributes?.views?.find((v) => v.id === viewId);
    if (view) return { name: view.name, icon: view.icon };
  }
  return { name: viewId };
}

function restoreLayoutFromStorage(): void {
  const persisted = readPersistedLayout();
  if (!persisted) return;

  const normalized: typeof persisted = {
    ...persisted,
    sidebarWidth: normalizeLayoutPercent(persisted.sidebarWidth, 18),
    auxiliaryWidth: normalizeLayoutPercent(persisted.auxiliaryWidth, 25),
    panelHeight: normalizeLayoutPercent(persisted.panelHeight, 28),
  };

  applyPersistedLayout(normalized, useWorkbenchStore.getState());
}

function languageIdForPath(path: string): string {
  const ext = path.split('.').pop() ?? '';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'plaintext';
}

export function MoleculeIDE() {
  const managerRef = useRef<PluginManager | null>(null);
  const workspaceRef = useRef<WorkspaceAPI | null>(null);
  const layoutRef = useRef<{
    auxiliaryBarVisible: boolean;
    sidebarVisible: boolean;
    panelVisible: boolean;
    menuBarVisible: boolean;
    statusBarVisible: boolean;
  } | null>(null);
  const keybindingOverrideDisposerRef = useRef<(() => void) | null>(null);
  const autoSaveDisposerRef = useRef<(() => void) | null>(null);
  const persistTabsRef = useRef<((snapshot: ReturnType<typeof captureTabSession>) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const wb = useWorkbenchStore();
  const editorStore = useEditorStore();

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const searchOptionsRef = {
      current: {
        excludeGlobs: [...DEFAULT_MOLECULE_SETTINGS.search.exclude],
        useRegex: DEFAULT_MOLECULE_SETTINGS.search.useRegex,
      },
    };

    void (async () => {
      const persistedTheme = readPersistedTheme();
      if (persistedTheme) {
        setInitialTheme(persistedTheme);
        applyTheme(persistedTheme);
      }

      restoreLayoutFromStorage();

      const workspace = await createReferenceWorkspace({
        searchOptions: () => searchOptionsRef.current,
      });
      workspaceRef.current = workspace;
      const workspaceRoot = await getActiveWorkspaceRoot();
      persistTabsRef.current = createDebouncedWorkspaceTabSessionWriter(workspace);
      const configuration = createConfigurationService({ workspace });
      configurationRef.current = configuration;
      const terminalService = createTerminalService({ workspace });
      const scmService = createScmService(workspace);

      const settings = await configuration.whenReady();
      if (disposed) return;

      keybindingOverrideDisposerRef.current?.();
      keybindingOverrideDisposerRef.current = applyKeybindingOverrides(
        keybindingRegistry,
        settings.keybindings.overrides
      );

      autoSaveDisposerRef.current?.();
      autoSaveDisposerRef.current = setupEditorAutoSave(workspace, {
        onSaved: (uri) => scmService.noteChange(uri),
      });

      searchOptionsRef.current = {
        excludeGlobs: settings.search.exclude,
        useRegex: settings.search.useRegex,
      };

      const legacyThemeId = settings.theme.colorTheme;
      const migrated =
        legacyThemeId === 'vs-dark' || legacyThemeId === 'vs-light' || legacyThemeId === 'hc-black'
          ? migrateLegacyThemeId(legacyThemeId)
          : null;
      const themeState = persistedTheme ?? migrated ?? {
        colorTheme: settings.theme.colorTheme,
        colorMode: settings.theme.colorMode,
      };
      applyTheme(themeState);
      if (
        themeState.colorTheme !== settings.theme.colorTheme ||
        themeState.colorMode !== settings.theme.colorMode
      ) {
        void configuration.updateSettings({ theme: themeState });
      }
      editorStore.setFontSize(settings.editor.fontSize);
      editorStore.setTabSize(settings.editor.tabSize);

      configuration.onDidChange((e) => {
        if (e.key === 'theme.colorTheme' || e.key === 'theme.colorMode' || e.key === '*') {
          applyTheme({
            colorTheme: configuration.get<string>('theme.colorTheme', 'default'),
            colorMode: configuration.get<'system' | 'light' | 'dark'>('theme.colorMode', 'system'),
          });
        }
        if (e.key === 'editor.fontSize' || e.key === '*') {
          editorStore.setFontSize(configuration.get<number>('editor.fontSize', 13));
        }
        if (e.key === 'editor.tabSize' || e.key === '*') {
          editorStore.setTabSize(configuration.get<number>('editor.tabSize', 2));
        }
        if (e.key.startsWith('search.') || e.key === '*') {
          searchOptionsRef.current = {
            excludeGlobs: configuration.get<string[]>('search.exclude', []),
            useRegex: configuration.get<boolean>('search.useRegex', false),
          };
        }
        if (e.key.startsWith('keybindings.') || e.key === '*') {
          keybindingOverrideDisposerRef.current?.();
          keybindingOverrideDisposerRef.current = applyKeybindingOverrides(
            keybindingRegistry,
            configuration.get<Record<string, string>>('keybindings.overrides', {})
          );
        }
      });

      const builtinPlugins = buildPlugins();
      const { plugins: extensionPlugins, localizations, manifests: extensionManifests } =
        await loadExtensionPlugins('/extensions');
      registerExtensionLocalizations(localizations);
      const plugins = [...builtinPlugins, ...extensionPlugins];
      const app = createApp({
        config: { defaultThemeId: settings.theme.colorTheme, ai: { enabled: true } },
        plugins,
      });

      const editorHost = createEditorHost();
      const aiHost = new AIHost(true);
      const aiSettings = settings.ai;
      if (aiSettings.provider === 'openai-compatible' && aiSettings.openaiCompatible.apiKey) {
        aiHost.registerProvider(
          createOpenAICompatibleProvider({
            id: 'openai-compatible',
            baseURL: aiSettings.openaiCompatible.baseURL,
            apiKey: aiSettings.openaiCompatible.apiKey,
            model: aiSettings.openaiCompatible.model,
          })
        );
      } else {
        aiHost.registerProvider(createMockProvider('mock'));
      }

      setThemeChangeHandler((state, monacoTheme) => {
        editorStore.setTheme(monacoTheme);
        void configuration.updateSettings({ theme: state });
      });

      const statusBarItems = new Map<string, StatusBarItem>();
      const initialLayout = useWorkbenchStore.getState();
      const layout = {
        auxiliaryBarVisible: initialLayout.auxiliaryBarVisible,
        sidebarVisible: initialLayout.sidebarVisible,
        panelVisible: initialLayout.panelVisible,
        menuBarVisible: initialLayout.menuBarVisible,
        statusBarVisible: initialLayout.statusBarVisible,
      };
      layoutRef.current = layout;

      const syncLayout = () => {
        wb.setAuxiliaryBarVisible(layout.auxiliaryBarVisible);
        wb.setSidebarVisible(layout.sidebarVisible);
        wb.setPanelVisible(layout.panelVisible);
        wb.setMenuBarVisible(layout.menuBarVisible);
        wb.setStatusBarVisible(layout.statusBarVisible);
      };

      statusBarItems.set('workspace-root', {
        id: 'workspace-root',
        text: workspaceRoot,
        alignment: 'left',
        priority: 100,
      });
      wb.setStatusBarItems([...statusBarItems.values()]);

      const manager = new PluginManager({
        plugins: app.plugins,
        keybindingRegistry,
        services: {
          workspace,
          configuration,
          ui: createQuickPickUI(),
          terminal: terminalService,
          scm: scmService,
          editor: {
            openDocument: async (doc) => {
              await editorHost.openDocument(doc);
              editorStore.openTab(doc);
            },
            getActiveDocument: () => editorStore.getActiveDocument() ?? editorHost.getActiveDocument(),
            getSelection: () => editorHost.getSelection(),
            onDidChangeActiveDocument: (handler) => editorHost.onDidChangeActiveDocument(handler),
          },
          ai: aiHost,
          onViewRegister: (viewId, location, render) => {
            const meta = findViewMeta(viewId, manager.registry.views);
            return wb.registerView({
              id: viewId,
              location,
              title: meta.name,
              icon: meta.icon,
              extensionId: meta.extensionId,
              render,
            });
          },
          onStatusBarChange: () => {
            wb.setStatusBarItems([...statusBarItems.values()]);
          },
          onLayoutChange: syncLayout,
          layout,
          setLayout: (patch) => {
            Object.assign(layout, patch);
          },
          appendPanelLog: (panelId, line) => wb.appendPanelLog(panelId, line),
          statusBarItems,
          notifications: [],
          pushNotification: (message, type) => wb.pushNotification(message, type),
        },
      });

      managerRef.current = manager;
      manager.loadManifests();
      await manager.activateAll('onStartup');
      if (disposed) return;

      for (const manifest of extensionManifests) {
        if (manifest.activityBar) {
          const viewId =
            manifest.activityBar.viewId ??
            manifest.contributes?.views?.find((v) => v.location === 'sidebar')?.id;
          if (viewId) {
            wb.registerExtensionActivityItem({
              id: manifest.activityBar.id,
              extensionId: manifest.id,
              title: manifest.activityBar.title,
              icon: manifest.activityBar.icon,
              viewId,
            });
          }
        }
      }

      setCommandPaletteApi(
        [...manager.registry.commands.values()].map((c) => ({ id: c.id, title: c.title })),
        async (id) => {
          const handler = manager.registry.commandHandlers.get(id);
          if (handler) return handler();
          throw new Error(`Unknown command: ${id}`);
        }
      );

      if (!useWorkbenchStore.getState().activeSidebarView) {
        wb.setActiveSidebarView('explorer');
        wb.setActiveActivity('explorer');
      }
      if (!useWorkbenchStore.getState().activePanelView) {
        wb.setActivePanelView('output');
      }

      const langFor = (path: string) => languageIdForPath(path);

      const session = (await readTabSessionFromWorkspace(workspace)) ?? readTabSession();
      let restored = false;
      if (session) {
        restored = await restoreTabSession(
          session,
          async (uri) => {
            try {
              const content = await workspace.readFile(uri);
              return { uri, languageId: langFor(uri), content };
            } catch {
              return undefined;
            }
          },
          (doc) => editorStore.openTab(doc),
          (layout) => editorStore.applySessionLayout(layout)
        );
      }

      if (!restored) {
        try {
          const readme = await workspace.readFile('README.md');
          editorStore.openTab({
            uri: 'README.md',
            languageId: 'markdown',
            content: readme,
          });
        } catch {
          editorStore.openTab({
            uri: 'README.md',
            languageId: 'markdown',
            content: SAMPLE_WORKSPACE['README.md'],
          });
        }
      }

      setReady(true);

      (window as unknown as { __moleculeAppend?: (uri: string, text: string) => void }).__moleculeAppend =
        (uri, text) => {
          const tab = useEditorStore.getState().tabs.find((t) => t.uri === uri);
          if (tab) useEditorStore.getState().updateTabContent(tab.id, tab.content + text);
        };

      cleanup = () => {
        delete (window as unknown as { __moleculeAppend?: (uri: string, text: string) => void })
          .__moleculeAppend;
        autoSaveDisposerRef.current?.();
        autoSaveDisposerRef.current = null;
        keybindingOverrideDisposerRef.current?.();
        keybindingOverrideDisposerRef.current = null;
        void manager.deactivateAll();
        app.dispose();
        configurationRef.current = null;
        workspaceRef.current = null;
        layoutRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const persist = () => writePersistedLayout(useWorkbenchStore.getState());
    persist();
    return useWorkbenchStore.subscribe(persist);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const persistTabs = () => {
      const state = useEditorStore.getState();
      if (state.tabs.length === 0) return;
      const snapshot = captureTabSession(state);
      persistTabsRef.current?.(snapshot);
    };
    persistTabs();
    return useEditorStore.subscribe(persistTabs);
  }, [ready]);

  const runCommand = useCallback((id: string) => {
    const manager = managerRef.current;
    if (!manager) return;
    const handler = manager.registry.commandHandlers.get(id);
    if (handler) void handler();
  }, []);

  const keybindingOverrides = useMemo(
    () => ({
      'workbench.action.focusSearch': () => {
        wb.setSidebarVisible(true);
        wb.setActiveSidebarView('search');
        wb.setActiveActivity('search');
        window.dispatchEvent(new CustomEvent('molecule:focus-search'));
      },
      'search.focus': () => {
        wb.setSidebarVisible(true);
        wb.setActiveSidebarView('search');
        wb.setActiveActivity('search');
        window.dispatchEvent(new CustomEvent('molecule:focus-search'));
      },
    }),
    [wb]
  );

  useKeybindings({
    registry: keybindingRegistry,
    executeCommand: runCommand,
    overrides: keybindingOverrides,
    enabled: ready,
  });

  useEffect(() => {
    const showSidebarView = (viewId: string) => {
      if (layoutRef.current) layoutRef.current.sidebarVisible = true;
      wb.setSidebarVisible(true);
      wb.setActiveSidebarView(viewId);
      wb.setActiveActivity(viewId);
    };
    const openSettings = () => {
      showSidebarView('settings');
    };
    const focusPanel = (e: Event) => {
      const viewId = (e as CustomEvent<{ viewId: string }>).detail?.viewId;
      if (!viewId) return;
      wb.setPanelVisible(true);
      wb.setActivePanelView(viewId);
    };
    const focusSidebarView = (e: Event) => {
      const viewId = (e as CustomEvent<{ viewId: string }>).detail?.viewId;
      if (!viewId) return;
      showSidebarView(viewId);
    };
    const onFileDeleted = (e: Event) => {
      const paths = (e as CustomEvent<{ paths: string[] }>).detail?.paths ?? [];
      const state = useEditorStore.getState();
      for (const path of paths) {
        const tab = state.tabs.find((t) => t.uri === path || t.uri.startsWith(`${path}/`));
        if (tab) state.closeTab(tab.id);
      }
    };
    const onFileRenamed = (e: Event) => {
      const detail = (e as CustomEvent<{ oldPath: string; newPath: string }>).detail;
      if (!detail) return;
      const { oldPath, newPath } = detail;
      const state = useEditorStore.getState();
      const tab = state.tabs.find((t) => t.uri === oldPath);
      if (tab) state.closeTab(tab.id);
      const workspace = workspaceRef.current;
      if (!workspace) return;
      void workspace.readFile(newPath).then(
        (content) => {
          useEditorStore.getState().openTab({
            uri: newPath,
            languageId: languageIdForPath(newPath),
            content,
          });
        },
        () => undefined
      );
    };
    const onExtensionDetail = (e: Event) => {
      const detail = (e as CustomEvent<ExtensionDetailData>).detail;
      if (!detail?.extensionId) return;
      editorStore.openExtensionDetailTab(detail);
    };
    const onExtensionUninstalled = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      editorStore.closeExtensionDetailTab(id);
    };
    const onExtensionUpdateStub = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; name: string }>).detail;
      if (!detail) return;
      wb.pushNotification(`Update check for ${detail.name}: already on latest version (stub).`, 'info');
    };
    window.addEventListener('molecule:open-extension-detail', onExtensionDetail);
    window.addEventListener('molecule:extension-uninstalled', onExtensionUninstalled);
    window.addEventListener('molecule:extension-update-stub', onExtensionUpdateStub);
    window.addEventListener('molecule:open-settings', openSettings);
    window.addEventListener('molecule:focus-panel', focusPanel);
    window.addEventListener('molecule:focus-sidebar-view', focusSidebarView);
    window.addEventListener('molecule:file-deleted', onFileDeleted);
    window.addEventListener('molecule:file-renamed', onFileRenamed);
    return () => {
      window.removeEventListener('molecule:open-extension-detail', onExtensionDetail);
      window.removeEventListener('molecule:extension-uninstalled', onExtensionUninstalled);
      window.removeEventListener('molecule:extension-update-stub', onExtensionUpdateStub);
      window.removeEventListener('molecule:open-settings', openSettings);
      window.removeEventListener('molecule:focus-panel', focusPanel);
      window.removeEventListener('molecule:focus-sidebar-view', focusSidebarView);
      window.removeEventListener('molecule:file-deleted', onFileDeleted);
      window.removeEventListener('molecule:file-renamed', onFileRenamed);
    };
  }, [wb, ready, editorStore]);

  if (!ready) {
    return (
      <div
        data-testid="molecule-loading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--mo-fg-muted)',
        }}
      >
        Loading workspace…
      </div>
    );
  }

  return (
    <>
      <Workbench
        editor={<EditorPaneHost />}
        onCommand={runCommand}
        onSettingsAction={(action) => {
          if (action === 'commandPalette') runCommand('workbench.showCommands');
          if (action === 'settings') runCommand('workbench.openSettings');
          if (action === 'colorTheme') runCommand('workbench.selectColorTheme');
        }}
      />
      <CommandPaletteHost />
      <QuickPickHost />
      <ThemePickerHost />
    </>
  );
}
