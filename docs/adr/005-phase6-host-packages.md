# ADR 005: Phase 6 host packages (Git, Terminal, Extensions)

## Status

Accepted — Phase 6

## Context

Phase 5 used browser MVP stubs: `.molecule/git.json` for SCM and inline command handling in `plugin-terminal`. Phase 6 requires real Git, an executable terminal host, production AI providers, and a registry-based extension pipeline — without bloating `apps/reference-ide` or `plugin-runtime` monoliths.

## Decision

Introduce dedicated `@easyspace/*` host packages and keep plugins thin:

| Package | Responsibility | Plugin |
|---------|----------------|--------|
| `@easyspace/git` | `WorkspaceAPI` ↔ isomorphic-git FS; `GitService` | `plugin-scm` UI only |
| `@easyspace/terminal-host` | Sessions, `executeLine`, built-in commands | `plugin-terminal` xterm UI |
| `@easyspace/ai-host` | Providers (mock, OpenAI-compatible), edit stream parser | `plugin-ai` diff UI |
| `@easyspace/plugin-runtime` | `extension-loader`, `createScmService`, `createTerminalService` adapters | — |
| `@easyspace/plugin-api` | `ScmAPI`, `TerminalAPI`, manifest Zod (`terminalCommands`, `localizations`) | — |

### Boundaries

1. **No React** in `@easyspace/git` or `@easyspace/terminal-host`.
2. Plugins import only `@easyspace/plugin-api` (+ UI libs for their views).
3. Reference IDE wires services in `MoleculeIDE.tsx`; it does not implement Git/terminal logic.
4. Dynamic extensions live under `apps/reference-ide/extensions-src/*`, built to `public/extensions/` via `pnpm build:extensions`.
5. **Tauri desktop shell** remains out of scope.

### Migration

- Legacy `.molecule/git.json` snapshots are migrated on first `createGitService` init when no `.git/HEAD` exists.
- `loadExtensionPlugins` returns `{ plugins, localizations }`; `plugin-i18n` merges extension locale contributions.

## Consequences

- Third parties can depend on `@easyspace/git` / `@easyspace/terminal-host` without Reference IDE.
- `plugin-runtime` gains dependencies on git + terminal-host (adapter layer only).
- CI runs `build:extensions` before Reference IDE build.

## Related

- [ADR 002: Plugin system](./002-plugin-system.md)
- [ADR 003: AI Host](./003-ai-host.md)
- [EXTENSIONS.md](../EXTENSIONS.md)
