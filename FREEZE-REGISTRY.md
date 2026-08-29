<!--
  AI-PREPARED SKELETON — pending human review by programme lead (Pedro Farinha).
  Created to satisfy PROGRAMME-PRESERVATION-PROTOCOL.md §5 (the file was absent).
  Per §8.2, fields that could not be verified from git + CITATION.cff are marked
  "TODO — verify". No SHA-256 hashes, DOIs, or tags were invented; commit short-
  hashes below are read directly from `git for-each-ref`. The mapping of release
  tags to paper-publication / freeze events is INFERRED and must be confirmed.
-->

# FREEZE REGISTRY — sbd-toe-mcp

**Repository:** SbD-ToE/sbd-toe-mcp — https://github.com/SbD-ToE/sbd-toe-mcp
  (formerly `Shiftleftpt/sbd-toe-mcp-poc`; relocated 2026-06)
**Part of programme:** SbD-ToE / AppSec Core (P0 DOI 10.17605/OSF.IO/7T849)
**Governed by:** PROGRAMME-PRESERVATION-PROTOCOL.md v1.0
**Last updated:** 2026-08-29
**Status:** skeleton — pending human verification

## Published states

The 2026-05-21 state is the one cited by the ICSME 2026 Tool Demonstration
(CITATION.cff `version: 0.9.0`, `date-released: 2026-05-21`). Two candidate tags
carry that date — confirm which is canonical.

| Tag | Commit | Date | Paper/event | DOI(s) | Archives |
|---|---|---|---|---|---|
| icsme-2026-tool-demonstration | 4156582 | 2026-05-21 | ICSME 2026 Tool Demo & Data Showcase | OSF 10.17605/OSF.IO/PGDR6 | figshare 10.6084/m9.figshare.32389887 (tool-bundle); B2SHARE 10.23728/b2share.2bgbn-k8044 (tool-bundle); figshare 10.6084/m9.figshare.32389878 (screencast); B2SHARE 10.23728/b2share.z5sgr-wkt02 (screencast) |
| v0.9.0 | 521f764 | 2026-05-21 | release line cited by CITATION.cff | see row above — TODO confirm same deposit | TODO — verify |

## Frozen states

| Tag | Commit | Date | Description | Freeze reason | Archives |
|---|---|---|---|---|---|
| v0.1.0-frozen | 880a07f | 2026-03-24 | earliest frozen snapshot | TODO — verify | TODO — verify |

## Protected tags

Per §3.2 the following are permanently immutable (no delete, no move, no
force-push). This lists the published/frozen/event tags; routine intermediate
release tags (`v0.2.x`–`v0.8.x`) are retained but their protection scope is
TODO — confirm with programme lead.

- v0.1.0-frozen
- icsme-2026-tool-demonstration
- v0.9.0
- v0.10.0
- v0.10.1 (packaging fix — see CHANGELOG)
- v0.10.2 *(formal KG release v1.6.0 pinned — see CHANGELOG; annotated tag created on
  the squash commit of the PR that introduces this row, after its merge to master)*

## Current working state

**Current branch:** master
**Most recent published state:** icsme-2026-tool-demonstration / v0.9.0 (2026-05-21)
**Most recent release:** v0.10.2 (2026-08-29) — served bundle: formal KG release
`v1.6.0` (commit `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d` = `mcp-stable`; asset sha256
`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`; consumer contract
v1.11), Manual v1.7.0 (`d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce`), ontology
`ontology-v1.1-fair-baseline` (`84fe8bf6f5de1443d778f9b2f0555b722540bbff`). Tag
`v0.10.2` = squash commit of the PR introducing this row (recorded in the CHANGELOG /
GitHub Release once created). Prior: v0.10.1 (2026-06-25), v0.10.0 (2026-06-17).
**Expected next freeze event:** none scheduled

## Cross-references

This repository is referenced by:
- ICSME 2026 Tool Demonstration (see preferred-citation in CITATION.cff)

Programme papers cited by this tool (upstream, see CITATION.cff):
- P0 = 10.17605/OSF.IO/7T849 (programme prospectus / anchor)
- P1 = 10.17605/OSF.IO/WG8PV (AppSec Core v0 — Normalized Ontology)
- P5 = 10.17605/OSF.IO/KH8Y7 (MCP Instrument Specification — pre-registered)
- P6 = 10.17605/OSF.IO/U9CRD (AppSec Core v1 — Formalized Ontology)
- P7 = 10.17605/OSF.IO/3E8G5 (Pressure-Testing AppSec Core — DSR)
- P8 = 10.17605/OSF.IO/TXW8P (Coverage-Preserving Compilation v2)

This repository depends on (upstream, pinned in `consumed-bundle.json`, digest-verified):
- sbd-toe-knowledge-graph — formal release `v1.6.0` @ `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d`
  (asset sha256 `baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`) since v0.10.2;
  `v1.5.0` (sha256 `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`) for v0.10.0/v0.10.1
- SbD-ToE/sbd-toe-manual — `v1.7.0` @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` (via the KG bundle) since v0.10.2
- SbD-ToE/sbd-toe-ontology — `ontology-v1.1-fair-baseline` @ `84fe8bf6f5de1443d778f9b2f0555b722540bbff`
- appsec-core-ontology-research (programme papers P1/P6/P7/P8, see CITATION.cff)

## Violations / anomalies detected

Per Rule 8, flagged for human review (not remediated by the agent — Rule 9
prohibits tag deletion without explicit authorisation):

- A lightweight tag named **`list`** (commit 65c729a, 2026-03-30) appears to be
  an accidental artifact (e.g. from a mistyped `git tag list`). Recommend review
  and, if confirmed erroneous, document + remove per §3.2 with programme-lead
  authorisation. Do NOT delete without that authorisation.
- This registry was created 2026-06-25, well after the protocol's effective date
  (2026-04-17) and after the §8.1 four-week retroactive window. Class B per §9.2
  (reversible; no scientific damage if completed promptly).

## Change log for this registry

| Date | Change | Author |
|---|---|---|
| 2026-06-25 | Initial skeleton created (file was absent). Populated from git tags + CITATION.cff; uncertain mappings marked TODO. | Claude (AI agent), under Pedro Farinha |
| 2026-08-29 | v0.10.2 registered (protected tag list, current working state, upstream pins with exact tags/hashes: KG v1.6.0, Manual v1.7.0, ontology v1.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
