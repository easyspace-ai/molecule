import type { PluginModule, ExtensionDetailData } from '@easyspace/plugin-api';
import {
  fetchExtensionCatalog,
  fetchExtensionIndex,
  installExtension,
  setExtensionEnabled,
  uninstallExtension,
  type ExtensionCatalogEntry,
} from '@easyspace/plugin-runtime';
import { useCallback, useEffect, useMemo, useState } from 'react';

import './extensions.css';

type MarketplaceTab = 'installed' | 'available';

function toDetailData(entry: ExtensionCatalogEntry): ExtensionDetailData {
  return {
    extensionId: entry.id,
    name: entry.name,
    version: entry.version,
    description: entry.description,
    readme: entry.readme,
    icon: entry.icon,
    enabled: entry.enabled,
    installed: entry.installed,
    type: entry.type,
    publisher: entry.publisher,
    configuration: entry.configuration,
  };
}

function ExtensionCard({
  entry,
  onToggle,
  onInstall,
  onUninstall,
  onUpdate,
  onOpenDetail,
}: {
  entry: ExtensionCatalogEntry;
  onToggle: (entry: ExtensionCatalogEntry) => void;
  onInstall: (entry: ExtensionCatalogEntry) => void;
  onUninstall: (entry: ExtensionCatalogEntry) => void;
  onUpdate: (entry: ExtensionCatalogEntry) => void;
  onOpenDetail: (entry: ExtensionCatalogEntry) => void;
}) {
  return (
    <div
      className="mo-extensions__card"
      data-testid={`extension-${entry.id}`}
      onDoubleClick={() => onOpenDetail(entry)}
    >
      <span className="mo-extensions__icon" aria-hidden>
        {entry.icon ?? '⊞'}
      </span>
      <div className="mo-extensions__meta">
        <div className="mo-extensions__name-row">
          <span className="mo-extensions__name">{entry.name}</span>
          <span className="mo-extensions__version">v{entry.version}</span>
          {entry.installed && entry.enabled && (
            <span className="mo-extensions__badge mo-extensions__badge--enabled" data-testid={`extension-badge-${entry.id}`}>
              Enabled
            </span>
          )}
          {entry.installed && !entry.enabled && (
            <span className="mo-extensions__badge">Disabled</span>
          )}
        </div>
        {entry.description && <p className="mo-extensions__desc">{entry.description}</p>}
        <p className="mo-extensions__id">{entry.id}</p>
      </div>
      <div className="mo-extensions__actions">
        {entry.installed ? (
          <>
            <button
              type="button"
              className="mo-extensions__action"
              data-testid={`extension-toggle-${entry.id}`}
              onClick={() => onToggle(entry)}
            >
              {entry.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              className="mo-extensions__action"
              data-testid={`extension-update-${entry.id}`}
              onClick={() => onUpdate(entry)}
            >
              Update
            </button>
            <button
              type="button"
              className="mo-extensions__action mo-extensions__action--danger"
              data-testid={`extension-uninstall-${entry.id}`}
              onClick={() => onUninstall(entry)}
            >
              Uninstall
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mo-extensions__action mo-extensions__action--primary"
            data-testid={`extension-install-${entry.id}`}
            onClick={() => onInstall(entry)}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}

function ExtensionsView({ extensionsBase }: { extensionsBase: string }) {
  const [entries, setEntries] = useState<ExtensionCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<MarketplaceTab>('installed');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchExtensionCatalog(extensionsBase));
    } finally {
      setLoading(false);
    }
  }, [extensionsBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesTab = tab === 'installed' ? entry.installed : !entry.installed;
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q) ||
        (entry.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, query, tab]);

  const installedCount = entries.filter((e) => e.installed).length;
  const availableCount = entries.filter((e) => !e.installed).length;

  const openDetail = (entry: ExtensionCatalogEntry) => {
    window.dispatchEvent(
      new CustomEvent('molecule:open-extension-detail', { detail: toDetailData(entry) })
    );
  };

  const toggle = async (entry: ExtensionCatalogEntry) => {
    setExtensionEnabled(entry.id, !entry.enabled);
    await load();
  };

  const install = async (entry: ExtensionCatalogEntry) => {
    const index = await fetchExtensionIndex(extensionsBase);
    const catalogIds = index.map((e) => e.id);
    const availableOnlyIds = index.filter((e) => e.availableOnly).map((e) => e.id);
    installExtension(entry.id, catalogIds, availableOnlyIds);
    await load();
  };

  const uninstall = async (entry: ExtensionCatalogEntry) => {
    const index = await fetchExtensionIndex(extensionsBase);
    const catalogIds = index.map((e) => e.id);
    const availableOnlyIds = index.filter((e) => e.availableOnly).map((e) => e.id);
    uninstallExtension(entry.id, catalogIds, availableOnlyIds);
    await load();
  };

  const update = (entry: ExtensionCatalogEntry) => {
    window.dispatchEvent(
      new CustomEvent('molecule:extension-update-stub', {
        detail: { id: entry.id, name: entry.name },
      })
    );
  };

  return (
    <div className="mo-extensions" data-testid="extensions-view">
      <div className="mo-extensions__tabs" data-testid="extensions-tabs">
        <button
          type="button"
          className={`mo-extensions__tab${tab === 'installed' ? ' mo-extensions__tab--active' : ''}`}
          data-testid="extensions-tab-installed"
          onClick={() => setTab('installed')}
        >
          Installed ({installedCount})
        </button>
        <button
          type="button"
          className={`mo-extensions__tab${tab === 'available' ? ' mo-extensions__tab--active' : ''}`}
          data-testid="extensions-tab-available"
          onClick={() => setTab('available')}
        >
          Available ({availableCount})
        </button>
      </div>
      <div className="mo-extensions__header">
        <input
          className="mo-extensions__search"
          type="search"
          placeholder="Search extensions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="extensions-search"
        />
        <button
          type="button"
          className="mo-extensions__reload"
          data-testid="extensions-reload"
          title="Reload window to apply extension changes"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
      <div className="mo-extensions__list" data-testid="extensions-list">
        {loading && <div className="mo-extensions__loading">Loading extensions…</div>}
        {!loading && filtered.length === 0 && (
          <div className="mo-extensions__empty">No extensions found</div>
        )}
        {!loading &&
          filtered.map((entry) => (
            <ExtensionCard
              key={entry.id}
              entry={entry}
              onToggle={toggle}
              onInstall={install}
              onUninstall={uninstall}
              onUpdate={update}
              onOpenDetail={openDetail}
            />
          ))}
      </div>
    </div>
  );
}

let extensionsBaseUrl = '/extensions';

export const extensionsPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.extensions',
    name: 'Extensions',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'extensions', name: 'Extensions', location: 'sidebar', icon: '⊞' }],
      commands: [{ id: 'extensions.focus', title: 'View: Show Extensions' }],
      keybindings: [{ command: 'extensions.focus', key: 'ctrl+shift+x' }],
    },
  },
  activate(ctx) {
    ctx.workbench.registerView('sidebar', 'extensions', () => (
      <ExtensionsView extensionsBase={extensionsBaseUrl} />
    ));

    ctx.commands.registerCommand('extensions.focus', () => {
      ctx.workbench.setSidebarVisible(true);
      window.dispatchEvent(
        new CustomEvent('molecule:focus-sidebar-view', { detail: { viewId: 'extensions' } })
      );
    });
  },
};

export function setExtensionsBaseUrl(base: string): void {
  extensionsBaseUrl = base;
}

export function openExtensionDetail(detail: ExtensionDetailData): void {
  window.dispatchEvent(new CustomEvent('molecule:open-extension-detail', { detail }));
}

export default extensionsPlugin;
