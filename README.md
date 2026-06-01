# Molecule Next

Modern Web IDE shell: **plugin runtime**, **Monaco editor**, and **AI host** (first-class).

## Quick start

```bash
pnpm install
pnpm build
pnpm dev
```

Open http://localhost:5173 — Reference IDE with sample workspace, Explorer, Command Palette (`Ctrl+Shift+P` / `⌘⇧P`), and AI Chat (mock provider).

## Phase 1 features (Reference IDE)

- **Percentage pane resize** — sidebar, panel, and AI bar sashes with touch support; layout restored from `sessionStorage` (`molecule:layout`)
- **Keybindings** — centralized registry (`Ctrl/⌘+Shift+P` palette, `B` sidebar, `J` panel, `,` settings, `K` theme, `Shift+F` search)
- **Theme persistence** — color theme saved to `localStorage` (`molecule:theme`)

See the full roadmap: **[DESIGN-ROADMAP](docs/DESIGN-ROADMAP.md)**.

## Packages

| Package | Description |
|---------|-------------|
| `@easyspace/kernel` | App lifecycle, config, events |
| `@easyspace/workbench` | VS Code–like layout shell |
| `@easyspace/editor` | Monaco adapter + tabs |
| `@easyspace/plugin-api` | Plugin manifest & host contracts |
| `@easyspace/plugin-runtime` | Loader, registry, activation, keybindings |
| `@easyspace/ai-host` | AI providers, context, tools |
| `@easyspace/git` | isomorphic-git + WorkspaceAPI bridge |
| `@easyspace/terminal-host` | Terminal sessions and commands |
| `@easyspace/plugin-*` | Official plugins (explorer, themes, ai, …) |

## Scripts

- `pnpm build:extensions` — Bundle Reference IDE dynamic extensions
- `pnpm dev` — Reference IDE (Vite)
- `pnpm build` — Build all packages (Turbo)
- `pnpm test` — Vitest unit tests
- `pnpm e2e` — Playwright (build + preview first in CI)

## Docs

- **[Design roadmap](docs/DESIGN-ROADMAP.md)** — vision, capability matrix, phased plan
- [ADR 001: Monorepo](docs/adr/001-monorepo-and-packages.md)
- [ADR 002: Plugins](docs/adr/002-plugin-system.md)
- [ADR 003: AI Host](docs/adr/003-ai-host.md)
- [ADR 004: Workspace & settings](docs/adr/004-workspace-and-settings.md)
- [ADR 005: Phase 6 host packages](docs/adr/005-phase6-host-packages.md)
- [Extension author guide](docs/EXTENSIONS.md)
- [Legacy migration map](docs/MIGRATION-LEGACY.md)

## Legacy code

The original DTStack `@dtinsight/molecule` framework (`src/`, `app/`, Docusaurus `website/`) was removed in the Molecule Next cleanup. See [docs/MIGRATION-LEGACY.md](docs/MIGRATION-LEGACY.md) and git history for API mapping.

**Reference projects** (vendored clones, removed from this repo):

- [Pyxis-CodeCanvas](https://github.com/pyxis-labs/Pyxis-CodeCanvas) — layout/workbench reference
- [DTStack/molecule](https://github.com/DTStack/molecule) — original upstream
