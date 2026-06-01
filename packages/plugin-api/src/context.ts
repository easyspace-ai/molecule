import type { ReactNode } from 'react';
import type { PluginManifest } from './manifest.js';
import type { ConfigurationAPI } from './settings.js';

export interface Disposable {
  dispose(): void;
}

export class DisposableStore implements Disposable {
  private items: Disposable[] = [];

  add(d: Disposable): void {
    this.items.push(d);
  }

  dispose(): void {
    for (const item of this.items) {
      item.dispose();
    }
    this.items = [];
  }
}

export interface StatusBarItem {
  id: string;
  text: string;
  alignment: 'left' | 'right';
  priority?: number;
}

export interface WorkbenchLayoutState {
  sidebarVisible: boolean;
  auxiliaryBarVisible: boolean;
  panelVisible: boolean;
  menuBarVisible: boolean;
  statusBarVisible: boolean;
}

export interface WorkbenchAPI {
  registerView(location: string, viewId: string, render: () => ReactNode): Disposable;
  setStatusBarItem(item: StatusBarItem): Disposable;
  showNotification(message: string, type?: 'info' | 'warn' | 'error'): void;
  getLayoutState(): WorkbenchLayoutState;
  setSidebarVisible(visible: boolean): void;
  setAuxiliaryBarVisible(visible: boolean): void;
  setPanelVisible(visible: boolean): void;
  setMenuBarVisible(visible: boolean): void;
  setStatusBarVisible(visible: boolean): void;
  appendPanelLog(panelId: string, line: string): void;
}

export interface CommandAPI {
  registerCommand(id: string, handler: (...args: unknown[]) => unknown): Disposable;
  executeCommand(id: string, ...args: unknown[]): Promise<unknown>;
}

export interface EditorDocument {
  uri: string;
  languageId: string;
  content: string;
}

export interface EditorAPI {
  openDocument(doc: EditorDocument): Promise<void>;
  getActiveDocument(): EditorDocument | undefined;
  getSelection(): { start: number; end: number } | undefined;
  onDidChangeActiveDocument(handler: (doc: EditorDocument | undefined) => void): Disposable;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: WorkspaceFile[];
}

export interface SearchMatch {
  path: string;
  line: number;
  text: string;
}

export interface WorkspaceAPI {
  getRoot(): string;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  /** Create a new file; throws if the path already exists. */
  createFile(path: string, content?: string): Promise<void>;
  /** Create an empty directory (including parent chain). */
  createDirectory(path: string): Promise<void>;
  /** Delete a file or directory tree at `path`. */
  deletePath(path: string): Promise<void>;
  /** Rename or move a file or directory tree. */
  renamePath(oldPath: string, newPath: string): Promise<void>;
  listDirectory(path?: string): Promise<WorkspaceFile[]>;
  listFiles(): string[];
  searchInFiles(query: string): Promise<SearchMatch[]>;
}

export interface UIAPI {
  showInputBox(prompt: string): Promise<string | undefined>;
  showQuickPick<T extends string>(items: T[], placeHolder?: string): Promise<T | undefined>;
}

export interface AIEditProposal {
  path: string;
  oldText?: string;
  newText: string;
}

/** Batch of structured file edits from an AI provider. */
export interface AIEditBatch {
  edits: AIEditProposal[];
  summary?: string;
}

export interface AIStreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'done' | 'error' | 'edit';
  text?: string;
  toolName?: string;
  error?: string;
  edit?: AIEditProposal;
  /** Multi-file edit batch (production providers). */
  edits?: AIEditProposal[];
}

export interface AIProvider {
  id: string;
  streamText(prompt: string, options?: { signal?: AbortSignal }): AsyncIterable<AIStreamChunk>;
}

export interface AIToolHandler {
  (args: Record<string, unknown>): Promise<unknown>;
}

export interface AIHostAPI {
  registerProvider(provider: AIProvider): Disposable;
  registerTool(id: string, handler: AIToolHandler): Disposable;
  registerContextSource(
    id: string,
    getContext: () => Promise<Record<string, unknown>>
  ): Disposable;
  streamChat(sessionId: string, prompt: string, signal?: AbortSignal): AsyncIterable<AIStreamChunk>;
  getSessions(): { id: string; title: string }[];
}

export interface TerminalSession {
  id: string;
  name: string;
  write(data: string): void;
  dispose(): void;
}

export interface TerminalAPI {
  appendOutput(sessionId: string, data: string): void;
  registerCommand(
    name: string,
    handler: (args: string[]) => Promise<string> | string
  ): Disposable;
  createSession(options?: { name?: string; cwd?: string }): TerminalSession;
  /** Execute a full input line in a session (parses commands). */
  executeLine(sessionId: string, line: string): Promise<void>;
  onDidCloseTerminal(handler: (id: string) => void): Disposable;
  onOutput(handler: (sessionId: string, data: string) => void): Disposable;
}

export type ScmFileStatus = 'modified' | 'added' | 'deleted' | 'untracked';

export interface ScmFileChange {
  path: string;
  status: ScmFileStatus;
}

export interface ScmRepository {
  root: string;
  branch: string;
}

export interface ScmCommit {
  oid: string;
  message: string;
  author?: string;
  timestamp?: number;
}

export interface ScmAPI {
  getRepositories(): ScmRepository[];
  getStatus(): Promise<ScmFileChange[]>;
  stage(path: string): Promise<void>;
  unstage?(path: string): Promise<void>;
  commit(message: string): Promise<void>;
  log?(limit?: number): Promise<ScmCommit[]>;
  listBranches?(): Promise<string[]>;
  checkoutBranch?(name: string): Promise<void>;
  onDidChange(handler: () => void): Disposable;
}

export interface PluginContext {
  workspace: WorkspaceAPI;
  configuration?: ConfigurationAPI;
  workbench: WorkbenchAPI;
  editor: EditorAPI;
  commands: CommandAPI;
  ui: UIAPI;
  ai?: AIHostAPI;
  terminal?: TerminalAPI;
  scm?: ScmAPI;
  subscriptions: DisposableStore;
}

export interface PluginModule {
  manifest: PluginManifest;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
