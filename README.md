# Molecule Next

Modern Web IDE shell: **plugin runtime**, **Monaco editor**, and **AI host** (first-class).

## Quick start

```bash
pnpm install
pnpm build
pnpm dev
```

**Third-party npm demo** (standalone, uses published `@jiulimiai/*`):

```bash
cd demo && pnpm install && pnpm dev   # http://localhost:5300
```

See [`demo/README.md`](demo/README.md).

Open http://localhost:5199 — Reference IDE with sample workspace, Explorer, Command Palette (`Ctrl+Shift+P` / `⌘⇧P`), and AI Chat (mock provider).

## Phase 1 features (Reference IDE)

- **Percentage pane resize** — sidebar, panel, and AI bar sashes with touch support; layout restored from `sessionStorage` (`molecule:layout`)
- **Keybindings** — centralized registry (`Ctrl/⌘+Shift+P` palette, `B` sidebar, `J` panel, `,` settings, `K` theme, `Shift+F` search)
- **Theme persistence** — color theme saved to `localStorage` (`molecule:theme`)

See the full roadmap: **[DESIGN-ROADMAP](docs/DESIGN-ROADMAP.md)**.

## Packages

| Package | Description |
|---------|-------------|
| `@jiulimiai/kernel` | App lifecycle, config, events |
| `@jiulimiai/ui` | Craft tokens, shadcn components, icons, IDE primitives |
| `@jiulimiai/workbench` | VS Code–like layout shell |
| `@jiulimiai/editor` | Monaco adapter + tabs |
| `@jiulimiai/plugin-runtime` | Loader, registry, activation, keybindings |
| `@jiulimiai/ai-host` | AI providers, context, tools |
| `@jiulimiai/git` | isomorphic-git + WorkspaceAPI bridge |
| `@jiulimiai/molecule-ide` | Embed SDK — `<MoleculeIDE />` for third-party hosts |
| `@jiulimiai/terminal-host` | Terminal sessions and commands |
| `@jiulimiai/plugin-*` | Official plugins (explorer, themes, ai, …) |

## Scripts

- `pnpm verify:publish` — Pack `@jiulimiai/*` tarballs and smoke-build an npm consumer app
- `pnpm dev` — Reference IDE (Vite)
- `pnpm build` — Build all packages (Turbo)
- `pnpm test` — Vitest unit tests
- `pnpm analyze --filter=@jiulimiai/reference-ide` — Production build + bundle stats (`dist/stats.html`)
- `node scripts/check-bundle.mjs` — Verify Monaco is split into a separate chunk (CI)

## Docs

- **[Design roadmap](docs/DESIGN-ROADMAP.md)** — vision, capability matrix, phased plan
- [ADR 001: Monorepo](docs/adr/001-monorepo-and-packages.md)
- [ADR 002: Plugins](docs/adr/002-plugin-system.md)
- [ADR 003: AI Host](docs/adr/003-ai-host.md)
- [ADR 004: Workspace & settings](docs/adr/004-workspace-and-settings.md)
- [ADR 005: Phase 6 host packages](docs/adr/005-phase6-host-packages.md)
- [ADR 007: UI layer & embed-first](docs/adr/007-ui-layer-and-embed-first.md)
- [Extension author guide](docs/EXTENSIONS.md)
- **[Embed SDK guide](docs/EMBED.md)** — `@jiulimiai/molecule-ide` + `<MoleculeIDE />`
- [Legacy migration map](docs/MIGRATION-LEGACY.md)

## Legacy code

The original DTStack `@dtinsight/molecule` framework (`src/`, `app/`, Docusaurus `website/`) was removed in the Molecule Next cleanup. See [docs/MIGRATION-LEGACY.md](docs/MIGRATION-LEGACY.md) and git history for API mapping.

**Reference projects** (vendored clones, removed from this repo):

- [Pyxis-CodeCanvas](https://github.com/pyxis-labs/Pyxis-CodeCanvas) — layout/workbench reference
- [DTStack/molecule](https://github.com/DTStack/molecule) — original upstream
