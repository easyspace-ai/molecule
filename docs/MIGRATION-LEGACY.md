# Legacy Molecule → Molecule Next migration map

> **Cleanup note:** Legacy `src/`, `app/`, `website/`, `esm/`, and vendored reference clones (`Pyxis-CodeCanvas/`, `craft-agents-oss/`) were removed from this repository in the Molecule Next cleanup. Consult git history for the deleted tree and file contents.

This document maps APIs from the original `@dtinsight/molecule` codebase to **Molecule Next** (`@easyspace/*` packages). There is **no runtime compatibility layer**.

## Package mapping

| Legacy | Molecule Next |
|--------|----------------|
| `@dtinsight/molecule` | `@easyspace/kernel` + `@easyspace/workbench` + `@easyspace/editor` + `@easyspace/plugin-runtime` |
| `create({ extensions })` | `createApp({ plugins })` + `PluginManager` + React `<MoleculeIDE />` |
| `IExtension` | `PluginModule` + `pluginManifestSchema` (Zod) |
| `IMoleculeContext` | `PluginContext` facades (`workspace`, `workbench`, `editor`, `commands`, `ai`, `ui`) |
| `mo/services/*` | Domain stores (Zustand) + plugin contributions |
| Built-in `src/extensions/*` | `packages/plugins/plugin-*` |

## Capability mapping

| Legacy API | Molecule Next |
|------------|----------------|
| `mo.editor.open(tab)` | `ctx.editor.openDocument({ uri, languageId, content })` |
| `mo.sidebar.add({ id, name, ... })` | `contributes.views` + `ctx.workbench.registerView('sidebar', id, render)` |
| `mo.activityBar.add` | Activity items via workbench / view contributions |
| `mo.panel.add` | `contributes.views` with `location: 'panel'` |
| `mo.auxiliaryBar` | `contributes.views` with `location: 'auxiliaryBar'` (used by `plugin-ai`) |
| `mo.colorTheme.setTheme` | `plugin-themes` commands + `setThemeChangeHandler` |
| `mo.action.registerAction` | `ctx.commands.registerCommand` |
| N/A (new) | `ctx.ai.streamChat`, `ctx.ai.registerTool`, `ctx.ai.registerProvider` |

## Assets to migrate selectively

| Legacy path | Notes |
|-------------|--------|
| `src/extensions/themes/*.json` | Copy into `plugin-themes` as static assets |
| `src/extensions/locales/*` | Future `plugin-i18n` |
| `src/monaco/override/*` | Re-evaluate per Monaco version; prefer official APIs in `@easyspace/editor` |
| `src/client/slots/workbench/index.tsx` | Layout reference for `@easyspace/workbench` |

## Workspace layout

New development happens only under `packages/` and `apps/reference-ide/`. Dynamic extensions live in `apps/reference-ide/extensions-src/` and build to `apps/reference-ide/public/extensions/`.
