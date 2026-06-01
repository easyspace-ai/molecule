import { describe, expect, it } from 'vitest';

import {
  getInstalledExtensionIds,
  installExtension,
  resolveExtensionBase,
  uninstallExtension,
  validateExtensionManifest,
} from './extension-loader.js';

describe('resolveExtensionBase', () => {
  it('resolves relative extension paths to absolute URL', () => {
    const resolved = resolveExtensionBase('/extensions/hello/');
    expect(resolved).toMatch(/\/extensions\/hello\/$/);
    expect(() => new URL('index.js', resolved)).not.toThrow();
  });

  it('preserves absolute http base', () => {
    expect(resolveExtensionBase('https://cdn.example.com/ext/')).toBe(
      'https://cdn.example.com/ext/'
    );
  });
});

describe('validateExtensionManifest', () => {
  it('accepts valid manifest', () => {
    const manifest = validateExtensionManifest({
      id: 'sample-extension',
      name: 'Sample',
      version: '1.0.0',
      main: 'index.js',
      contributes: {
        commands: [{ id: 'sample.ping', title: 'Ping' }],
      },
    });
    expect(manifest.id).toBe('sample-extension');
  });

  it('accepts manifest v2 optional fields', () => {
    const manifest = validateExtensionManifest({
      id: 'calc-extension',
      name: 'Calculator',
      version: '0.1.0',
      main: 'index.js',
      icon: '🧮',
      description: 'A calculator',
      type: 'ui',
      publisher: 'Molecule',
      readme: '# Calculator\n\nSimple calc.',
      availableOnly: true,
      activityBar: { id: 'calc-activity', title: 'Calculator', icon: '🧮', viewId: 'calcPanel' },
      editorTab: { id: 'calc-detail', title: 'Calculator Details' },
      configuration: {
        precision: { type: 'number', default: 2, description: 'Decimal places' },
      },
      contributes: {
        views: [{ id: 'calcPanel', name: 'Calculator', location: 'sidebar', icon: '🧮' }],
      },
    });
    expect(manifest.icon).toBe('🧮');
    expect(manifest.activityBar?.viewId).toBe('calcPanel');
    expect(manifest.configuration?.precision?.type).toBe('number');
    expect(manifest.availableOnly).toBe(true);
  });

  it('rejects invalid manifest', () => {
    expect(() => validateExtensionManifest({ name: 'no-id', main: 'x.js' })).toThrow();
  });
});

describe('installed extensions persistence', () => {
  it('installs and uninstalls extension ids in localStorage', () => {
    const catalog = ['hello-extension', 'calc-extension'];
    const availableOnly = ['calc-extension'];
    localStorage.clear();
    expect(getInstalledExtensionIds(catalog, availableOnly)).toEqual(['hello-extension']);
    installExtension('calc-extension', catalog, availableOnly);
    expect(getInstalledExtensionIds(catalog, availableOnly)).toContain('calc-extension');
    uninstallExtension('calc-extension', catalog, availableOnly);
    expect(getInstalledExtensionIds(catalog, availableOnly)).not.toContain('calc-extension');
  });
});
