# Co-design: KG → Pontifex bundle delivery contract

**Date:** 2026-06-11
**From:** Pontifex (`sbd-toe-mcp-poc`)
**To:** Codex (`sbd-toe-knowledge-graph`) + Orchestrator
**Re:** Settle the bundle delivery mechanism **with / before the 1.6.1 close** — avoids rework and aligns the cycle.

## Finding (why this matters)

The MCP-consumed bundle is the **KG build output** (`release_bundle.py`), **not the git tree**.
Generated/derived files — `sbd-toe-index-compact.json` and the flattened
`canonical_*.json` — live in the build output, are **not committed to git**, and
Pontifex does **not** regenerate them (`package-release-lib.mjs` only *copies* them).
Therefore `git archive <tag>` is incomplete: Pontifex must fetch a **built artefact**,
not the tree. Verified empirically: index-compact absent from the tree at both
`kg-v1-cycle-b-run-2-aligned-2026-05-12` and `kg-v1-manual-v1.6.0-aligned-2026-06-11`.

## Proposed contract — dual-source, one mechanism

Unit of delivery = **KG build output + a digest**. Two formality levels so maturation
cycles are not forced into formal releases:

| Source | When | Artefact | Pin |
|--------|------|----------|-----|
| **`release`** | `vX.Y.Z` (production, papers) | tarball + `.sha256` sidecar (GitHub release or agreed location) | digest-**verified** |
| **`dev-build`** | cycle commit/tag (e.g. tripartition states) | **lightweight** built dir or tarball + digest, **no formal release** | `dev:true`, ref + computed digest, traceable |

Both: Pontifex fetches → verifies digest → materializes the consumed file set →
pins (records `source kind + ref + digest`) → runs the acceptance suite as smoke-test.
Reproducible either way; the pin always carries provenance. This respects the
producer/consumer boundary — Codex emits the build output; Pontifex never runs the
KG builder (CLAUDE.md).

## Consumed file set (the bundle must contain these)

Per `bundle-files.json`: `indexes/{publication_manifest.json, bundle_catalog.jsonl,
mcp_chunks.jsonl (with size_estimate, §1.12), canonical_chunks.jsonl,
chunk_entity_mentions.jsonl, chunk_relation_hints.jsonl, cross_layer_referrals.jsonl
(v1.3/E5)}`, `sbd-toe-index-compact.json`, `runtime/`, `overlay/`,
`ontology/{appsec-core-ontology.yaml, sbdtoe-ontology.yaml}`, and
`data/reports/run_manifest.json`.

## Asks for the 1.6.1 close

1. **Emit a fetchable build output** for the 1.6.x tag — either the release tarball +
   `.sha256`, **or** a dev-build dir/tarball + digest. Pontifex cannot materialize
   without it (the tree lacks the generated files).
2. **Agree the dev-build format**: dir vs tarball; whole-bundle `sha256` vs per-file
   `.sha256` sidecars.
3. **Confirm derivatives stay KG-generated** (`index-compact`, `canonical_*`) — i.e.
   Pontifex consumes them, does not generate (default, per CLAUDE.md). Flag if you
   want that boundary to move.

## Pontifex side — ready

`bundle-files.json` (consumed set), `consumed-bundle.json` (pin, today =
`kg-v1-cycle-b-run-2-aligned-2026-05-12` / contract v1.2, digest-pending),
`scripts/verify-consumed-bundle.mjs` (drift gate). `scripts/sync-bundle.mjs` will be
adapted to `--from-release` / `--from-dir` on agreement (the git-archive prototype is
retired — proved the tree is incomplete).
