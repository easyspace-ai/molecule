import {
  ActivityBar,
  Button,
  PanelContainer,
  SashHandle,
  StatusBar,
  Tabs,
  TabsList,
  TabsTrigger,
  ViewContainer,
  resolveActivityIcon,
  Icon_Sparkles,
} from '@jiulimiai/ui';
import { defaultL10n } from '@jiulimiai/plugin-api';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AUXILIARY_MAX,
  AUXILIARY_MIN,
  PANEL_MAX,
  PANEL_MIN,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from './ResizeHandle.js';
import { ActivityBarSettings, type SettingsMenuAction } from './ActivityBarSettings.js';
import { usePaneResize } from './usePaneResize.js';
import { useWorkbenchStore } from './store.js';
import { ViewErrorBoundary } from './ViewErrorBoundary.js';

export interface WorkbenchProps {
  editor: ReactNode;
  onCommand?: (commandId: string) => void;
  onSettingsAction?: (action: SettingsMenuAction) => void;
}

function flexBasisPercent(percent: number): string {
  return `0 0 ${percent}%`;
}

function PaneSash({
  axis,
  invert,
  containerRef,
  paneRef,
  getPercent,
  minPercent,
  maxPercent,
  onCommit,
  'data-testid': testId,
}: {
  axis: 'horizontal' | 'vertical';
  invert?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  paneRef: React.RefObject<HTMLElement | null>;
  getPercent: () => number;
  minPercent: number;
  maxPercent: number;
  onCommit: (percent: number) => void;
  'data-testid'?: string;
}) {
  const onPreview = useCallback(
    (percent: number) => {
      const pane = paneRef.current;
      if (pane) pane.style.flex = flexBasisPercent(percent);
    },
    [paneRef]
  );

  const handleCommit = useCallback(
    (percent: number) => {
      const pane = paneRef.current;
      if (pane) pane.style.flex = '';
      onCommit(percent);
    },
    [onCommit, paneRef]
  );

  const { startResize } = usePaneResize({
    direction: axis === 'horizontal' ? 'horizontal' : 'vertical',
    minPercent,
    maxPercent,
    invert,
    containerRef,
    onPreview,
    onCommit: handleCommit,
  });

  return (
    <SashHandle
      axis={axis}
      data-testid={testId}
      valueNow={Math.round(getPercent())}
      valueMin={minPercent}
      valueMax={maxPercent}
      onPointerDown={startResize}
    />
  );
}

export function Workbench({ editor, onCommand, onSettingsAction }: WorkbenchProps) {
  const store = useWorkbenchStore();
  const [, setLocaleTick] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarPaneRef = useRef<HTMLElement>(null);
  const panelPaneRef = useRef<HTMLDivElement>(null);
  const auxiliaryPaneRef = useRef<HTMLElement>(null);
  const t = (key: string, fallback?: string) => defaultL10n.t(key, fallback);

  useEffect(() => {
    const onLocale = () => setLocaleTick((n) => n + 1);
    window.addEventListener('molecule:locale-changed', onLocale);
    return () => window.removeEventListener('molecule:locale-changed', onLocale);
  }, []);

  const editorRef = useRef<HTMLElement>(null);
  const sidebarViews = store.views.filter((v) => v.location === 'sidebar');
  const auxiliaryViews = store.views.filter((v) => v.location === 'auxiliaryBar');
  const panelViews = store.views.filter((v) => v.location === 'panel');
  const activeSidebar =
    sidebarViews.find((v) => v.id === store.activeSidebarView) ?? sidebarViews[0];
  const activeAuxiliary =
    auxiliaryViews.find((v) => v.id === store.activeAuxiliaryView) ?? auxiliaryViews[0];
  const activePanel = panelViews.find((v) => v.id === store.activePanelView) ?? panelViews[0];

  const sidebarActivityIds = new Set(sidebarViews.map((v) => v.id));
  const activityItems = [
    ...sidebarViews.map((v) => ({
      id: v.id,
      icon: v.icon ?? 'explorer',
      title: v.title,
    })),
    ...store.extensionActivityItems
      .filter((item) => !sidebarActivityIds.has(item.viewId))
      .map((item) => ({
        id: item.viewId,
        icon: item.icon,
        title: item.title,
      })),
  ];

  const showAuxiliary = store.auxiliaryBarVisible && !!activeAuxiliary;

  useEffect(() => {
    if (auxiliaryViews.length > 0 && !store.auxiliaryBarVisible) {
      store.setAuxiliaryBarVisible(true);
      if (!store.activeAuxiliaryView) {
        store.setActiveAuxiliaryView(auxiliaryViews[0].id);
      }
    }
  }, [auxiliaryViews.length]);

  useEffect(() => {
    if (panelViews.length > 0 && !store.activePanelView) {
      store.setActivePanelView(panelViews[0].id);
    }
  }, [panelViews.length]);

  const leftItems = store.statusBarItems.filter((i) => i.alignment === 'left');
  const rightItems = store.statusBarItems.filter((i) => i.alignment === 'right');
  const toast = store.notifications[store.notifications.length - 1];

  const runCommand = (id: string) => {
    if (onCommand) onCommand(id);
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground text-[length:var(--ide-font-size)]"
      data-testid="workbench"
    >
      {store.menuBarVisible && (
        <header
          className="flex h-[var(--ide-menubar-height)] shrink-0 items-center gap-1 border-b border-border bg-foreground/5 px-2"
          data-testid="menubar"
        >
          <div className="flex items-center gap-0.5 pr-2">
            <span className="px-2 text-xs text-muted-foreground">{t('menu.file')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => runCommand('workbench.openReadme')}
            >
              {t('menu.openReadme')}
            </Button>
          </div>
          <div className="flex items-center gap-0.5 pr-2">
            <span className="px-2 text-xs text-muted-foreground">{t('menu.workspace')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              data-testid="menubar-select-workspace"
              onClick={() => runCommand('workbench.selectWorkspace')}
            >
              {t('menu.selectWorkspace')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              data-testid="menubar-new-workspace"
              onClick={() => runCommand('workbench.newWorkspace')}
            >
              {t('menu.newWorkspace')}
            </Button>
          </div>
          <div className="flex items-center gap-0.5 pr-2">
            <span className="px-2 text-xs text-muted-foreground">{t('menu.view')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => store.setSidebarVisible(!store.sidebarVisible)}
            >
              {t('menu.toggleSidebar')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => store.setPanelVisible(!store.panelVisible)}
            >
              {t('menu.togglePanel')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => store.setAuxiliaryBarVisible(!store.auxiliaryBarVisible)}
            >
              {t('menu.toggleAi')}
            </Button>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="px-2 text-xs text-muted-foreground">{t('menu.help')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => runCommand('workbench.showCommands')}
            >
              {t('menu.commandPalette')}
            </Button>
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1" ref={mainRef}>
        <ActivityBar
          items={[
            ...activityItems.map((item) => ({
              id: item.id,
              title: item.title,
              icon: resolveActivityIcon(item.icon, item.id),
              active: store.activeActivity === item.id,
              onClick: () => {
                window.dispatchEvent(
                  new CustomEvent('molecule:focus-sidebar-view', { detail: { viewId: item.id } })
                );
              },
            })),
            ...(auxiliaryViews.length > 0
              ? [
                  {
                    id: 'ai',
                    title: 'AI',
                    icon: <Icon_Sparkles className="size-4" aria-hidden />,
                    active: store.auxiliaryBarVisible,
                    'data-testid': 'activity-ai',
                    onClick: () => store.setAuxiliaryBarVisible(!store.auxiliaryBarVisible),
                  },
                ]
              : []),
          ]}
          footer={onSettingsAction ? <ActivityBarSettings onAction={onSettingsAction} /> : undefined}
        />

        {store.sidebarVisible && (
          <>
            <ViewContainer
              ref={sidebarPaneRef}
              title={activeSidebar?.title ?? 'Sidebar'}
              style={{ flex: flexBasisPercent(store.sidebarWidth), minWidth: 0 }}
              data-testid="sidebar"
            >
              <ViewErrorBoundary viewId={activeSidebar?.id}>
                {activeSidebar?.render()}
              </ViewErrorBoundary>
            </ViewContainer>
            <PaneSash
              axis="horizontal"
              data-testid="resize-sidebar"
              containerRef={mainRef}
              paneRef={sidebarPaneRef}
              getPercent={() => store.sidebarWidth}
              minPercent={SIDEBAR_MIN}
              maxPercent={SIDEBAR_MAX}
              onCommit={store.setSidebarWidth}
            />
          </>
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col" ref={editorRef}>
          <div className="flex min-h-0 flex-1 flex-col">{editor}</div>
          {panelViews.length > 0 && store.panelVisible && (
            <>
              <PaneSash
                axis="vertical"
                invert
                data-testid="resize-panel"
                containerRef={editorRef}
                paneRef={panelPaneRef}
                getPercent={() => store.panelHeight}
                minPercent={PANEL_MIN}
                maxPercent={PANEL_MAX}
                onCommit={store.setPanelHeight}
              />
              <PanelContainer
                ref={panelPaneRef}
                title={activePanel?.title ?? 'Panel'}
                style={{ flex: flexBasisPercent(store.panelHeight), minHeight: 0 }}
                data-testid="panel"
                tabs={
                  <Tabs
                    value={store.activePanelView ?? panelViews[0]?.id}
                    onValueChange={(id) => {
                      store.setActivePanelView(id);
                      store.setPanelVisible(true);
                    }}
                  >
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-foreground/5">
                      {panelViews.map((view) => (
                        <TabsTrigger key={view.id} value={view.id} className="text-xs">
                          {view.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                }
                contentClassName="p-0 font-mono"
              >
                <ViewErrorBoundary viewId={activePanel?.id}>
                  {activePanel?.render()}
                </ViewErrorBoundary>
              </PanelContainer>
            </>
          )}
        </section>

        {showAuxiliary && (
          <>
            <PaneSash
              axis="horizontal"
              invert
              data-testid="resize-auxiliary"
              containerRef={mainRef}
              paneRef={auxiliaryPaneRef}
              getPercent={() => store.auxiliaryWidth}
              minPercent={AUXILIARY_MIN}
              maxPercent={AUXILIARY_MAX}
              onCommit={store.setAuxiliaryWidth}
            />
            <ViewContainer
              ref={auxiliaryPaneRef}
              title={activeAuxiliary.title}
              style={{ flex: flexBasisPercent(store.auxiliaryWidth), minWidth: 0 }}
              contentClassName="flex flex-col"
              data-testid="auxiliary-bar"
            >
              <ViewErrorBoundary viewId={activeAuxiliary.id}>
                {activeAuxiliary.render()}
              </ViewErrorBoundary>
            </ViewContainer>
          </>
        )}
      </div>

      {store.statusBarVisible && (
        <StatusBar
          leftItems={leftItems.map((i) => ({ id: i.id, text: i.text, alignment: 'left' }))}
          rightItems={rightItems.map((i) => ({ id: i.id, text: i.text, alignment: 'right' }))}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-8 right-4 z-[var(--z-tooltip)] rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-minimal"
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Re-export sash bounds for consumers
export {
  AUXILIARY_MAX,
  AUXILIARY_MIN,
  PANEL_MAX,
  PANEL_MIN,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from './ResizeHandle.js';
