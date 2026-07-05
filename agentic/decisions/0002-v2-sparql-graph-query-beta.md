# 0002 — v2: SPARQL graph-query capability on a parallel beta line

**Date:** 2026-06-30
**Status:** Accepted & shipped to the `beta` dist-tag (NOT graduated to stable)
**Persona:** Pontifex · **Scope:** `sbd-toe-mcp` `0.20.x` beta line (branch `0.20-beta`)

> Repo-local mirror of agent memory so any agent (Codex, future sessions, Pontifex)
> sees the v2 state on checkout — not just one harness's private store.

## Context

We asked whether a graph DB / query engine (Neo4j, Kùzu, SPARQL, FAISS) would
improve the serving layer over the current in-memory, file-backed approach.

Findings (grounded in the actual bundle):
- The graph is **tiny and shallow / star-shaped** (~789 edges; hubs `Slice` and
  `ControlObjective`; `Control`/`Threat`/`EvidencePattern` are sinks). Query speed
  is a non-issue; deep-path traversal has little material.
- **Native engines are out** (Neo4j, Kùzu, `faiss-node`): per-platform native
  binaries break the `npx`-pure / offline / cross-platform property for ~zero gain
  at this scale. FAISS is also redundant (~4k vectors → exact in-memory cosine).
- A **pilot** (migrate `resolve_entities` / `get_threat_landscape` to SPARQL)
  **killed the "refactor existing tools" thesis**: `resolve_entities` is flat
  attribute filtering (SPARQL would be *worse* — flatten→reconstruct); the other
  tools are graph-light (business-logic-dominated). SPARQL does not materially
  simplify any existing tool.

## Decision

1. **SPARQL is a NEW, additive capability — not a refactor.** Engine =
   **Oxigraph (WASM)**: pure WASM, zero deps, no install script, no native binary →
   preserves `npx`/offline/cross-platform. Gates met: offline ✅, determinism via
   `ORDER BY` ✅, cold-start ~+47 ms, install footprint +7.89 MB (tarball unchanged).
2. **New tool `trace_sbd_toe_graph`** — curated multi-hop lenses over the AppSec
   Core v1 relation graph, served from an RDF projection of the existing bundle:
   - `slice_implementation` (slice → control objectives → mechanisms/practices)
   - `objective_realization` (control objective → mechanisms/practices)
   - `mechanism_provenance` (mechanism/practice → objectives → slices)
3. **Dual release line, one repo, one npm package.** Stable `0.10.x`/`0.11.x` on
   `latest`; experimental `0.20.x` on `beta`. Distinguished by prerelease version
   (`-beta.N`) + dist-tag — never by a separate package.
4. **TS in-process graph-index is the documented fallback** if the engine ever
   regresses a hard gate. (Not needed: tools are graph-light, so existing tools
   stay as-is.)

## Invariants (binding for any agent working this line)

- **Additive only** — no existing tool's contract/output changes; `consumed-bundle.json`
  (served data) is identical to stable. New engine, constant data.
- **Determinism + coverage-preserving** — every SPARQL query carries a total-order
  `ORDER BY`; `GraphStore.query()` enforces it and returns `total` + `cursor`.
- **No internal-IRI leak** — tool I/O uses entity ids; IRIs are a projection detail.
- **IRIs are PROVISIONAL/local** (`https://sbd-toe.dev/v2/…`). The canonical IRI
  scheme is an **upstream (ontology) decision** required before graduation.
- **Betas are NOT citable** — excluded from the scientific record (see
  `FREEZE-REGISTRY.md`); no DOI/freeze. Graduation = folding into a stable `vX.Y.Z`.

## Implementation (where it lives)

- `src/serving/rdf/projection.ts` — bundle → RDF triples (+ `idFromIri` no-leak helper).
- `src/serving/rdf/graph-store.ts` — Oxigraph wrapper (`ORDER BY` guard + coverage paging).
- `src/tools/trace-graph.ts` — the tool (3 lenses); registered in `src/index.ts` (additive).
- Tests: unit (`*.test.ts`), functional smoke (`trace-graph.smoke.test.ts` — cross-lens +
  cross-tool coherence with `resolve_entities`), e2e (`scripts/smoke-mcp.mjs`, `npm run smoke:mcp`).
- Plan: `agentic/planeado/v2-sparql/EPIC.md` (slices s0–s6, gate per step).

## Status / consequences

- **Shipped:** `v0.20.0-beta.1` published to npm `@beta` (2026-06-29, with provenance).
  `dist-tags: latest=0.10.1 (untouched), beta=0.20.0-beta.1`. Default `npx` = stable;
  v2 only via `@beta`.
- `release.yml` gained **prerelease support** (`vX.Y.Z-beta.N` → `--tag beta`, GitHub
  pre-release, `latest` untouched, `Verify tag is on 0.20-beta`).
- **OIDC trusted-publishing repaired** (npm Trusted Publisher repointed to
  `SbD-ToE/sbd-toe-mcp` + `release.yml`) → this also **restores automatic stable
  releases**. `v0.20.0-beta.0` had authenticated via OIDC but aborted on a Sigstore
  tlog 409 (dup); re-cut `beta.1` published cleanly.

## To graduate v2 → stable (open)

1. Ratify the **canonical IRI scheme** with upstream (ontology repo); replace the
   provisional `sbd-toe.dev/v2` minting in `projection.ts`.
2. Decide the final lens set (and whether to add `antipattern_impact`).
3. Fold into a stable `0.x` release (then it becomes citable).
