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

## Not in scope (commercial L4b — awaits repo split)

Attestation / state / gating-machine-face. This decision is OSS serving infra only.
