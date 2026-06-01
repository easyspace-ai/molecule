export type EventHandler<T = void> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler<unknown>);
    return () => set.delete(handler as EventHandler<unknown>);
  }

  emit<T>(event: string, payload?: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const KernelEvents = {
  BeforeInit: 'kernel.beforeInit',
  AfterInit: 'kernel.afterInit',
  BeforePluginsLoad: 'kernel.beforePluginsLoad',
  AfterPluginsLoad: 'kernel.afterPluginsLoad',
  PluginActivated: 'kernel.pluginActivated',
} as const;
