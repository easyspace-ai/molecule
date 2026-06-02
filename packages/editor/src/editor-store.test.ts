import { beforeEach, describe, expect, it } from 'vitest';

import { useEditorStore } from './editor-store.js';

describe('useEditorStore split', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: [],
      panes: [{ id: 'primary', activeTabId: null }],
      activePaneId: 'primary',
      activeTabId: null,
      splitDirection: 'horizontal',
    });
  });

  it('adds a second pane on horizontal split', () => {
    useEditorStore.getState().splitEditorHorizontal();
    expect(useEditorStore.getState().panes).toHaveLength(2);
    expect(useEditorStore.getState().splitDirection).toBe('horizontal');
  });

  it('closes secondary pane', () => {
    useEditorStore.getState().splitEditorHorizontal();
    useEditorStore.getState().closeSecondaryPane();
    expect(useEditorStore.getState().panes).toHaveLength(1);
    expect(useEditorStore.getState().panes[0]?.id).toBe('primary');
  });
});
