import type { ConfigurationAPI, PluginModule, SearchMatch } from '@easyspace/plugin-api';
import { Button, Input, ScrollArea, Icon_Search } from '@easyspace/ui';
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
    <div data-testid="search-view" className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search in files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
          data-testid="search-input"
        />
        <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={useRegexProp}
            data-testid="search-use-regex"
            onChange={(e) => onUseRegexChange(e.target.checked)}
          />
          Use regular expression
        </label>
        <Button type="button" variant="secondary" size="sm" className="mt-1.5 w-full" onClick={() => void runSearch()}>
          <Icon_Search className="mr-1 size-3.5" aria-hidden />
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <ul>
          {results.map((r, i) => (
            <li key={`${r.path}:${r.line}:${i}`}>
              <button
                type="button"
                onClick={() => onOpen(r.path, r.line)}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-foreground/5"
              >
                <div className="text-accent">
                  {r.path}:{r.line}
                </div>
                <div className="font-mono text-muted-foreground">{r.text}</div>
              </button>
            </li>
          ))}
          {!loading && query && results.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No results</li>
          )}
        </ul>
      </ScrollArea>
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
      views: [{ id: 'search', name: 'Search', location: 'sidebar', icon: 'search' }],
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
