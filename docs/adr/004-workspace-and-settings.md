# ADR 004: Workspace providers and settings persistence

## Status

Accepted

## Context

The Reference IDE uses an in-memory workspace seeded at startup. Pyxis-CodeCanvas demonstrates IndexedDB-backed persistence, `.pyxis/settings.json`, and session-scoped layout. Molecule Next needs a clear split between **framework contracts** (plugin-api) and **host implementations** (Reference IDE, future products).

## Decision

1. **WorkspaceProvider abstraction** (plugin-api) with two first-party implementations:
   - `memory` — default for demos/tests (`createMemoryWorkspace`)
   - `indexeddb` — Phase 2 plugin/host implementation (not bundled in kernel)

2. **Settings layers**:
   - **User preferences** (theme, keybindings): `localStorage` keys under `molecule:*`
   - **Session layout** (pane %, visibility): `sessionStorage` key `molecule:layout`
   - **Workspace settings** (future): JSON file in workspace root via `ConfigurationService` (Phase 2)

3. **Layout model**: workbench stores **percentage** dimensions (sidebar, auxiliary, panel) with min/max bounds; hosts persist and restore via `molecule:layout`.

4. **Keybindings**: declarative contributions in manifest + runtime registry in `@jiulimiai/plugin-runtime`; UI hosts wire `useKeybindings` to execute commands.

## Consequences

- Reference IDE restores theme from `localStorage` and layout from `sessionStorage` on mount (Phase 1).
- Plugins must not read storage directly for workbench layout — use workbench APIs when exposed (Phase 2 `ConfigurationService`).
- IndexedDB workspace and Git SCM remain optional plugins, not kernel dependencies.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Single localStorage blob | Mixes durable prefs with ephemeral layout |
| Pixel-only layout | Poor resize on window/viewport changes |
| Monaco keybinding service only | Couples shell shortcuts to editor focus model |
