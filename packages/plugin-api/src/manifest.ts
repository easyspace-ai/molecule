import { z } from 'zod';

export const viewLocationSchema = z.enum([
  'sidebar',
  'auxiliaryBar',
  'panel',
  'activityBar',
  'menuBar',
]);

export const commandSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().optional(),
});

export const keybindingSchema = z.object({
  command: z.string(),
  key: z.string(),
  when: z.string().optional(),
});

export const viewSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: viewLocationSchema,
  icon: z.string().optional(),
});

export const themeSchema = z.object({
  id: z.string(),
  label: z.string(),
  uiTheme: z.enum(['vs', 'vs-dark', 'hc-black']),
  path: z.string().optional(),
});

export const aiProviderSchema = z.object({
  id: z.string(),
  label: z.string(),
  protocol: z.enum(['openai-compatible', 'anthropic', 'ollama', 'custom']),
});

export const aiToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dangerous: z.boolean().optional(),
});

export const configurationPropertySchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  default: z.unknown().optional(),
  description: z.string().optional(),
  enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const configurationSchema = z.record(configurationPropertySchema);

export const localizationSchema = z.object({
  locale: z.string(),
  translations: z.record(z.string()),
});

export const terminalCommandSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
});

export const contributesSchema = z.object({
  commands: z.array(commandSchema).optional(),
  views: z.array(viewSchema).optional(),
  themes: z.array(themeSchema).optional(),
  keybindings: z.array(keybindingSchema).optional(),
  configuration: configurationSchema.optional(),
  aiProviders: z.array(aiProviderSchema).optional(),
  aiTools: z.array(aiToolSchema).optional(),
  terminalCommands: z.array(terminalCommandSchema).optional(),
  localizations: z.array(localizationSchema).optional(),
});

export const activityBarContributionSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  viewId: z.string().optional(),
});

export const editorTabContributionSchema = z.object({
  id: z.string(),
  title: z.string(),
});

/** Extension manifest v2 optional fields (backward compatible with v1). */
export const extensionManifestFieldsSchema = z.object({
  icon: z.string().optional(),
  readme: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  publisher: z.string().optional(),
  downloadUrl: z.string().optional(),
  sha256: z.string().optional(),
  availableOnly: z.boolean().optional(),
  activityBar: activityBarContributionSchema.optional(),
  editorTab: editorTabContributionSchema.optional(),
  configuration: configurationSchema.optional(),
});

export const pluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  activationEvents: z.array(z.string()).optional(),
  contributes: contributesSchema.optional(),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type ViewLocation = z.infer<typeof viewLocationSchema>;
export type CommandContribution = z.infer<typeof commandSchema>;
export type KeybindingContribution = z.infer<typeof keybindingSchema>;
export type ViewContribution = z.infer<typeof viewSchema>;
export type ThemeContribution = z.infer<typeof themeSchema>;
export type ConfigurationPropertySchema = z.infer<typeof configurationPropertySchema>;
export type ActivityBarContribution = z.infer<typeof activityBarContributionSchema>;
export type EditorTabContribution = z.infer<typeof editorTabContributionSchema>;
export type ExtensionManifestFields = z.infer<typeof extensionManifestFieldsSchema>;

/** Payload for extension detail editor tabs and marketplace events. */
export interface ExtensionDetailData {
  extensionId: string;
  name: string;
  version: string;
  description?: string;
  readme?: string;
  icon?: string;
  enabled: boolean;
  installed: boolean;
  type?: string;
  publisher?: string;
  configuration?: Record<string, ConfigurationPropertySchema>;
}
