# Molecule Next — Embed Guide

Embed the Molecule IDE shell in your React app.

## Quick start

```bash
pnpm add @jiulimiai/molecule-ide @jiulimiai/ui react react-dom monaco-editor
```

```tsx
// main.tsx
import '@jiulimiai/ui/styles/tokens.css';
import '@jiulimiai/molecule-ide/monaco-setup';
import './index.css';
import { createRoot } from 'react-dom/client';
import { MoleculeIDE } from '@jiulimiai/molecule-ide';

createRoot(document.getElementById('root')!).render(
  <MoleculeIDE
    preset="minimal"
    seedFiles={{
      'README.md': '# Hello\n\nEmbedded Molecule IDE.',
      'src/app.ts': 'export const app = "molecule";\n',
    }}
  />
);
```

```css
/* index.css — required Tailwind scan (paths relative to your app) */
@import "@jiulimiai/ui/styles/tokens.css";
@source "../node_modules/@jiulimiai/ui/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/workbench/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/editor/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/molecule-ide/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/plugin-*/src/**/*.{ts,tsx}";
```

Configure Vite with `@tailwindcss/vite` (see `apps/embed-demo/vite.config.ts`).

## `MoleculeIDE` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset` | `'full' \| 'minimal'` | `'full'` | Plugin bundle |
| `workspaceFactory` | async factory | IndexedDB | Custom `WorkspaceAPI` |
| `seedFiles` | `Record<string, string>` | — | Initial files when workspace empty |
| `loadExtensions` | `boolean` | `true` (full) | Dynamic ESM extensions from `/extensions` |
| `onReady` | `() => void` | — | Fired when shell is interactive |

## Presets

- **minimal** — Explorer, editor, command palette, themes, i18n
- **full** — Reference IDE (AI, SCM, terminal, extensions, …)

## Remote workspace (HTTP)

Use `@jiulimiai/plugin-runtime` HTTP adapter with your backend:

```typescript
import { createHttpWorkspaceClient, createHttpWorkspace } from '@jiulimiai/plugin-runtime';

const client = createHttpWorkspaceClient({ baseUrl: 'https://api.example.com/ws/project-1' });
const workspace = createHttpWorkspace({ client, root: 'project-1' });

<MoleculeIDE workspaceFactory={() => Promise.resolve(workspace)} preset="minimal" />
```

REST contract: see `packages/plugin-api/src/workspace-backend.ts`.

## Monaco workers

Import `@jiulimiai/molecule-ide/monaco-setup` **before** rendering `<MoleculeIDE />` (Vite host required for `?worker` imports).

## Publishing / local verification

From the monorepo root:

```bash
pnpm verify:publish       # pack + validate 22 @jiulimiai/* tarballs
pnpm verify:publish:full  # also smoke-build an isolated npm consumer (slow)
```

To publish to npm (requires `@jiulimiai` org access):

```bash
pnpm build --filter=@jiulimiai/molecule-ide...
pnpm -r publish --filter "@jiulimiai/*" --access public --no-git-checks
```

## Example app

See [`apps/embed-demo`](../apps/embed-demo) for a minimal Vite host.

## Monorepo development

When developing inside this repository, use `workspace:*` dependencies instead of npm versions.
