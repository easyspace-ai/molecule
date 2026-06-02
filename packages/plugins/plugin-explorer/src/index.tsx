import type { PluginModule, WorkspaceFile } from '@easyspace/plugin-api';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  FileTree,
  type FileTreeNode,
  FileTypeIcon,
  Icon_FilePlus,
  Icon_Folder,
  Icon_FolderPlus,
  Icon_RefreshCw,
  ScrollArea,
} from '@easyspace/ui';
import { useCallback, useEffect, useState } from 'react';

type ExplorerWorkspace = {
  getRoot: () => string;
  listDirectory: (path?: string) => Promise<WorkspaceFile[]>;
  readFile: (path: string) => Promise<string>;
  createFile: (path: string, content?: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deletePath: (path: string) => Promise<void>;
  renamePath: (oldPath: string, newPath: string) => Promise<void>;
};

type ExplorerEditor = {
  openDocument: (doc: { uri: string; languageId: string; content: string }) => Promise<void>;
};

type ExplorerUI = {
  showInputBox: (prompt: string) => Promise<string | undefined>;
};

function fileIcon(name: string, isDirectory: boolean, isOpen?: boolean) {
  return <FileTypeIcon name={name} isDirectory={isDirectory} isOpen={isOpen} className="size-3.5" />;
}

function toTreeNodes(files: WorkspaceFile[]): FileTreeNode[] {
  return files.map((f) => ({
    path: f.path,
    name: f.name,
    isDirectory: f.isDirectory,
    children: f.children ? toTreeNodes(f.children) : undefined,
  }));
}

function langForPath(path: string): string {
  const ext = path.split('.').pop() ?? '';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  return 'plaintext';
}

function joinPath(base: string | undefined, name: string): string {
  const trimmed = name.trim().replace(/^\/+/, '');
  if (!trimmed) throw new Error('Invalid name');
  return base ? `${base}/${trimmed}` : trimmed;
}

function ExplorerView({
  workspace,
  editor,
  ui,
}: {
  workspace: ExplorerWorkspace;
  editor: ExplorerEditor;
  ui: ExplorerUI;
}) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextTarget, setContextTarget] = useState<WorkspaceFile | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const rootLabel = workspace.getRoot().replace(/^\//, '') || '.';

  const refresh = useCallback(async () => {
    setFiles(await workspace.listDirectory());
  }, [workspace]);

  const onOpen = useCallback(
    async (path: string) => {
      const content = await workspace.readFile(path);
      await editor.openDocument({ uri: path, languageId: langForPath(path), content });
    },
    [workspace, editor]
  );

  const handleNewFile = useCallback(
    async (basePath?: string) => {
      const name = await ui.showInputBox('New file name');
      if (!name) return;
      try {
        const path = joinPath(basePath, name);
        await workspace.createFile(path, '');
        if (basePath) setExpanded((p) => new Set(p).add(basePath));
        await refresh();
        await onOpen(path);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to create file');
      }
    },
    [ui, workspace, refresh, onOpen]
  );

  const handleNewFolder = useCallback(
    async (basePath?: string) => {
      const name = await ui.showInputBox('New folder name');
      if (!name) return;
      try {
        const path = joinPath(basePath, name);
        await workspace.createDirectory(path);
        if (basePath) setExpanded((p) => new Set(p).add(basePath));
        setExpanded((p) => new Set(p).add(path));
        await refresh();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to create folder');
      }
    },
    [ui, workspace, refresh]
  );

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    const onNewFile = () => void handleNewFile();
    const onNewFolder = () => void handleNewFolder();
    window.addEventListener('molecule:explorer-refresh', onRefresh);
    window.addEventListener('molecule:explorer-new-file', onNewFile);
    window.addEventListener('molecule:explorer-new-folder', onNewFolder);
    return () => {
      window.removeEventListener('molecule:explorer-refresh', onRefresh);
      window.removeEventListener('molecule:explorer-new-file', onNewFile);
      window.removeEventListener('molecule:explorer-new-folder', onNewFolder);
    };
  }, [refresh, handleNewFile, handleNewFolder]);

  const notifyDeleted = (paths: string[]) => {
    window.dispatchEvent(new CustomEvent('molecule:file-deleted', { detail: { paths } }));
  };

  const notifyRenamed = (oldPath: string, newPath: string) => {
    window.dispatchEvent(new CustomEvent('molecule:file-renamed', { detail: { oldPath, newPath } }));
  };

  const handleDelete = async (item: WorkspaceFile) => {
    const label = item.isDirectory ? `folder "${item.name}"` : `file "${item.name}"`;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      await workspace.deletePath(item.path);
      notifyDeleted([item.path]);
      if (selectedPath === item.path) setSelectedPath(null);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleRenameSubmit = async (path: string, newName: string) => {
    setRenamingPath(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === path.split('/').pop()) return;
    const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : undefined;
    try {
      const newPath = joinPath(parent, trimmed);
      await workspace.renamePath(path, newPath);
      notifyRenamed(path, newPath);
      if (selectedPath === path) setSelectedPath(newPath);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to rename');
    }
  };

  const handleContextAction = async (action: string, item: WorkspaceFile | null) => {
    const basePath = item?.isDirectory ? item.path : item ? item.path.slice(0, item.path.lastIndexOf('/')) : undefined;
    if (action === 'newFile') await handleNewFile(basePath || undefined);
    if (action === 'newFolder') await handleNewFolder(basePath || undefined);
    if (action === 'rename' && item) {
      setSelectedPath(item.path);
      setRenamingPath(item.path);
      setRenameValue(item.name);
    }
    if (action === 'delete' && item) await handleDelete(item);
  };

  const findFile = (path: string, list: WorkspaceFile[]): WorkspaceFile | null => {
    for (const f of list) {
      if (f.path === path) return f;
      if (f.children) {
        const found = findFile(path, f.children);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col" data-testid="explorer-view">
      <div
        className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5"
        data-testid="explorer-toolbar"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground" title={rootLabel}>
          <Icon_Folder className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">./{rootLabel === '.' ? '' : rootLabel}</span>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" title="New File" data-testid="explorer-new-file" onClick={() => void handleNewFile()}>
          <Icon_FilePlus className="size-3.5" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="New Folder" data-testid="explorer-new-folder" onClick={() => void handleNewFolder()}>
          <Icon_FolderPlus className="size-3.5" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Refresh" data-testid="explorer-refresh" onClick={() => void refresh()}>
          <Icon_RefreshCw className="size-3.5" aria-hidden />
        </Button>
      </div>

      <ContextMenu
        onOpenChange={(open) => {
          if (!open) setContextTarget(null);
        }}
      >
        <ContextMenuTrigger asChild>
          <ScrollArea className="min-h-0 flex-1" data-testid="explorer-tree">
            <FileTree
              nodes={toTreeNodes(files)}
              selectedPath={selectedPath}
              expandedPaths={expanded}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onToggle={(path) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                })
              }
              onSelect={setSelectedPath}
              onOpen={onOpen}
              onRenameChange={setRenameValue}
              onRenameSubmit={(path, name) => void handleRenameSubmit(path, name)}
              onRenameCancel={() => setRenamingPath(null)}
              renderIcon={(node) => fileIcon(node.name, node.isDirectory, expanded.has(node.path))}
              onContextMenu={(e, node) => {
                e.preventDefault();
                const item = findFile(node.path, files);
                setContextTarget(item ?? { path: node.path, name: node.name, isDirectory: node.isDirectory });
              }}
            />
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid="explorer-context-menu">
          {(contextTarget?.isDirectory ?? true) && (
            <>
              <ContextMenuItem onClick={() => void handleContextAction('newFile', contextTarget)}>New File</ContextMenuItem>
              <ContextMenuItem onClick={() => void handleContextAction('newFolder', contextTarget)}>New Folder</ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          {contextTarget && (
            <>
              <ContextMenuItem onClick={() => void handleContextAction('rename', contextTarget)}>Rename</ContextMenuItem>
              <ContextMenuItem onClick={() => void handleContextAction('delete', contextTarget)}>Delete</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

let explorerApi: {
  workspace: ExplorerWorkspace;
  editor: ExplorerEditor;
  ui: ExplorerUI;
} | null = null;

export const explorerPlugin: PluginModule = {
  manifest: {
    id: 'easyspace.explorer',
    name: 'Explorer',
    version: '0.2.0',
    activationEvents: ['onStartup'],
    contributes: {
      views: [{ id: 'explorer', name: 'Explorer', location: 'sidebar', icon: 'explorer' }],
      commands: [
        { id: 'explorer.refresh', title: 'Explorer: Refresh' },
        { id: 'explorer.newFile', title: 'Explorer: New File' },
        { id: 'explorer.newFolder', title: 'Explorer: New Folder' },
      ],
    },
  },
  activate(ctx) {
    explorerApi = {
      workspace: {
        getRoot: () => ctx.workspace.getRoot(),
        listDirectory: (p) => ctx.workspace.listDirectory(p),
        readFile: (p) => ctx.workspace.readFile(p),
        createFile: (p, c) => ctx.workspace.createFile(p, c),
        createDirectory: (p) => ctx.workspace.createDirectory(p),
        deletePath: (p) => ctx.workspace.deletePath(p),
        renamePath: (a, b) => ctx.workspace.renamePath(a, b),
      },
      editor: { openDocument: (doc) => ctx.editor.openDocument(doc) },
      ui: { showInputBox: (prompt) => ctx.ui.showInputBox(prompt) },
    };

    ctx.workbench.registerView('sidebar', 'explorer', () => {
      if (!explorerApi) return null;
      return (
        <ExplorerView
          workspace={explorerApi.workspace}
          editor={explorerApi.editor}
          ui={explorerApi.ui}
        />
      );
    });

    ctx.commands.registerCommand('explorer.refresh', async () => {
      window.dispatchEvent(new CustomEvent('molecule:explorer-refresh'));
      ctx.workbench.appendPanelLog('output', '[Explorer] tree refreshed');
    });

    ctx.commands.registerCommand('explorer.newFile', () => {
      window.dispatchEvent(new CustomEvent('molecule:explorer-new-file'));
    });

    ctx.commands.registerCommand('explorer.newFolder', () => {
      window.dispatchEvent(new CustomEvent('molecule:explorer-new-folder'));
    });
  },
};

export default explorerPlugin;
