import { EditorTabs } from '@easyspace/workbench';
import { ExtensionDetailTab } from './ExtensionDetailTab.js';
import { useEditorStore } from './editor-store.js';
import { MonacoEditor } from './MonacoEditor.js';
import './extension-detail.css';

function EditorPane({ paneId }: { paneId: string }) {
  const {
    tabs,
    panes,
    activePaneId,
    theme,
    fontSize,
    tabSize,
    setActiveTab,
    setActivePane,
    updateTabContent,
    getPaneActiveTab,
  } = useEditorStore();

  const pane = panes.find((p) => p.id === paneId);
  const activeTab = getPaneActiveTab(paneId);

  return (
    <div
      data-testid={`editor-pane-${paneId}`}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: paneId !== panes[panes.length - 1]?.id ? '1px solid var(--mo-border)' : undefined,
      }}
      onFocus={() => setActivePane(paneId)}
      onMouseDown={() => setActivePane(paneId)}
    >
      <EditorTabs
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, dirty: t.dirty }))}
        activeId={pane?.activeTabId ?? null}
        onSelect={(id) => setActiveTab(id, paneId)}
      >
        {activeTab ? (
          activeTab.kind === 'extension-detail' && activeTab.extensionDetail ? (
            <ExtensionDetailTab detail={activeTab.extensionDetail} />
          ) : (
            <MonacoEditor
              key={`${paneId}-${activeTab.id}`}
              path={activeTab.uri}
              value={activeTab.content}
              language={activeTab.languageId}
              theme={theme}
              fontSize={fontSize}
              tabSize={tabSize}
              onChange={(content) => updateTabContent(activeTab.id, content)}
            />
          )
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--mo-fg-muted)',
            }}
          >
            Open a file from the explorer
          </div>
        )}
      </EditorTabs>
      {activePaneId === paneId && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            width: 0,
            height: 0,
            overflow: 'hidden',
          }}
          data-testid="editor-pane-active"
        />
      )}
    </div>
  );
}

export function EditorPaneHost() {
  const panes = useEditorStore((s) => s.panes);
  const splitDirection = useEditorStore((s) => s.splitDirection);

  return (
    <div
      data-testid="editor-pane-host"
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        height: '100%',
        position: 'relative',
        flexDirection: splitDirection === 'vertical' ? 'column' : 'row',
      }}
    >
      {panes.map((pane) => (
        <EditorPane key={pane.id} paneId={pane.id} />
      ))}
    </div>
  );
}

/** @deprecated Use EditorPaneHost — kept as alias for compatibility. */
export function EditorArea() {
  return <EditorPaneHost />;
}
