import type { PluginModule, ExtensionDetailData } from '@jiulimiai/plugin-api';
import {
  fetchExtensionCatalog,
  fetchExtensionIndex,
  installExtension,
  setExtensionEnabled,
  uninstallExtension,
  type ExtensionCatalogEntry,
} from '@jiulimiai/plugin-runtime';
import { Button, Input, ScrollArea, cn, Icon_Puzzle, resolveActivityIcon } from '@jiulimiai/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
      className="flex gap-2 border-b border-border px-3 py-2 hover:bg-foreground/5"
      data-testid={`extension-${entry.id}`}
      onDoubleClick={() => onOpenDetail(entry)}
    >
      <span className="flex shrink-0 items-center text-lg" aria-hidden>
        {entry.icon ? resolveActivityIcon(entry.icon, entry.id, 'size-5') : <Icon_Puzzle className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{entry.name}</span>
          <span className="text-xs text-muted-foreground">v{entry.version}</span>
          {entry.installed && entry.enabled && (
            <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] text-success" data-testid={`extension-badge-${entry.id}`}>
              Enabled
            </span>
          )}
          {entry.installed && !entry.enabled && (
            <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px]">Disabled</span>
          )}
        </div>
        {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
        <p className="font-mono text-[10px] text-muted-foreground">{entry.id}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {entry.installed ? (
          <>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" data-testid={`extension-toggle-${entry.id}`} onClick={() => onToggle(entry)}>
              {entry.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" data-testid={`extension-update-${entry.id}`} onClick={() => onUpdate(entry)}>
              Update
            </Button>
            <Button type="button" variant="destructive" size="sm" className="h-7 text-xs" data-testid={`extension-uninstall-${entry.id}`} onClick={() => onUninstall(entry)}>
              Uninstall
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" className="h-7 text-xs" data-testid={`extension-install-${entry.id}`} onClick={() => onInstall(entry)}>
            Install
          </Button>
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
    <div className="flex h-full flex-col" data-testid="extensions-view">
      <div className="flex border-b border-border" data-testid="extensions-tabs">
        <button
          type="button"
          className={cn(
            'flex-1 px-2 py-1.5 text-xs',
            tab === 'installed' && 'border-b-2 border-b-accent bg-background'
          )}
          data-testid="extensions-tab-installed"
          onClick={() => setTab('installed')}
        >
          Installed ({installedCount})
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 px-2 py-1.5 text-xs',
            tab === 'available' && 'border-b-2 border-b-accent bg-background'
          )}
          data-testid="extensions-tab-available"
          onClick={() => setTab('available')}
        >
          Available ({availableCount})
        </button>
      </div>
      <div className="flex gap-2 border-b border-border p-2">
        <Input
          type="search"
          placeholder="Search extensions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="extensions-search"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" data-testid="extensions-reload" title="Reload window to apply extension changes" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
      <ScrollArea className="flex-1" data-testid="extensions-list">
        {loading && <div className="p-3 text-sm text-muted-foreground">Loading extensions…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-3 text-sm text-muted-foreground">No extensions found</div>
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
      </ScrollArea>
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
      views: [{ id: 'extensions', name: 'Extensions', location: 'sidebar', icon: 'extensions' }],
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
