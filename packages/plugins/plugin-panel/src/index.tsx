import type { PluginModule } from '@jiulimiai/plugin-api';
import { ScrollArea } from '@jiulimiai/ui';
import { useWorkbenchStore } from '@jiulimiai/workbench';

function OutputView() {
  const logs = useWorkbenchStore((s) => s.panelLogs.output ?? []);
  return (
    <ScrollArea className="h-full">
      <div data-testid="panel-output" className="p-2 font-mono text-xs">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </ScrollArea>
  );
}

export const panelPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.panel',
    name: 'Panel',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'output', name: 'Output', location: 'panel' }],
      commands: [{ id: 'panel.showOutput', title: 'View: Show Output' }],
    },
  },
  activate(ctx) {
    ctx.workbench.registerView('panel', 'output', () => <OutputView />);

    ctx.commands.registerCommand('panel.showOutput', async () => {
      ctx.workbench.setPanelVisible(true);
      ctx.workbench.appendPanelLog('output', `[${new Date().toLocaleTimeString()}] Output panel focused`);
    });

    ctx.workbench.appendPanelLog('output', '[Panel] Reference IDE ready');
  },
};

export default panelPlugin;
