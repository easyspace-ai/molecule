import { defaultL10n } from '@easyspace/plugin-api';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  AUXILIARY_MAX,
  AUXILIARY_MIN,
  PANEL_MAX,
  PANEL_MIN,
  ResizeHandle,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from './ResizeHandle.js';
import { ActivityBarSettings, type SettingsMenuAction } from './ActivityBarSettings.js';
import { useWorkbenchStore } from './store.js';

export interface WorkbenchProps {
  editor: ReactNode;
  onCommand?: (commandId: string) => void;
  onSettingsAction?: (action: SettingsMenuAction) => void;
}

export function Workbench({ editor, onCommand, onSettingsAction }: WorkbenchProps) {
  const store = useWorkbenchStore();
  const [, setLocaleTick] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
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
      icon: v.icon ?? '◫',
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
    <div className="mo-workbench" data-testid="workbench">
      {store.menuBarVisible && (
        <header className="mo-menubar" data-testid="menubar">
          <div className="mo-menubar__group">
            <span className="mo-menubar__label">{t('menu.file')}</span>
            <button type="button" className="mo-menubar__item" onClick={() => runCommand('workbench.openReadme')}>
              {t('menu.openReadme')}
            </button>
          </div>
          <div className="mo-menubar__group">
            <span className="mo-menubar__label">{t('menu.workspace')}</span>
            <button
              type="button"
              className="mo-menubar__item"
              data-testid="menubar-select-workspace"
              onClick={() => runCommand('workbench.selectWorkspace')}
            >
              {t('menu.selectWorkspace')}
            </button>
            <button
              type="button"
              className="mo-menubar__item"
              data-testid="menubar-new-workspace"
              onClick={() => runCommand('workbench.newWorkspace')}
            >
              {t('menu.newWorkspace')}
            </button>
          </div>
          <div className="mo-menubar__group">
            <span className="mo-menubar__label">{t('menu.view')}</span>
            <button
              type="button"
              className="mo-menubar__item"
              onClick={() => store.setSidebarVisible(!store.sidebarVisible)}
            >
              {t('menu.toggleSidebar')}
            </button>
            <button
              type="button"
              className="mo-menubar__item"
              onClick={() => store.setPanelVisible(!store.panelVisible)}
            >
              {t('menu.togglePanel')}
            </button>
            <button
              type="button"
              className="mo-menubar__item"
              onClick={() => store.setAuxiliaryBarVisible(!store.auxiliaryBarVisible)}
            >
              {t('menu.toggleAi')}
            </button>
          </div>
          <div className="mo-menubar__group">
            <span className="mo-menubar__label">{t('menu.help')}</span>
            <button type="button" className="mo-menubar__item" onClick={() => runCommand('workbench.showCommands')}>
              {t('menu.commandPalette')}
            </button>
          </div>
        </header>
      )}

      <div className="mo-workbench__main" ref={mainRef}>
        <nav className="mo-activity-bar" aria-label="Activity Bar">
          <div className="mo-activity-bar__top">
            {activityItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mo-activity-bar__item${store.activeActivity === item.id ? ' mo-activity-bar__item--active' : ''}`}
                title={item.title}
                aria-label={item.title}
                data-testid={`activity-${item.id}`}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('molecule:focus-sidebar-view', { detail: { viewId: item.id } })
                  );
                }}
              >
                {item.icon}
              </button>
            ))}
            {auxiliaryViews.length > 0 && (
              <button
                type="button"
                className={`mo-activity-bar__item${store.auxiliaryBarVisible ? ' mo-activity-bar__item--active' : ''}`}
                title="AI"
                aria-label="AI Chat"
                data-testid="activity-ai"
                onClick={() => store.setAuxiliaryBarVisible(!store.auxiliaryBarVisible)}
              >
                ✦
              </button>
            )}
          </div>
          {onSettingsAction && <ActivityBarSettings onAction={onSettingsAction} />}
        </nav>

        {store.sidebarVisible && (
          <>
            <aside
              className="mo-sidebar"
              style={{ flex: `0 0 ${store.sidebarWidth}%`, minWidth: 0 }}
              data-testid="sidebar"
            >
              <div className="mo-sidebar__header">{activeSidebar?.title ?? 'Sidebar'}</div>
              <div className="mo-sidebar__content">{activeSidebar?.render()}</div>
            </aside>
            <ResizeHandle
              axis="horizontal"
              data-testid="resize-sidebar"
              containerRef={mainRef}
              getPercent={() => store.sidebarWidth}
              minPercent={SIDEBAR_MIN}
              maxPercent={SIDEBAR_MAX}
              onResize={store.setSidebarWidth}
            />
          </>
        )}

        <section className="mo-editor-area" ref={editorRef}>
          <div className="mo-editor-area__main">{editor}</div>
          {panelViews.length > 0 && store.panelVisible && (
            <>
              <ResizeHandle
                axis="vertical"
                data-testid="resize-panel"
                containerRef={editorRef}
                getPercent={() => store.panelHeight}
                minPercent={PANEL_MIN}
                maxPercent={PANEL_MAX}
                onResize={store.setPanelHeight}
              />
              <div
                className="mo-panel"
                data-testid="panel"
                style={{ flex: `0 0 ${store.panelHeight}%`, minHeight: 0 }}
              >
                <div className="mo-panel__tabs">
                  {panelViews.map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      className={`mo-tab${store.activePanelView === view.id ? ' mo-tab--active' : ''}`}
                      onClick={() => {
                        store.setActivePanelView(view.id);
                        store.setPanelVisible(true);
                      }}
                    >
                      {view.title}
                    </button>
                  ))}
                </div>
                <div className="mo-panel__content">{activePanel?.render()}</div>
              </div>
            </>
          )}
        </section>

        {showAuxiliary && (
          <>
            <ResizeHandle
              axis="horizontal"
              invert
              data-testid="resize-auxiliary"
              containerRef={mainRef}
              getPercent={() => store.auxiliaryWidth}
              minPercent={AUXILIARY_MIN}
              maxPercent={AUXILIARY_MAX}
              onResize={store.setAuxiliaryWidth}
            />
            <aside
              className="mo-auxiliary-bar"
              data-testid="auxiliary-bar"
              style={{ flex: `0 0 ${store.auxiliaryWidth}%`, minWidth: 0 }}
            >
              <div className="mo-sidebar__header">{activeAuxiliary.title}</div>
              <div
                className="mo-sidebar__content"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                {activeAuxiliary.render()}
              </div>
            </aside>
          </>
        )}
      </div>

      {store.statusBarVisible && (
        <footer className="mo-status-bar" data-testid="status-bar">
          {leftItems.map((item) => (
            <span key={item.id} data-testid={`status-${item.id}`}>
              {item.text}
            </span>
          ))}
          {rightItems.map((item) => (
            <span key={item.id} className="mo-status-bar__item--right">
              {item.text}
            </span>
          ))}
        </footer>
      )}

      {toast && (
        <div className="mo-notification-toast" role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
