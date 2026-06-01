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

export function EditorTabs({ tabs, activeId, onSelect, children }: EditorTabsProps) {
  return (
    <>
      <div className="mo-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            className={`mo-tab${activeId === tab.id ? ' mo-tab--active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.dirty ? `${tab.label} •` : tab.label}
          </button>
        ))}
      </div>
      <div className="mo-editor-content">{children}</div>
    </>
  );
}
