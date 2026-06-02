import { EditorTabs } from '@easyspace/workbench';
import { cn } from '@easyspace/ui';
import { ExtensionDetailTab } from './ExtensionDetailTab.js';
import { useEditorStore } from './editor-store.js';
import { MonacoEditor } from './MonacoEditor.js';

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
      className={cn(
        'relative flex min-h-0 min-w-0 flex-1 flex-col',
        paneId !== panes[panes.length - 1]?.id && 'border-r border-border'
      )}
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
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Open a file from the explorer
          </div>
        )}
      </EditorTabs>
      {activePaneId === paneId && (
        <div
          aria-hidden
          className="pointer-events-none absolute size-0 overflow-hidden"
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
      className={cn(
        'relative flex min-h-0 flex-1',
        splitDirection === 'vertical' ? 'flex-col' : 'flex-row'
      )}
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
