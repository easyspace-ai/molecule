import { z } from 'zod';

export const appConfigSchema = z.object({
  defaultLocale: z.string().default('en-US'),
  defaultThemeId: z.string().default('default'),
  ai: z
    .object({
      enabled: z.boolean().default(true),
      proxyUrl: z.string().optional(),
      apiKeyEnv: z.string().optional(),
    })
    .optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function parseAppConfig(input: Partial<AppConfig> = {}): AppConfig {
  return appConfigSchema.parse(input);
}
