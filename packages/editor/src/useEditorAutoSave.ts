import type { WorkspaceAPI } from '@easyspace/plugin-api';

import { setEditorSaveScheduler } from './auto-save-scheduler.js';
import { useEditorStore } from './editor-store.js';

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Debounces editor tab content changes to workspace.writeFile.
 * Returns a dispose function; call from the host after workspace is ready.
 */
export function setupEditorAutoSave(
  workspace: WorkspaceAPI,
  options: { debounceMs?: number; onSaved?: (uri: string) => void } = {}
): () => void {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  setEditorSaveScheduler((tabId, uri, content) => {
    const existing = timers.get(tabId);
    if (existing) clearTimeout(existing);

    timers.set(
      tabId,
      setTimeout(() => {
        timers.delete(tabId);
        void workspace
          .writeFile(uri, content)
          .then(() => {
            useEditorStore.getState().markTabSaved(tabId, content);
            options.onSaved?.(uri);
          })
          .catch(() => {
            /* keep dirty flag if persistence fails */
          });
      }, debounceMs)
    );
  });

  return () => {
    setEditorSaveScheduler(null);
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };
}
