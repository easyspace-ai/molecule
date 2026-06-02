export { PluginManager, type PluginManagerOptions } from './plugin-manager.js';
export {
  createRegistry,
  viewsByLocation,
  type ContributionRegistry,
} from './registry.js';
export {
  createPluginContext,
  createMemoryWorkspace,
  createEditorHost,
  type HostServices,
  type MemoryWorkspaceOptions,
} from './host-context.js';
export {
  createIndexedDbWorkspace,
  warmIndexedDbWorkspace,
  type IndexedDbWorkspaceOptions,
} from './indexed-db-workspace.js';
export {
  createConfigurationService,
  type ConfigurationServiceOptions,
} from './configuration.js';
export { searchFilesInWorker, searchFilesSync, type SearchOptions } from './search.js';
export { normalizePath, joinPath } from './path-utils.js';
export {
  KeybindingRegistry,
  DEFAULT_KEYBINDINGS,
  createDefaultKeybindingRegistry,
  registerManifestKeybindings,
  applyKeybindingOverrides,
  normalizeKeyCombo,
  type RegisteredKeybinding,
} from './keybindings.js';
export { createTerminalService, type TerminalService } from './terminal-service.js';
export { createScmService, type ScmService } from './scm-service.js';
export {
  getActiveWorkspaceRoot,
  listWorkspaceRoots,
  setActiveWorkspaceRoot,
} from './workspace-roots.js';
export {
  fetchExtensionManifest,
  fetchExtensionReadme,
  loadExtensionModule,
  loadExtensionPlugins,
  validateExtensionManifest,
  extensionManifestSchema,
  fetchExtensionCatalog,
  fetchExtensionIndex,
  getDisabledExtensionIds,
  setExtensionEnabled,
  isExtensionEnabled,
  getInstalledExtensionIds,
  isExtensionInstalled,
  installExtension,
  uninstallExtension,
  getExtensionConfig,
  setExtensionConfig,
  DISABLED_EXTENSIONS_KEY,
  INSTALLED_EXTENSIONS_KEY,
  EXTENSION_CONFIG_KEY_PREFIX,
  resolveExtensionBase,
  type ExtensionManifest,
  type ExtensionIndexEntry,
  type ExtensionCatalogEntry,
  type ExtensionIndex,
  type LoadExtensionResult,
} from './extension-loader.js';
export { createHttpWorkspaceClient, type HttpWorkspaceClientOptions } from './http-workspace-client.js';
export { createHttpWorkspace, type HttpWorkspaceOptions } from './http-workspace.js';
export { buildWorkspaceTree } from './workspace-tree.js';
