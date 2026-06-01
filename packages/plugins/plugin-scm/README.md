# @easyspace/plugin-scm

Source control UI for Molecule Next, backed by **`@easyspace/git`** (isomorphic-git).

## Storage

Git objects live under `.git/` in the workspace (IndexedDB-backed in Reference IDE). Legacy `.molecule/git.json` snapshots are migrated automatically on first init.

## Behavior

- **Status** — isomorphic-git `statusMatrix` + editor `noteChange` hints
- **Stage / Unstage** — `git add` / `git resetIndex`
- **Commit** — real commits with author `Molecule User <user@molecule.local>`
- **Log** — recent commits in sidebar
- **Branch** — shown in status bar (via `ScmAPI.getRepositories`)

## Dependencies

- `@easyspace/git` — GitService
- `@easyspace/plugin-runtime` — `createScmService(workspace)` adapter to `ScmAPI`

## Limitations

- No merge/rebase UI (MVP)
- Branch checkout supported via API; UI deferred
- Browser-only; no native filesystem hooks
