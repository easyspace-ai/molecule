import {
  Button,
  Icon_Puzzle,
  resolveActivityIcon,
  ScrollArea,
  Textarea,
} from '@easyspace/ui';
import { useCallback, useState } from 'react';

import type { ExtensionDetailData } from '@easyspace/plugin-api';

const DISABLED_EXTENSIONS_KEY = 'molecule:disabled-extensions';
const EXTENSION_CONFIG_KEY_PREFIX = 'molecule:extension-config:';

function getExtensionConfig(id: string): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${EXTENSION_CONFIG_KEY_PREFIX}${id}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function setExtensionConfigLocal(id: string, config: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${EXTENSION_CONFIG_KEY_PREFIX}${id}`, JSON.stringify(config));
}

function setExtensionEnabledLocal(id: string, enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  let disabled: string[] = [];
  try {
    const raw = localStorage.getItem(DISABLED_EXTENSIONS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      disabled = Array.isArray(parsed) ? parsed.map(String) : [];
    }
  } catch {
    disabled = [];
  }
  const set = new Set(disabled);
  if (enabled) set.delete(id);
  else set.add(id);
  localStorage.setItem(DISABLED_EXTENSIONS_KEY, JSON.stringify([...set]));
}

function renderSimpleMarkdown(text: string): JSX.Element {
  const lines = text.split('\n');
  return (
    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="mb-2 mt-4 text-lg font-semibold">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="mb-2 mt-3 text-base font-semibold">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="mb-1 mt-2 text-sm font-semibold">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">
              {line.slice(2)}
            </li>
          );
        }
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export interface ExtensionDetailTabProps {
  detail: ExtensionDetailData;
  onToggleEnabled?: (extensionId: string, enabled: boolean) => void;
}

export function ExtensionDetailTab({ detail, onToggleEnabled }: ExtensionDetailTabProps) {
  const [configJson, setConfigJson] = useState(() =>
    JSON.stringify(getExtensionConfig(detail.extensionId), null, 2)
  );
  const [configError, setConfigError] = useState<string | null>(null);

  const toggleEnabled = useCallback(() => {
    const next = !detail.enabled;
    setExtensionEnabledLocal(detail.extensionId, next);
    onToggleEnabled?.(detail.extensionId, next);
  }, [detail.enabled, detail.extensionId, onToggleEnabled]);

  const saveConfig = useCallback(() => {
    try {
      const parsed = JSON.parse(configJson) as Record<string, unknown>;
      setExtensionConfigLocal(detail.extensionId, parsed);
      setConfigError(null);
    } catch {
      setConfigError('Invalid JSON');
    }
  }, [configJson, detail.extensionId]);

  const readme = detail.readme ?? detail.description ?? 'No description provided.';

  return (
    <div
      className="flex h-full min-h-0 bg-background text-foreground"
      data-testid={`extension-detail-${detail.extensionId}`}
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <header className="mb-4 flex flex-wrap items-start gap-3 border-b border-border pb-4">
            <span className="shrink-0 text-foreground" aria-hidden>
              {detail.icon ? (
                resolveActivityIcon(detail.icon, detail.extensionId, 'size-8')
              ) : (
                <Icon_Puzzle className="size-8" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold" data-testid="extension-detail-name">
                {detail.name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                    detail.enabled
                      ? 'bg-accent/20 text-accent'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  data-testid="extension-detail-enabled-badge"
                >
                  {detail.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="inline-flex rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  v{detail.version}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="extension-detail-toggle"
              onClick={toggleEnabled}
            >
              {detail.enabled ? 'Disable' : 'Enable'}
            </Button>
          </header>
          {renderSimpleMarkdown(readme)}
          {detail.configuration && Object.keys(detail.configuration).length > 0 && (
            <section className="mt-6" data-testid="extension-detail-config">
              <h2 className="mb-2 text-base font-semibold">Configuration</h2>
              <Textarea
                className="min-h-[120px] font-mono text-xs"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                spellCheck={false}
              />
              {configError && <p className="mt-1 text-sm text-destructive">{configError}</p>}
              <Button type="button" className="mt-2" size="sm" onClick={saveConfig}>
                Save configuration
              </Button>
            </section>
          )}
        </div>
      </ScrollArea>
      <aside
        className="w-56 shrink-0 border-l border-border bg-muted/30 p-4"
        data-testid="extension-detail-metadata"
      >
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Extension Details
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Extension ID</dt>
            <dd className="break-all font-mono text-xs" data-testid="extension-detail-id">
              {detail.extensionId}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Version</dt>
            <dd data-testid="extension-detail-version">{detail.version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd data-testid="extension-detail-type">{detail.type ?? 'extension'}</dd>
          </div>
          {detail.publisher && (
            <div>
              <dt className="text-xs text-muted-foreground">Publisher</dt>
              <dd>{detail.publisher}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  );
}
