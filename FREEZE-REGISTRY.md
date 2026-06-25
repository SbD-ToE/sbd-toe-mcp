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
**Last updated:** 2026-06-25
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
- v0.10.1 *(packaging fix — see CHANGELOG; tag pending, to be created on release
  of the commit that introduces this registry)*

## Current working state

**Current branch:** master
**Most recent published state:** icsme-2026-tool-demonstration / v0.9.0 (2026-05-21)
**Most recent release:** v0.10.0 (2026-06-17). v0.10.1 (packaging fix; fix-forward
over immutable v0.10.0) is pending — tag to be created on release of this commit.
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

This repository depends on (upstream, pinned releases — TODO record exact tags/hashes):
- sbd-toe-knowledge-graph (served bundle; CHANGELOG cites formal KG release v1.5.0)
- appsec-core-ontology-research

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
