import type { PluginModule, WorkspaceFile } from '@easyspace/plugin-api';
import { useCallback, useEffect, useRef, useState } from 'react';

import './explorer.css';

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

const FILE_ICONS: Record<string, string> = {
  ts: 'TS',
  tsx: 'TX',
  js: 'JS',
  jsx: 'JX',
  json: '{}',
  md: 'Md',
  html: '<>',
  css: '#',
  txt: '·',
};

function fileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '📁';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? '📄';
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

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h5l2 2h11v10H3z" />
    </svg>
  );
}

function IconFilePlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15h6" />
    </svg>
  );
}

function IconFolderPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h5l2 2h11v10H3z" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  item: WorkspaceFile | null;
}

function ContextMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onAction: (action: string, item: WorkspaceFile | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const item = menu.item;
  const isDir = item?.isDirectory ?? true;

  return (
    <div
      ref={ref}
      className="mo-explorer-context-menu"
      style={{ left: menu.x, top: menu.y }}
      data-testid="explorer-context-menu"
    >
      {isDir && (
        <>
          <button type="button" onClick={() => onAction('newFile', item)}>
            New File
          </button>
          <button type="button" onClick={() => onAction('newFolder', item)}>
            New Folder
          </button>
          <div className="mo-explorer-context-menu__separator" />
        </>
      )}
      {item && (
        <>
          <button type="button" onClick={() => onAction('rename', item)}>
            Rename
          </button>
          <button type="button" onClick={() => onAction('delete', item)}>
            Delete
          </button>
        </>
      )}
    </div>
  );
}

function TreeNode({
  file,
  depth,
  selectedPath,
  expanded,
  onToggle,
  onSelect,
  onOpen,
  onContextMenu,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
}: {
  file: WorkspaceFile;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, item: WorkspaceFile) => void;
  renamingPath: string | null;
  onRenameSubmit: (path: string, newName: string) => void;
  onRenameCancel: () => void;
}) {
  const isOpen = expanded.has(file.path);
  const isSelected = selectedPath === file.path;
  const isRenaming = renamingPath === file.path;
  const [renameValue, setRenameValue] = useState(file.name);

  useEffect(() => {
    if (isRenaming) setRenameValue(file.name);
  }, [isRenaming, file.name]);

  const paddingLeft = 8 + depth * 12;

  return (
    <li>
      <div
        className={`mo-tree-item${isSelected ? ' mo-tree-item--selected' : ''}`}
        style={{ paddingLeft }}
        data-testid={`tree-item-${file.path}`}
        onContextMenu={(e) => onContextMenu(e, file)}
      >
        <button
          type="button"
          className={`mo-tree-item__chevron${file.isDirectory ? '' : ' mo-tree-item__chevron--hidden'}`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (file.isDirectory) onToggle(file.path);
          }}
        >
          {file.isDirectory ? (isOpen ? '▼' : '▶') : ''}
        </button>
        <span className="mo-tree-item__icon" aria-hidden>
          {fileIcon(file.name, file.isDirectory)}
        </span>
        {isRenaming ? (
          <input
            className="mo-tree-item__rename"
            value={renameValue}
            autoFocus
            data-testid="explorer-rename-input"
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit(file.path, renameValue);
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={() => onRenameSubmit(file.path, renameValue)}
          />
        ) : (
          <button
            type="button"
            className="mo-tree-item__label"
            onClick={() => {
              onSelect(file.path);
              if (file.isDirectory) {
                onToggle(file.path);
              } else {
                void onOpen(file.path);
              }
            }}
          >
            {file.name}
            {file.isDirectory ? '/' : ''}
          </button>
        )}
      </div>
      {file.isDirectory && isOpen && file.children && file.children.length > 0 && (
        <ul>
          {file.children.map((child) => (
            <TreeNode
              key={child.path}
              file={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </ul>
      )}
    </li>
  );
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
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

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

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
    setContextMenu(null);
    const basePath = item?.isDirectory ? item.path : item ? item.path.slice(0, item.path.lastIndexOf('/')) : undefined;
    if (action === 'newFile') await handleNewFile(basePath || undefined);
    if (action === 'newFolder') await handleNewFolder(basePath || undefined);
    if (action === 'rename' && item) {
      setSelectedPath(item.path);
      setRenamingPath(item.path);
    }
    if (action === 'delete' && item) await handleDelete(item);
  };

  return (
    <div className="mo-explorer" data-testid="explorer-view">
      <div className="mo-explorer-toolbar" data-testid="explorer-toolbar">
        <div className="mo-explorer-toolbar__root" title={rootLabel}>
          <IconFolder />
          <span>./{rootLabel === '.' ? '' : rootLabel}</span>
        </div>
        <button
          type="button"
          className="mo-explorer-toolbar__btn"
          title="New File"
          data-testid="explorer-new-file"
          onClick={() => void handleNewFile()}
        >
          <IconFilePlus />
        </button>
        <button
          type="button"
          className="mo-explorer-toolbar__btn"
          title="New Folder"
          data-testid="explorer-new-folder"
          onClick={() => void handleNewFolder()}
        >
          <IconFolderPlus />
        </button>
        <button
          type="button"
          className="mo-explorer-toolbar__btn"
          title="Refresh"
          data-testid="explorer-refresh"
          onClick={() => void refresh()}
        >
          <IconRefresh />
        </button>
      </div>
      <div className="mo-explorer-tree" data-testid="explorer-tree">
        <ul>
          {files.map((file) => (
            <TreeNode
              key={file.path}
              file={file}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={setSelectedPath}
              onOpen={onOpen}
              onContextMenu={(e, item) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, item });
              }}
              renamingPath={renamingPath}
              onRenameSubmit={(path, name) => void handleRenameSubmit(path, name)}
              onRenameCancel={() => setRenamingPath(null)}
            />
          ))}
        </ul>
      </div>
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={(action, item) => void handleContextAction(action, item)}
        />
      )}
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
      views: [{ id: 'explorer', name: 'Explorer', location: 'sidebar', icon: '◫' }],
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
