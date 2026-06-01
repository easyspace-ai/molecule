# Extension build pipeline

Reference IDE loads dynamic extensions from `apps/reference-ide/public/extensions/` (see `index.json`).

## Source layout

```
apps/reference-ide/extensions-src/<name>/
  index.ts | index.tsx   # PluginModule (default export)
  manifest.json         # Extension manifest (id, main, contributes)
```

## Build

From the repository root:

```bash
pnpm build:extensions
```

This uses **esbuild** to bundle each extension to ESM `index.js` and copies `manifest.json` into `public/extensions/<id>-extension/`. All subdirectories of `extensions-src/` with an entry file are built automatically. Registry metadata (`description`, `type`, `availableOnly`, etc.) is copied into `index.json`.

CI and `@easyspace/reference-ide` build run `build:extensions` first.

## Registry index

`public/extensions/index.json`:

```json
{
  "extensions": [
    {
      "id": "hello-extension",
      "path": "hello-extension/",
      "type": "command",
      "availableOnly": false
    },
    {
      "id": "calc-extension",
      "path": "calc-extension/",
      "type": "ui",
      "availableOnly": true
    }
  ]
}
```

## Extension manifest v2

Manifests support optional v2 fields (backward compatible):

| Field | Purpose |
|-------|---------|
| `icon` | Emoji or symbol shown in marketplace / detail |
| `readme` | Inline markdown or path to README file |
| `description` | Short summary |
| `type` | e.g. `ui`, `command`, `theme` |
| `publisher` | Publisher name |
| `availableOnly` | Listed in marketplace but not installed by default |
| `activityBar` | `{ id, title, icon, viewId? }` for dedicated activity item |
| `editorTab` | `{ id, title }` for detail tab metadata |
| `configuration` | Extension settings schema |

Validated by `validateExtensionManifest()` in `@easyspace/plugin-runtime` (uses Zod schemas from `@easyspace/plugin-api`).

## Marketplace UI

Built-in `@easyspace/plugin-extensions` sidebar provides:

- **Installed** / **Available** tabs with search
- Card actions: Enable, Disable, Install, Uninstall, Update (stub)
- Double-click card → opens **extension detail** editor tab (`extension-detail://<id>`)

Frontend persistence keys:

| Key | Purpose |
|-----|---------|
| `molecule:installed-extensions` | Installed extension IDs |
| `molecule:disabled-extensions` | Disabled among installed |
| `molecule:extension-config:{id}` | Per-extension JSON config |

Reload the window after install/uninstall/enable changes.

## Catalog API (backend-ready)

`ExtensionCatalogEntry` in `@easyspace/plugin-runtime` matches a future REST marketplace row:

```ts
{
  id, name, version, description, path,
  enabled, installed,
  icon?, readme?, type?, publisher?,
  downloadUrl?, sha256?,
  configuration?, activityBar?, editorTab?
}
```

`fetchExtensionCatalog(extensionsBase)` loads the local index today; a future host can point the same type at `GET /api/extensions/catalog`.

## Sample extensions

| Extension | Demonstrates |
|-----------|--------------|
| `hello/` | Command + rich manifest metadata |
| `sample-panel/` | Sidebar view + command + localizations |
| `calc/` | Calculator sidebar (`availableOnly`, install from marketplace) |
| `todo/` | TODO list sidebar (`availableOnly`) |

After build, reload Reference IDE. Install **Calculator** from the Available tab, reload, then click the 🧮 activity icon.

## Author guide

1. Create `extensions-src/my-ext/manifest.json` with `id`, `name`, `version`, `main: "index.js"`.
2. Export a default `PluginModule` from `index.ts` or `index.tsx`.
3. Optional contributions:
   - `commands`, `views`, `keybindings`
   - `terminalCommands` — register at activate (schema validated)
   - `localizations` — merged by `plugin-i18n`
   - `activityBar` — extra activity bar entry targeting a sidebar view
4. Run `pnpm build:extensions` (updates `index.json` automatically).
5. Add `availableOnly: true` to ship in catalog without default install.

## Events

| Event | Detail | Purpose |
|-------|--------|---------|
| `molecule:open-extension-detail` | `ExtensionDetailData` | Open detail editor tab |
| `molecule:extension-uninstalled` | `{ id }` | Close detail tab |
| `molecule:extension-update-stub` | `{ id, name }` | Update button stub |

## Limitations

- Extensions share the host origin; React is bundled into UI extensions at build time (`build-extensions.mjs`).
- `@easyspace/plugin-api` remains external for extension entry modules.
- No separate npm install at runtime yet; remote `downloadUrl` is reserved for backend marketplace.
- For production, sign manifests and pin extension versions in `index.json`.

## Related

- [ADR 002: Plugin system](adr/002-plugin-system.md)
- [ADR 005: Phase 6 host packages](adr/005-phase6-host-packages.md)
