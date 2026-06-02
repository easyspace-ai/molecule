# Molecule Next — Embed Guide

Embed the Molecule IDE shell in your React app in under 30 minutes.

## Quick start

```bash
pnpm add @easyspace/reference-ide @easyspace/ui react react-dom
```

```tsx
// main.tsx
import '@easyspace/ui/styles/tokens.css';
import './index.css';
import { createRoot } from 'react-dom/client';
import { MoleculeIDE } from '@easyspace/reference-ide/embed';

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
/* index.css — required Tailwind scan */
@import "@easyspace/ui/styles/tokens.css";
@source "../../../packages/ui/src/**/*.{ts,tsx}";
@source "../../../packages/workbench/src/**/*.{ts,tsx}";
@source "../../../packages/editor/src/**/*.{ts,tsx}";
@source "../../../packages/plugins/**/src/**/*.{ts,tsx}";
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

Use `@easyspace/plugin-runtime` HTTP adapter with your backend:

```typescript
import { createHttpWorkspaceClient, createHttpWorkspace } from '@easyspace/plugin-runtime';

const client = createHttpWorkspaceClient({ baseUrl: 'https://api.example.com/ws/project-1' });
const workspace = createHttpWorkspace({ client, root: 'project-1' });

<MoleculeIDE workspaceFactory={() => Promise.resolve(workspace)} preset="minimal" />
```

REST contract: see `packages/plugin-api/src/workspace-backend.ts`.

## Monaco workers

Copy `apps/reference-ide/src/monaco-setup.ts` into your host app and import it before `MoleculeIDE`.

## Example app

See [`apps/embed-demo`](../apps/embed-demo) for a minimal Vite host.
