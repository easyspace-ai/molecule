// apps/reference-ide/extensions-src/hello/index.ts
var plugin = {
  manifest: {
    id: "hello-extension",
    name: "Hello Extension",
    version: "0.1.0",
    activationEvents: ["onStartup"],
    contributes: {
      commands: [{ id: "helloExtension.ping", title: "Hello Extension: Ping" }]
    }
  },
  activate(ctx) {
    ctx.commands.registerCommand("helloExtension.ping", () => {
      ctx.workbench.showNotification("Hello from bundled extension!", "info");
    });
    ctx.workbench.setStatusBarItem({
      id: "hello-extension-status",
      text: "ext:hello",
      alignment: "right",
      priority: 5
    });
  }
};
var index_default = plugin;
export {
  index_default as default
};
