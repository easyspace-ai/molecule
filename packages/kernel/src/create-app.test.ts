import { describe, expect, it } from 'vitest';

import { createApp } from './create-app.js';
import { KernelEvents } from './events.js';

describe('createApp', () => {
  it('parses default config', () => {
    const app = createApp();
    expect(app.config.defaultLocale).toBe('en-US');
    expect(app.config.defaultThemeId).toBe('default');
  });

  it('emits lifecycle events', () => {
    const seen: string[] = [];
    const app = createApp();
    app.events.on(KernelEvents.BeforeInit, () => seen.push('before'));
    app.events.on(KernelEvents.AfterInit, () => seen.push('after'));
    createApp();
    expect(seen).toEqual([]);
    const app2 = createApp();
    app2.events.emit(KernelEvents.BeforeInit);
    expect(app2.plugins).toEqual([]);
  });
});
