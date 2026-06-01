import type { PluginContext, PluginModule } from '@easyspace/plugin-api';
import { useState, type CSSProperties, type ReactNode } from 'react';

const sectionStyle: CSSProperties = {
  borderBottom: '1px solid var(--mo-border)',
  padding: '8px 12px',
};

const btnStyle: CSSProperties = {
  margin: '2px 4px 2px 0',
  padding: '4px 8px',
  fontSize: 11,
  cursor: 'pointer',
};

function TestPaneView({ ctx }: { ctx: PluginContext }) {
  const [layout, setLayout] = useState(ctx.workbench.getLayoutState());

  const refreshLayout = () => setLayout(ctx.workbench.getLayoutState());

  const section = (title: string, children: ReactNode) => (
    <section style={sectionStyle}>
      <div style={{ fontSize: 11, color: 'var(--mo-fg-muted)', marginBottom: 6 }}>{title}</div>
      {children}
    </section>
  );

  return (
    <div data-testid="test-pane" style={{ fontSize: 12, overflow: 'auto', height: '100%' }}>
      {section(
        'Layout',
        <>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setSidebarVisible(!layout.sidebarVisible);
              refreshLayout();
            }}
          >
            Sidebar {layout.sidebarVisible ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setPanelVisible(!layout.panelVisible);
              refreshLayout();
            }}
          >
            Panel {layout.panelVisible ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setMenuBarVisible(!layout.menuBarVisible);
              refreshLayout();
            }}
          >
            MenuBar {layout.menuBarVisible ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setStatusBarVisible(!layout.statusBarVisible);
              refreshLayout();
            }}
          >
            StatusBar {layout.statusBarVisible ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setAuxiliaryBarVisible(!layout.auxiliaryBarVisible);
              refreshLayout();
            }}
          >
            AI {layout.auxiliaryBarVisible ? 'Hide' : 'Show'}
          </button>
        </>
      )}

      {section(
        'Status Bar',
        <>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              const id = `test-${Date.now()}`;
              ctx.workbench.setStatusBarItem({
                id,
                text: `Item ${id.slice(-4)}`,
                alignment: 'right',
              });
            }}
          >
            Add item
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => ctx.workbench.showNotification('Hello from Test Pane', 'info')}
          >
            Toast
          </button>
        </>
      )}

      {section(
        'Panel / Output',
        <>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              ctx.workbench.setPanelVisible(true);
              ctx.workbench.appendPanelLog('output', `[test] log ${Date.now()}`);
              refreshLayout();
            }}
          >
            Log to Output
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => void ctx.commands.executeCommand('panel.showTerminal')}
          >
            Focus Terminal
          </button>
        </>
      )}

      {section(
        'Editor / Workspace',
        <>
          <button
            type="button"
            style={btnStyle}
            onClick={() =>
              void ctx.editor.openDocument({
                uri: 'README.md',
                languageId: 'markdown',
                content: '# Opened from Test Pane\n',
              })
            }
          >
            Open README
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => void ctx.commands.executeCommand('explorer.refresh')}
          >
            Explorer refresh
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => void ctx.commands.executeCommand('workbench.showCommands')}
          >
            Command palette
          </button>
        </>
      )}

      <section style={{ padding: '8px 12px', color: 'var(--mo-fg-muted)', fontSize: 11 }}>
        Files: {ctx.workspace.listFiles().length}
      </section>
    </div>
  );
}

let testCtx: PluginContext | null = null;

export const testPanePlugin: PluginModule = {
  manifest: {
    id: 'easyspace.testPane',
    name: 'Test Pane',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'testPane', name: 'Test', location: 'sidebar', icon: '⚙' }],
      commands: [{ id: 'testPane.open', title: 'Test Pane: Open' }],
    },
  },
  activate(ctx) {
    testCtx = ctx;
    ctx.workbench.registerView('sidebar', 'testPane', () => {
      if (!testCtx) return null;
      return <TestPaneView ctx={testCtx} />;
    });

    ctx.commands.registerCommand('testPane.open', async () => {
      ctx.workbench.setSidebarVisible(true);
      ctx.workbench.showNotification('Switch to Test view in the activity bar');
    });
  },
};

export default testPanePlugin;
