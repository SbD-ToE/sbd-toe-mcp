# CLAUDE.md — Agent Guidance for sbd-toe-mcp-poc

MCP (Model Context Protocol) stdio server exposing grounded retrieval over the
SbD-ToE manual + AppSec Core knowledge graph. TypeScript/Node.js ESM ≥20.9.
Part of the SbD-ToE / AppSec Core research programme (P0 DOI 10.17605/OSF.IO/7T849).

## Mandatory before making changes

1. Read `PROGRAMME-PRESERVATION-PROTOCOL.md` in full — it is binding for all
   human and AI agents. Published/frozen states (DOIs, release tags, pinned
   hashes) are immutable; history is append-only.
2. Read `FREEZE-REGISTRY.md` at the repo root if present. If it is absent,
   flag that to the operator before substantial changes.
3. Update `AI-USE-DISCLOSURE.md` if a new AI tool enters the workflow or an
   existing tool's role materially changes.

## Current state vs. historical artifacts

- **Source of truth for current state:** `git log`, `CHANGELOG.md`, `README.md`.
  Latest release line: v0.9.0 (grounded codegen, May 2026).
- **`aos/` is a frozen historical snapshot** of the "MCP v2" epic executed via
  the AOS agentic triplet (Mar 2026, slices s1–s15, all closed). Do NOT treat
  `aos/current_execution_state.md` or its pending actions as live. Post-AOS
  work happened via direct Claude/Codex sessions and GitHub PRs.
- `.claude/agents/aos-*-daemon.md` define the AOS team daemons; they require
  the `aos-engine` MCP server, which may not be connected.

## Hard constraints (MCP server)

- stdout is reserved for the JSON-RPC protocol; operational logs go to stderr.
- No shell/exec tools exposed by the MCP server; the server never edits the workspace.
- Validate all MCP tool inputs before use.
- Do not move knowledge-builder logic from the upstream repo
  (`sbd-toe-knowledge-graph` / `appsec-core-ontology-research`) into this repo.
- Never generate or invent SHA-256 hashes, DOIs, release tags, or provenance
  identifiers — all provenance is verified against upstream pinned releases.

## Build & test

```bash
npm run check   # typecheck/lint
npm run build
npm test        # vitest
```
