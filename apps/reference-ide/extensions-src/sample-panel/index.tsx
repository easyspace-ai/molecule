import type { PluginModule } from '@easyspace/plugin-api';

const plugin: PluginModule = {
  manifest: {
    id: 'sample-panel-extension',
    name: 'Sample Panel',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'samplePanel', name: 'Sample Panel', location: 'sidebar', icon: '◈' }],
      commands: [{ id: 'samplePanel.greet', title: 'Sample Panel: Greet' }],
      localizations: [
        {
          locale: 'zh-CN',
          translations: { 'samplePanel.greet.message': '来自示例面板的问候！' },
        },
      ],
    },
  },
  activate(ctx) {
    ctx.workbench.registerView('sidebar', 'samplePanel', () => (
      <div data-testid="sample-panel-view" style={{ padding: 12, fontSize: 12 }}>
        <p>Sample extension sidebar view.</p>
        <button
          type="button"
          data-testid="sample-panel-greet-btn"
          onClick={() => void ctx.commands.executeCommand('samplePanel.greet')}
        >
          Run greet command
        </button>
      </div>
    ));

    ctx.commands.registerCommand('samplePanel.greet', () => {
      ctx.workbench.showNotification('Hello from sample-panel extension!', 'info');
    });
  },
};

export default plugin;
