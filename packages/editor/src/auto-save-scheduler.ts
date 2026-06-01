let saveScheduler: ((tabId: string, uri: string, content: string) => void) | null = null;

export function setEditorSaveScheduler(
  scheduler: ((tabId: string, uri: string, content: string) => void) | null
): void {
  saveScheduler = scheduler;
}

export function scheduleEditorAutoSave(tabId: string, uri: string, content: string): void {
  saveScheduler?.(tabId, uri, content);
}
