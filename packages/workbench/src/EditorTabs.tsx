import { EditorTabBar, EditorTabContent } from '@jiulimiai/ui';
import type { ReactNode } from 'react';

export interface EditorTab {
  id: string;
  label: string;
  dirty?: boolean;
}

export interface EditorTabsProps {
  tabs: EditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  children: ReactNode;
}

export function EditorTabs({ tabs, activeId, onSelect, onClose, children }: EditorTabsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorTabBar tabs={tabs} activeId={activeId} onSelect={onSelect} onClose={onClose} />
      <EditorTabContent>{children}</EditorTabContent>
    </div>
  );
}
