import type { PluginContext, PluginModule } from '@easyspace/plugin-api';
import { Button, ScrollArea } from '@easyspace/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';

function TestPaneView({ ctx }: { ctx: PluginContext }) {
  const [layout, setLayout] = useState(ctx.workbench.getLayoutState());

  const refreshLayout = () => setLayout(ctx.workbench.getLayoutState());

  const section = (title: string, children: ReactNode) => (
    <section className="border-b border-border px-3 py-2">
      <div className="mb-1.5 text-[11px] uppercase text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );

  return (
    <ScrollArea className="h-full">
      <div data-testid="test-pane" className="text-xs">
        {section(
          'Layout',
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => { ctx.workbench.setSidebarVisible(!layout.sidebarVisible); refreshLayout(); }}>
              Sidebar {layout.sidebarVisible ? 'Hide' : 'Show'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { ctx.workbench.setPanelVisible(!layout.panelVisible); refreshLayout(); }}>
              Panel {layout.panelVisible ? 'Hide' : 'Show'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { ctx.workbench.setMenuBarVisible(!layout.menuBarVisible); refreshLayout(); }}>
              MenuBar {layout.menuBarVisible ? 'Hide' : 'Show'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { ctx.workbench.setStatusBarVisible(!layout.statusBarVisible); refreshLayout(); }}>
              StatusBar {layout.statusBarVisible ? 'Hide' : 'Show'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { ctx.workbench.setAuxiliaryBarVisible(!layout.auxiliaryBarVisible); refreshLayout(); }}>
              AI {layout.auxiliaryBarVisible ? 'Hide' : 'Show'}
            </Button>
          </>
        )}

        {section(
          'Status Bar',
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              const id = `test-${Date.now()}`;
              ctx.workbench.setStatusBarItem({ id, text: `Item ${id.slice(-4)}`, alignment: 'right' });
            }}>
              Add item
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => ctx.workbench.showNotification('Hello from Test Pane', 'info')}>
              Toast
            </Button>
          </>
        )}

        {section(
          'Panel / Output',
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              ctx.workbench.setPanelVisible(true);
              ctx.workbench.appendPanelLog('output', `[test] log ${Date.now()}`);
              refreshLayout();
            }}>
              Log to Output
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void ctx.commands.executeCommand('panel.showTerminal')}>
              Focus Terminal
            </Button>
          </>
        )}

        {section(
          'Editor / Workspace',
          <>
            <Button type="button" variant="outline" size="sm" onClick={() =>
              void ctx.editor.openDocument({ uri: 'README.md', languageId: 'markdown', content: '# Opened from Test Pane\n' })
            }>
              Open README
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void ctx.commands.executeCommand('explorer.refresh')}>
              Explorer refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void ctx.commands.executeCommand('workbench.showCommands')}>
              Command palette
            </Button>
          </>
        )}

        <section className="px-3 py-2 text-[11px] text-muted-foreground">
          Files: {ctx.workspace.listFiles().length}
        </section>
      </div>
    </ScrollArea>
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
      views: [{ id: 'testPane', name: 'Test', location: 'sidebar', icon: 'test' }],
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
