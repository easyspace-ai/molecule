import {
  extensionManifestFieldsSchema,
  pluginManifestSchema,
  type ConfigurationPropertySchema,
  type ExtensionManifestFields,
  type PluginModule,
} from '@easyspace/plugin-api';
import { z } from 'zod';

export interface ExtensionManifest extends ExtensionManifestFields {
  id: string;
  name: string;
  version: string;
  main: string;
  activationEvents?: string[];
  contributes?: PluginModule['manifest']['contributes'];
}

export const extensionManifestSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    version: z.string().optional(),
    main: z.string(),
    activationEvents: z.array(z.string()).optional(),
    contributes: pluginManifestSchema.shape.contributes.optional(),
  })
  .merge(extensionManifestFieldsSchema);

export interface ExtensionIndexEntry {
  id: string;
  path: string;
  version?: string;
  description?: string;
  publisher?: string;
  type?: string;
  downloadUrl?: string;
  sha256?: string;
  availableOnly?: boolean;
}

/** Backend-ready catalog row (REST marketplace). */
export interface ExtensionCatalogEntry {
  id: string;
  path: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  installed: boolean;
  icon?: string;
  readme?: string;
  type?: string;
  publisher?: string;
  downloadUrl?: string;
  sha256?: string;
  configuration?: Record<string, ConfigurationPropertySchema>;
  activityBar?: ExtensionManifestFields['activityBar'];
  editorTab?: ExtensionManifestFields['editorTab'];
}

export interface ExtensionIndex {
  extensions: ExtensionIndexEntry[];
}

export const DISABLED_EXTENSIONS_KEY = 'molecule:disabled-extensions';
export const INSTALLED_EXTENSIONS_KEY = 'molecule:installed-extensions';
export const EXTENSION_CONFIG_KEY_PREFIX = 'molecule:extension-config:';

export function getDisabledExtensionIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISABLED_EXTENSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isExtensionEnabled(id: string): boolean {
  return !getDisabledExtensionIds().includes(id);
}

export function setExtensionEnabled(id: string, enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  const disabled = new Set(getDisabledExtensionIds());
  if (enabled) disabled.delete(id);
  else disabled.add(id);
  localStorage.setItem(DISABLED_EXTENSIONS_KEY, JSON.stringify([...disabled]));
}

export function getInstalledExtensionIds(catalogIds: string[], availableOnlyIds: string[] = []): string[] {
  if (typeof localStorage === 'undefined') return catalogIds.filter((id) => !availableOnlyIds.includes(id));
  try {
    const raw = localStorage.getItem(INSTALLED_EXTENSIONS_KEY);
    if (!raw) {
      const defaults = catalogIds.filter((id) => !availableOnlyIds.includes(id));
      localStorage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : catalogIds;
  } catch {
    return catalogIds.filter((id) => !availableOnlyIds.includes(id));
  }
}

export function isExtensionInstalled(id: string, catalogIds: string[], availableOnlyIds: string[] = []): boolean {
  return getInstalledExtensionIds(catalogIds, availableOnlyIds).includes(id);
}

export function installExtension(id: string, catalogIds: string[], availableOnlyIds: string[] = []): void {
  if (typeof localStorage === 'undefined') return;
  const installed = new Set(getInstalledExtensionIds(catalogIds, availableOnlyIds));
  installed.add(id);
  localStorage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify([...installed]));
  setExtensionEnabled(id, true);
}

export function uninstallExtension(id: string, catalogIds: string[], availableOnlyIds: string[] = []): void {
  if (typeof localStorage === 'undefined') return;
  const installed = getInstalledExtensionIds(catalogIds, availableOnlyIds).filter((eid) => eid !== id);
  localStorage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
  setExtensionEnabled(id, false);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('molecule:extension-uninstalled', { detail: { id } }));
  }
}

export function getExtensionConfig(id: string): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${EXTENSION_CONFIG_KEY_PREFIX}${id}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function setExtensionConfig(id: string, config: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${EXTENSION_CONFIG_KEY_PREFIX}${id}`, JSON.stringify(config));
}

function isExtensionManifest(value: unknown): value is ExtensionManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return typeof m.id === 'string' && typeof m.name === 'string' && typeof m.main === 'string';
}

export function validateExtensionManifest(json: unknown): ExtensionManifest {
  const parsed = extensionManifestSchema.parse(json);
  pluginManifestSchema.parse({
    id: parsed.id,
    name: parsed.name,
    version: parsed.version ?? '0.0.0',
    activationEvents: parsed.activationEvents,
    contributes: parsed.contributes,
  });
  return {
    id: parsed.id,
    name: parsed.name,
    version: parsed.version ?? '0.0.0',
    main: parsed.main,
    activationEvents: parsed.activationEvents,
    contributes: parsed.contributes,
    icon: parsed.icon,
    readme: parsed.readme,
    description: parsed.description,
    type: parsed.type,
    publisher: parsed.publisher,
    downloadUrl: parsed.downloadUrl,
    sha256: parsed.sha256,
    availableOnly: parsed.availableOnly,
    activityBar: parsed.activityBar,
    editorTab: parsed.editorTab,
    configuration: parsed.configuration,
  };
}

/** Resolve extension folder to absolute URL (browser or test origin). */
export function resolveExtensionBase(baseUrl: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const origin =
    typeof globalThis !== 'undefined' && 'location' in globalThis
      ? (globalThis as Window & typeof globalThis).location.origin
      : 'http://localhost';
  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return new URL(path, origin).href;
}

export async function fetchExtensionReadme(
  manifest: ExtensionManifest,
  baseUrl: string
): Promise<string | undefined> {
  if (!manifest.readme) return manifest.description;
  if (manifest.readme.includes('\n') || manifest.readme.startsWith('#')) {
    return manifest.readme;
  }
  const base = resolveExtensionBase(baseUrl);
  const readmePath = manifest.readme.startsWith('/') ? manifest.readme.slice(1) : manifest.readme;
  try {
    const res = await fetch(new URL(readmePath, base).href);
    if (!res.ok) return manifest.description;
    return await res.text();
  } catch {
    return manifest.description;
  }
}

export async function fetchExtensionManifest(baseUrl: string): Promise<ExtensionManifest> {
  const base = resolveExtensionBase(baseUrl);
  const url = `${base}manifest.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Extension manifest not found: ${url}`);
  const json: unknown = await res.json();
  if (!isExtensionManifest(json)) throw new Error(`Invalid extension manifest at ${url}`);
  return validateExtensionManifest(json);
}

export async function loadExtensionModule(
  manifest: ExtensionManifest,
  baseUrl: string
): Promise<PluginModule> {
  const base = resolveExtensionBase(baseUrl);
  const mainPath = manifest.main.startsWith('/') ? manifest.main.slice(1) : manifest.main;
  const moduleUrl = new URL(mainPath, base).href;
  const mod = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: PluginModule;
    plugin?: PluginModule;
  };
  const plugin = mod.default ?? mod.plugin;
  if (!plugin?.activate) throw new Error(`Extension ${manifest.id} does not export a PluginModule`);
  return {
    manifest: {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version ?? '0.0.0',
      activationEvents: manifest.activationEvents ?? ['onStartup'],
      contributes: manifest.contributes ?? plugin.manifest.contributes,
    },
    activate: plugin.activate,
    deactivate: plugin.deactivate,
  };
}

function parseExtensionIndex(json: unknown): ExtensionIndexEntry[] {
  if (Array.isArray(json)) {
    return json.map((id) => ({ id: String(id), path: `${id}/` }));
  }
  if (json && typeof json === 'object' && 'extensions' in json) {
    const index = json as ExtensionIndex;
    if (Array.isArray(index.extensions)) return index.extensions;
  }
  return [];
}

export async function fetchExtensionIndex(
  extensionsBase = '/extensions'
): Promise<ExtensionIndexEntry[]> {
  if (typeof fetch === 'undefined') return [];
  const indexUrl = extensionsBase.endsWith('/')
    ? `${extensionsBase}index.json`
    : `${extensionsBase}/index.json`;
  try {
    const res = await fetch(indexUrl);
    if (!res.ok) return [];
    return parseExtensionIndex(await res.json());
  } catch {
    return [];
  }
}

function extensionBasePath(extensionsBase: string, entryPath: string): string {
  return extensionsBase.endsWith('/')
    ? `${extensionsBase}${entryPath}`
    : `${extensionsBase}/${entryPath}`;
}

async function buildCatalogEntry(
  entry: ExtensionIndexEntry,
  extensionsBase: string,
  installedIds: Set<string>,
  disabled: Set<string>
): Promise<ExtensionCatalogEntry> {
  const base = extensionBasePath(extensionsBase, entry.path);
  try {
    const manifest = await fetchExtensionManifest(base);
    const readme = await fetchExtensionReadme(manifest, base);
    return {
      id: entry.id,
      path: entry.path,
      name: manifest.name,
      version: manifest.version ?? entry.version ?? '0.0.0',
      description: manifest.description ?? entry.description,
      enabled: installedIds.has(entry.id) && !disabled.has(entry.id),
      installed: installedIds.has(entry.id),
      icon: manifest.icon,
      readme,
      type: manifest.type ?? entry.type,
      publisher: manifest.publisher ?? entry.publisher,
      downloadUrl: manifest.downloadUrl ?? entry.downloadUrl,
      sha256: manifest.sha256 ?? entry.sha256,
      configuration: manifest.configuration ?? manifest.contributes?.configuration,
      activityBar: manifest.activityBar,
      editorTab: manifest.editorTab,
    };
  } catch {
    return {
      id: entry.id,
      path: entry.path,
      name: entry.id,
      version: entry.version ?? '0.0.0',
      description: entry.description,
      enabled: installedIds.has(entry.id) && !disabled.has(entry.id),
      installed: installedIds.has(entry.id),
      type: entry.type,
      publisher: entry.publisher,
      downloadUrl: entry.downloadUrl,
      sha256: entry.sha256,
    };
  }
}

export async function fetchExtensionCatalog(
  extensionsBase = '/extensions'
): Promise<ExtensionCatalogEntry[]> {
  const entries = await fetchExtensionIndex(extensionsBase);
  const catalogIds = entries.map((e) => e.id);
  const availableOnlyIds = entries.filter((e) => e.availableOnly).map((e) => e.id);
  const installedIds = new Set(getInstalledExtensionIds(catalogIds, availableOnlyIds));
  const disabled = new Set(getDisabledExtensionIds());
  const catalog: ExtensionCatalogEntry[] = [];

  for (const entry of entries) {
    catalog.push(await buildCatalogEntry(entry, extensionsBase, installedIds, disabled));
  }

  return catalog;
}

export interface LoadExtensionResult {
  plugins: PluginModule[];
  localizations: { locale: string; translations: Record<string, string> }[];
  manifests: ExtensionManifest[];
}

/** Load installed & enabled extensions from public/extensions (see index.json). */
export async function loadExtensionPlugins(extensionsBase = '/extensions'): Promise<LoadExtensionResult> {
  const empty: LoadExtensionResult = { plugins: [], localizations: [], manifests: [] };
  if (typeof fetch === 'undefined') return empty;

  const entries = await fetchExtensionIndex(extensionsBase);
  const catalogIds = entries.map((e) => e.id);
  const availableOnlyIds = entries.filter((e) => e.availableOnly).map((e) => e.id);
  const installed = new Set(getInstalledExtensionIds(catalogIds, availableOnlyIds));
  const disabled = new Set(getDisabledExtensionIds());
  const plugins: PluginModule[] = [];
  const localizations: { locale: string; translations: Record<string, string> }[] = [];
  const manifests: ExtensionManifest[] = [];

  for (const entry of entries) {
    if (!installed.has(entry.id) || disabled.has(entry.id)) continue;
    const base = extensionBasePath(extensionsBase, entry.path);
    try {
      const manifest = await fetchExtensionManifest(base);
      manifests.push(manifest);
      plugins.push(await loadExtensionModule(manifest, base));
      const locs = manifest.contributes?.localizations ?? [];
      for (const loc of locs) {
        localizations.push({ locale: loc.locale, translations: loc.translations });
      }
    } catch (err) {
      console.warn(`[extension-loader] Skipped ${entry.id}:`, err);
    }
  }
  return { plugins, localizations, manifests };
}

/** @deprecated Use loadExtensionPlugins which returns `{ plugins, localizations }`. */
export async function loadExtensionPluginsLegacy(extensionsBase = '/extensions'): Promise<PluginModule[]> {
  const { plugins } = await loadExtensionPlugins(extensionsBase);
  return plugins;
}
