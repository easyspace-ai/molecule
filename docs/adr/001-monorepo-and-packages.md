# ADR 001: Monorepo and package boundaries

## Status

Accepted

## Context

Molecule Next replaces the monolithic `@dtinsight/molecule` service layer with a thin kernel, workbench shell, plugin runtime, and optional AI host.

## Decision

- Use **pnpm workspaces** + **Turborepo** for build orchestration.
- Publish scope **`@jiulimiai/*`** for all public packages.
- Split: `kernel`, `workbench`, `editor`, `plugin-api`, `plugin-runtime`, `ai-host`, and official plugins under `packages/plugins/`.
- Legacy code under repository root `src/` remains for reference until migrated (see `docs/MIGRATION-LEGACY.md`).

## Consequences

- Apps depend only on published package APIs, not legacy `mo/*` paths.
- CI runs `turbo run build test typecheck` on the new graph.
