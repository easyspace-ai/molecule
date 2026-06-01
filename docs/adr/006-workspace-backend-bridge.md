# ADR 006: Workspace backend bridge

## Status

Proposed — Explorer CRUD phase

## Context

Reference IDE persists workspace files in **IndexedDB** via `createIndexedDbWorkspace`. Explorer CRUD (`createFile`, `createDirectory`, `deletePath`, `renamePath`) must work in the browser today while keeping a path for a future **REST/Tauri** backend without rewriting plugins.

Plugins (e.g. `@easyspace/plugin-explorer`) call **`WorkspaceAPI` only** — never IndexedDB or fetch directly.

## Decision

### 1. Extend `WorkspaceAPI` (plugin-api)

| Method | Semantics |
|--------|-----------|
| `createFile(path, content?)` | Fail if file exists |
| `createDirectory(path)` | Explicit empty directory |
| `deletePath(path)` | Remove file or directory tree |
| `renamePath(old, new)` | Move file or directory tree |

Paths are **workspace-relative**, normalized (forward slashes, no leading `/`).

### 2. Introduce `WorkspaceBackendClient` (plugin-api)

Low-level storage contract mirroring a future HTTP API:

| Client method | Future REST (sketch) |
|---------------|----------------------|
| `readFile` | `GET /files?path=` |
| `writeFile` | `PUT /files` `{ path, content }` |
| `createFile` / `createDirectory` | `POST /files` `{ path, isDirectory?, content? }` |
| `deletePath` | `DELETE /files/:path` |
| `renamePath` | `PATCH /files/:path` `{ newPath }` |
| `listFilePaths` | `GET /files` (flat listing) |

### 3. Adapters (plugin-runtime)

| Adapter | Status |
|---------|--------|
| `createIndexedDbWorkspace` | **Implemented** — files in IDB `files` store; explicit dirs in `meta` (`{rootKey}:dirs`) |
| `createMemoryWorkspace` | **Implemented** — unit tests |
| `createHttpWorkspaceClient(baseUrl)` | **Stub** — throws `NotImplemented` |

Phase 7+ implements `createHttpWorkspaceClient` and optionally wraps it in `createRemoteWorkspace()` returning `WorkspaceAPI`.

### 4. Explorer integration

- Toolbar + context menu call `ctx.workspace.*` only.
- After delete/rename, dispatch browser events:
  - `molecule:file-deleted` `{ paths: string[] }`
  - `molecule:file-renamed` `{ oldPath, newPath }`
- Host (`MoleculeIDE`) closes or updates editor tabs.

## Consequences

- Git FS bridge (`@easyspace/git`) can later use `deletePath` / `renamePath` instead of write-empty hacks.
- Backend team can implement REST to match `WorkspaceBackendClient` without plugin changes.
- Empty folders require explicit directory tracking (not inferrable from files alone).

## Related

- [ADR 004: Workspace and settings](004-workspace-and-settings.md)
- [EXTENSIONS.md](../EXTENSIONS.md)
