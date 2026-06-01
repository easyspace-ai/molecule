import type { ConfigurationAPI, PluginModule, SearchMatch } from '@easyspace/plugin-api';
import { useCallback, useEffect, useRef, useState } from 'react';

function SearchViewHost({
  configuration,
  search,
  onOpen,
  onUseRegexChange,
}: {
  configuration?: ConfigurationAPI;
  search: (query: string, useRegex: boolean) => Promise<SearchMatch[]>;
  onOpen: (path: string, line: number) => void;
  onUseRegexChange: (value: boolean) => void;
}) {
  const [useRegex, setUseRegex] = useState(
    () => configuration?.get<boolean>('search.useRegex', false) ?? false
  );

  useEffect(() => {
    if (!configuration) return;
    const sub = configuration.onDidChange((e) => {
      if (e.key === 'search.useRegex' || e.key === '*') {
        setUseRegex(configuration.get<boolean>('search.useRegex', false));
      }
    });
    return () => sub.dispose();
  }, [configuration]);

  return (
    <SearchView
      search={search}
      useRegex={useRegex}
      onUseRegexChange={(value) => {
        setUseRegex(value);
        onUseRegexChange(value);
      }}
      onOpen={onOpen}
    />
  );
}

function SearchView({
  search,
  onOpen,
  useRegex: useRegexProp,
  onUseRegexChange,
}: {
  search: (query: string, useRegex: boolean) => Promise<SearchMatch[]>;
  onOpen: (path: string, line: number) => void;
  useRegex: boolean;
  onUseRegexChange: (value: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('molecule:focus-search', focus);
    return () => window.removeEventListener('molecule:focus-search', focus);
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      setResults(await search(query, useRegexProp));
    } finally {
      setLoading(false);
    }
  }, [query, search, useRegexProp]);

  return (
    <div data-testid="search-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 8, borderBottom: '1px solid var(--mo-border)' }}>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search in files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 8px',
            background: 'var(--mo-bg)',
            border: '1px solid var(--mo-border)',
            color: 'inherit',
            borderRadius: 4,
          }}
          data-testid="search-input"
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            fontSize: 11,
            color: 'var(--mo-fg-muted)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={useRegexProp}
            data-testid="search-use-regex"
            onChange={(e) => onUseRegexChange(e.target.checked)}
          />
          Use regular expression
        </label>
        <button
          type="button"
          onClick={() => void runSearch()}
          style={{ marginTop: 6, width: '100%', padding: '4px 8px', cursor: 'pointer' }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, overflow: 'auto' }}>
        {results.map((r, i) => (
          <li key={`${r.path}:${r.line}:${i}`}>
            <button
              type="button"
              onClick={() => onOpen(r.path, r.line)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <div style={{ color: 'var(--mo-accent)' }}>
                {r.path}:{r.line}
              </div>
              <div style={{ color: 'var(--mo-fg-muted)', fontFamily: 'var(--mo-font-mono)' }}>
                {r.text}
              </div>
            </button>
          </li>
        ))}
        {!loading && query && results.length === 0 && (
          <li style={{ padding: 12, color: 'var(--mo-fg-muted)' }}>No results</li>
        )}
      </ul>
    </div>
  );
}

let searchApi: {
  search: (query: string, useRegex: boolean) => Promise<SearchMatch[]>;
  openFile: (path: string) => Promise<void>;
  setUseRegex: (value: boolean) => void;
} | null = null;

export const searchPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.search',
    name: 'Search',
    version: '0.1.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'search', name: 'Search', location: 'sidebar', icon: '⌕' }],
      commands: [{ id: 'search.focus', title: 'Search: Focus' }],
      keybindings: [
        { command: 'search.focus', key: 'ctrl+shift+f' },
        { command: 'search.focus', key: 'cmd+shift+f' },
      ],
    },
  },
  activate(ctx) {
    const langFor = (path: string) => {
      const ext = path.split('.').pop() ?? '';
      if (ext === 'ts' || ext === 'tsx') return 'typescript';
      if (ext === 'json') return 'json';
      if (ext === 'md') return 'markdown';
      return 'plaintext';
    };

    searchApi = {
      search: async (q, useRegex) => {
        if (ctx.configuration) {
          await ctx.configuration.update('search.useRegex', useRegex);
        }
        return ctx.workspace.searchInFiles(q);
      },
      setUseRegex: (value) => {
        if (ctx.configuration) void ctx.configuration.update('search.useRegex', value);
      },
      openFile: async (path) => {
        const content = await ctx.workspace.readFile(path);
        await ctx.editor.openDocument({ uri: path, languageId: langFor(path), content });
      },
    };

    ctx.workbench.registerView('sidebar', 'search', () => {
      if (!searchApi) return null;
      return (
        <SearchViewHost
          configuration={ctx.configuration}
          search={searchApi.search}
          onUseRegexChange={(value) => searchApi!.setUseRegex(value)}
          onOpen={(path) => void searchApi!.openFile(path)}
        />
      );
    });

    ctx.commands.registerCommand('workbench.action.focusSearch', () => {
      ctx.workbench.setSidebarVisible(true);
      window.dispatchEvent(new CustomEvent('molecule:focus-search'));
    });

    ctx.commands.registerCommand('search.focus', async () => {
      ctx.workbench.setSidebarVisible(true);
      window.dispatchEvent(new CustomEvent('molecule:focus-search'));
    });
  },
};

export default searchPlugin;
