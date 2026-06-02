import type { ReactNode } from 'react';
import { Icon_ChevronDown, Icon_ChevronRight } from '../icons/lucide-icons.js';
import { FileTypeIcon } from '../icons/file-type-icon.js';

import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { ScrollArea } from '../ui/scroll-area.js';

export interface FileTreeNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  renamingPath?: string | null;
  renameValue?: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (path: string, name: string) => void;
  onRenameCancel?: () => void;
  renderIcon?: (node: FileTreeNode) => ReactNode;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNode) => void;
  className?: string;
}

function TreeNodeRow({
  node,
  depth,
  selectedPath,
  expandedPaths,
  renamingPath,
  renameValue,
  onToggle,
  onSelect,
  onOpen,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  renderIcon,
  onContextMenu,
}: {
  node: FileTreeNode;
  depth: number;
} & Omit<FileTreeProps, 'nodes' | 'className'>) {
  const isOpen = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isRenaming = renamingPath === node.path;

  return (
    <li>
      <div
        className={cn(
          'group flex min-h-7 items-center gap-0.5 pr-2 hover:bg-foreground/5',
          isSelected && 'bg-accent/20 text-foreground'
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        data-testid={`tree-item-${node.path}`}
        onContextMenu={onContextMenu ? (e) => onContextMenu(e, node) : undefined}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'size-5 shrink-0 text-muted-foreground',
            !node.isDirectory && 'invisible'
          )}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (node.isDirectory) onToggle(node.path);
          }}
        >
          {node.isDirectory ? (
            isOpen ? (
              <Icon_ChevronDown className="size-3.5 mo-tree-item__chevron" />
            ) : (
              <Icon_ChevronRight className="size-3.5 mo-tree-item__chevron" />
            )
          ) : null}
        </Button>
        <span className="shrink-0 text-xs opacity-70">
          {renderIcon ? (
            renderIcon(node)
          ) : (
            <FileTypeIcon name={node.name} isDirectory={node.isDirectory} isOpen={isOpen} />
          )}
        </span>
        {isRenaming ? (
          <Input
            className="h-6 flex-1 px-1 py-0 text-xs mo-tree-item__rename"
            value={renameValue ?? node.name}
            autoFocus
            data-testid="explorer-rename-input"
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit?.(node.path, renameValue ?? node.name);
              if (e.key === 'Escape') onRenameCancel?.();
            }}
            onBlur={() => onRenameSubmit?.(node.path, renameValue ?? node.name)}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-6 min-w-0 flex-1 justify-start truncate px-1 text-xs font-normal mo-tree-item__label"
            onClick={() => {
              onSelect(node.path);
              if (node.isDirectory) onToggle(node.path);
              else void onOpen(node.path);
            }}
          >
            {node.name}
            {node.isDirectory ? '/' : ''}
          </Button>
        )}
      </div>
      {node.isDirectory && isOpen && node.children && node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onToggle={onToggle}
              onSelect={onSelect}
              onOpen={onOpen}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              renderIcon={renderIcon}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FileTree({
  nodes,
  className,
  ...props
}: FileTreeProps) {
  return (
    <ScrollArea className={cn('h-full', className)}>
      <ul className="py-1">
        {nodes.map((node) => (
          <TreeNodeRow key={node.path} node={node} depth={0} {...props} />
        ))}
      </ul>
    </ScrollArea>
  );
}
