# Molecule IDE Demo

Standalone Vite app that embeds **[@jiulimiai/molecule-ide](https://www.npmjs.com/package/@jiulimiai/molecule-ide)** from npm.

This folder is **not** part of the monorepo pnpm workspace — copy it anywhere and it works the same way a third-party integrator would set up their host app.

## Quick start

```bash
cd demo
pnpm install   # or: npm install
pnpm dev       # http://localhost:5300
```

Production build:

```bash
pnpm build
pnpm preview
```

## What this demonstrates

| File | Purpose |
|------|---------|
| `src/main.tsx` | Import `MoleculeIDE`, seed workspace files, `preset="minimal"` |
| `src/index.css` | Tailwind v4 `@source` scan for `@jiulimiai/*` package classes |
| `vite.config.ts` | React + Tailwind + Monaco worker chunk split |

Minimal integration (3 steps):

```tsx
import '@jiulimiai/ui/styles/tokens.css';
import '@jiulimiai/molecule-ide/monaco-setup';
import { MoleculeIDE } from '@jiulimiai/molecule-ide';

<MoleculeIDE preset="minimal" seedFiles={{ 'hello.ts': 'export {}' }} />
```

## Dependencies

Published packages (see [docs/EMBED.md](../docs/EMBED.md) for full guide):

- `@jiulimiai/molecule-ide` — embed SDK
- `@jiulimiai/ui` — design tokens + shared UI (peer for Tailwind scan)
- `react`, `react-dom`, `monaco-editor`

## Presets

- **`minimal`** (this demo) — explorer, editor, commands, themes, i18n
- **`full`** — AI, SCM, terminal, extensions, …

```tsx
<MoleculeIDE preset="full" loadExtensions={false} />
```

## Monorepo note

Inside this repository, `apps/embed-demo` uses `workspace:*` for local development. **`demo/` always uses npm registry versions** to mirror real-world usage.
