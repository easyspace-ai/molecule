import type { ComponentType } from 'react';

import { Icon_Braces } from './lucide-icons.js';
import { Icon_Code } from './lucide-icons.js';
import { Icon_File } from './lucide-icons.js';
import { Icon_FileText } from './lucide-icons.js';
import { Icon_Folder } from './Folder.js';
import { Icon_FolderOpen } from './lucide-icons.js';
import { Icon_Hash } from './lucide-icons.js';
import type { IconProps } from './types.js';

const FILE_TYPE_ICONS: Record<string, ComponentType<IconProps>> = {
  ts: Icon_Code,
  tsx: Icon_Code,
  js: Icon_Code,
  jsx: Icon_Code,
  json: Icon_Braces,
  md: Icon_FileText,
  html: Icon_Code,
  css: Icon_Hash,
  txt: Icon_FileText,
};

export function FileTypeIcon({
  name,
  isDirectory,
  isOpen,
  className = 'size-3.5 text-muted-foreground',
  ...props
}: IconProps & { name: string; isDirectory: boolean; isOpen?: boolean }) {
  if (isDirectory) {
    const FolderIcon = isOpen ? Icon_FolderOpen : Icon_Folder;
    return <FolderIcon className={className} aria-hidden {...props} />;
  }
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const Component = FILE_TYPE_ICONS[ext] ?? Icon_File;
  return <Component className={className} aria-hidden {...props} />;
}
