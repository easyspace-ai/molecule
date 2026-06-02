import { resolveActivityIcon, Icon_Puzzle } from '@easyspace/ui';
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
    <div className="mo-extension-detail__readme">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="mo-extension-detail__h1">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="mo-extension-detail__h2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="mo-extension-detail__h3">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="mo-extension-detail__li">
              {line.slice(2)}
            </li>
          );
        }
        if (!line.trim()) {
          return <div key={i} className="mo-extension-detail__spacer" />;
        }
        return (
          <p key={i} className="mo-extension-detail__p">
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
    <div className="mo-extension-detail" data-testid={`extension-detail-${detail.extensionId}`}>
      <div className="mo-extension-detail__main">
        <header className="mo-extension-detail__header">
          <span className="mo-extension-detail__icon" aria-hidden>
            {detail.icon ? resolveActivityIcon(detail.icon, detail.extensionId, 'size-8') : <Icon_Puzzle className="size-8" aria-hidden />}
          </span>
          <div>
            <h1 className="mo-extension-detail__title" data-testid="extension-detail-name">
              {detail.name}
            </h1>
            <div className="mo-extension-detail__badges">
              <span
                className={`mo-extension-detail__badge${detail.enabled ? ' mo-extension-detail__badge--enabled' : ''}`}
                data-testid="extension-detail-enabled-badge"
              >
                {detail.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="mo-extension-detail__badge">v{detail.version}</span>
            </div>
          </div>
          <button
            type="button"
            className="mo-extension-detail__toggle"
            data-testid="extension-detail-toggle"
            onClick={toggleEnabled}
          >
            {detail.enabled ? 'Disable' : 'Enable'}
          </button>
        </header>
        {renderSimpleMarkdown(readme)}
        {detail.configuration && Object.keys(detail.configuration).length > 0 && (
          <section className="mo-extension-detail__config" data-testid="extension-detail-config">
            <h2 className="mo-extension-detail__h2">Configuration</h2>
            <textarea
              className="mo-extension-detail__config-editor"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              spellCheck={false}
            />
            {configError && <p className="mo-extension-detail__config-error">{configError}</p>}
            <button type="button" className="mo-extension-detail__config-save" onClick={saveConfig}>
              Save configuration
            </button>
          </section>
        )}
      </div>
      <aside className="mo-extension-detail__meta" data-testid="extension-detail-metadata">
        <h2 className="mo-extension-detail__meta-title">Extension Details</h2>
        <dl className="mo-extension-detail__dl">
          <dt>Extension ID</dt>
          <dd data-testid="extension-detail-id">{detail.extensionId}</dd>
          <dt>Version</dt>
          <dd data-testid="extension-detail-version">{detail.version}</dd>
          <dt>Type</dt>
          <dd data-testid="extension-detail-type">{detail.type ?? 'extension'}</dd>
          {detail.publisher && (
            <>
              <dt>Publisher</dt>
              <dd>{detail.publisher}</dd>
            </>
          )}
        </dl>
      </aside>
    </div>
  );
}
