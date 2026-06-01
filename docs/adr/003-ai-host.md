# ADR 003: AI Host as separate package

## Status

Accepted

## Context

AI spans editor inline edits, auxiliary chat panel, tool execution, and MCP. A single plugin cannot own cross-cutting context without kernel coordination.

## Decision

- Introduce **`@easyspace/ai-host`** with Provider registry, context pipeline, streaming channels, and tool executor with permission prompts.
- UI and default OpenAI-compatible wiring live in **`@easyspace/plugin-ai`**.
- Plugins contribute `aiProviders` and `aiTools` via manifest schema in `plugin-api`.

## Consequences

- Reference IDE can disable `plugin-ai` and retain a traditional IDE shell.
- API keys stay in host config or BFF, never in plugin bundles.
