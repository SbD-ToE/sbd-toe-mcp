# 0001 — Consumed-bundle pin + alignment step (Pontifex side)

**Date:** 2026-06-11
**Status:** Accepted (implements ratified co-design `handover/2026-06-11-orchestrator-codex-pontifex-bundle-alignment-codesign.md`)
**Persona:** Pontifex · **Scope:** OSS, `sbd-toe-mcp-poc`

## Context

The Wave 1 dispatch flagged gap **G3**: the MCP did not declare which Codex KG
release it consumes (§0.6 requires an explicit pin — never "latest"). The
programme lead ratified the alignment principle: **automate the process + pin
explicitly always; product ≠ science**. Compatibility is measured by the Codex
`consumer_contract.md` version, not the bundle number; additive bumps align,
breaking-contract bumps gate; paper-pinned bundles stay immutable.

## Decision (Pontifex-owned pieces)

1. **Pin config — `consumed-bundle.json` (repo root).** Ground truth of what the
   MCP serves: consumer-contract version, substrate version, manual + ontology
   provenance (verified against the bundle's own manifests), and the KG
   `release_tag` / `release_sha256` (Codex-owned — held `null` until confirmed,
   never invented). Alignment policy embedded.
2. **Verifier — `scripts/verify-consumed-bundle.mjs`**, wired into `npm run check`.
   Fails CI on drift between the pin and the shipped substrate
   (`run_manifest.json`, `v1_manifest.json`). When `release_sha256` is set it is
   shape-checked; full sidecar verification activates once Codex ships the
   release artefact. (It already caught a truncated timestamp in the first pin.)

## Verified vs pending

Verified now (from data/ manifests): manual `c32d1204` v0.1.0 (2026-04-07);
ontology tag `ontology-v1.1-fair-baseline` `84fe8bf6`; surface built 2026-05-11;
substrate `v2-draft`; consumer contract `v1.2`.

**Pending Codex** (co-design ask a): the `vX.Y.Z` release tag + `.sha256` sidecar
that corresponds to `c32d1204`, and a deliberate `mcp-stable` production-readiness
pointer. Until then the pin is partial and the "detect new mcp-stable → fetch"
half of the alignment step is not wired.

## Co-design open item (Codex ↔ Pontifex)

The **discovery contract** — how Pontifex detects/validates a release — is joint:
Codex defines the `mcp-stable` pointer + sidecar emission; Pontifex consumes the
pointer, verifies sha256, validates the contract version, updates the pin, and
runs the acceptance suite as a smoke-test, escalating on a breaking bump.

## Update 2026-06-11 — Codex pin answer + contract v1.3

Codex answered the pin asks (handover same date):

- **Today's pin RESOLVED.** `release_tag = kg-v1-cycle-b-run-2-aligned-2026-05-12`
  (contract v1.2), verified to exist in `sbd-toe-knowledge-graph` (→ `e05f1be`).
  Filled in `consumed-bundle.json`. `release_sha256` still held null — awaits the
  Codex release `.sha256` sidecar (tag-complete, digest-pending).
- **`mcp-stable` pointer endorsed** by Codex.
- **v1.6.0 + contract v1.3 compiled** (KG `3621e90`, recompile vs Manual v1.6.0
  `7068b3d`) but the **v1.6.0 tag is NOT yet authorized** — pin migration (and the
  data/ bundle swap) is gated until it is. Recorded under `kg_bundle.next`.
- **Open co-design — tag-scheme duality:** `vX.Y.Z` (semver product channel) vs
  `kg-v1-*-aligned` (cycle-aligned). Pontifex follows the `mcp-stable` pointer and
  pins whichever tag it resolves to; reconciling the two schemes is joint.

### Contract v1.3 (E5) serving alignment — done now, bundle-independent

Aligned the serving vocabulary to the emitted contract (§1.12) ahead of the data
migration, to avoid rework when the E5 envelope binds:

- `estimateSize` now returns `{ chars, approx_tokens }` (contract `size_estimate`
  shape) instead of a bare char count.
- Renamed the pagination type `CoverageMap → PageCoverage` to **reserve the term
  `coverage_map`** for the contract's per-item `{id, label, block, size_estimate,
  retrieval_handle}` index (§1.12). The generic list cursor and the E5 chunk
  envelope are different mechanisms; the names no longer collide.

Deferred until the v1.6.0 bundle migrates into data/: the full E5 envelope
(`resumo + coverage_map[...handles] + related_blocks`), `cross_layer_referrals`
(§1.11), and the `meta` profile — all read v1.6.0 chunk data.

## Not in scope (commercial L4b — awaits repo split)

Attestation / state / gating-machine-face. This decision is OSS serving infra only.
