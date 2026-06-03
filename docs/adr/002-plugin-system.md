# ADR 002: Plugin system as product core

## Status

Accepted

## Context

Built-in IDE features were hard-coded extensions in the legacy codebase. Maintainability and AI-era extensibility require a first-class plugin runtime.

## Decision

- All features (including Explorer, Themes, AI UI) ship as **plugins** using the same `PluginManifest` + `activate(ctx)` contract.
- Static contributions (themes, commands, views) apply at load time; `activationEvents` defer `activate()` until needed.
- Plugins must not import `@jiulimiai/kernel` internals — only `@jiulimiai/plugin-api` facades.

## Consequences

- `plugin-runtime` owns registry and lifecycle; `kernel` only orchestrates startup.

## Extension loader (Phase 4)

Third-party plugins ship as ESM bundles under the host `public/extensions/<id>/` folder:

1. `index.json` lists extension folder ids.
2. Each folder provides `manifest.json` (validated with `pluginManifestSchema`) and `main` module URL.
3. `loadExtensionPlugins()` in `@jiulimiai/plugin-runtime` fetches manifests and dynamic-imports modules at startup.

Reference IDE loads `/extensions` after built-in plugins. Sample: `hello-extension`.
