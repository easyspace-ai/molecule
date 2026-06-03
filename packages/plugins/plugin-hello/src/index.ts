import type { PluginModule } from '@jiulimiai/plugin-api';
import { defaultL10n } from '@jiulimiai/plugin-api';

export const helloPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.hello',
    name: 'Hello',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      commands: [{ id: 'hello.greet', title: defaultL10n.t('hello.greet.title', 'Hello: Greet') }],
    },
  },
  activate(ctx) {
    ctx.commands.registerCommand('hello.greet', () => {
      ctx.workbench.showNotification(defaultL10n.t('hello.notification'));
      return 'ok';
    });
    ctx.workbench.setStatusBarItem({
      id: 'hello-status',
      text: 'Molecule Next',
      alignment: 'left',
      priority: 100,
    });
  },
};

export default helloPlugin;
