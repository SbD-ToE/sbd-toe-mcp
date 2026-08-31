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
**Last updated:** 2026-08-30
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
- v0.10.2 → `31aa22af780d56f958b220258ffa82ca46f1d7c7` (2026-08-29; formal KG release v1.6.0
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.2` = `latest`, gitHead same commit;
  GitHub Release `v0.10.2`)
- v0.10.3 → `06f8bbaa5e4d5f3ac6ddda890a6fbebd78f6be9b` (2026-08-30; formal KG release v1.6.1
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.3` = `latest`, gitHead same commit;
  GitHub Release `v0.10.3`)
- v0.10.4 *(formal KG release v1.7.0 pinned — see CHANGELOG; annotated tag created on the
  squash commit of the PR that introduces this row, after its merge to master)*

### Beta line (`0.20.x-beta`) — NOT citable, NOT a freeze candidate

Prerelease tags on the `0.20-beta` branch (e.g. `v0.20.0-beta.0`) publish to the npm
`beta` dist-tag for engine R&D (the SPARQL graph-query capability, `trace_sbd_toe_graph`).
They are **experimental, non-citable, and explicitly excluded from the scientific record**
— no DOI, no freeze, no archival deposit. `CITATION.cff` and the published states above
track **only** the stable line. A beta graduates to the scientific record only by being
folded into a stable `vX.Y.Z` release (with canonical, upstream-ratified IRIs).

Prerelease tags issued on `0.20-beta` (annotated; immutable like every pushed tag, but
**not** protected/frozen states and never archived):

| Tag | Commit | Date | Served bundle | npm |
|---|---|---|---|---|
| v0.20.0-beta.1 | cf4f011 | 2026-06-29 | KG v1.5.0 (`feaa0155…`) | `beta` (superseded) |
| v0.20.0-beta.2 | 0cc9e14 | 2026-07-05 | KG v1.5.0 (`feaa0155…`) | `beta` (superseded) |
| v0.20.0-beta.3 | 5b34638 (`5b346387cdfd48146d64422c0e7a217d9b3f320f`; annotated tag object `48cdd14d`) | 2026-08-29 | formal KG `v1.6.0` (`baf5913b…`, contract v1.11, Manual v1.7.0) — same pin and content as stable v0.10.2 | `beta` (superseded) |
| v0.20.0-beta.4 | d89b30d (`d89b30dfacbc89c023ec53c1b5b882b77a9f86a9`; annotated tag object `6291f50d`) | 2026-08-30 | formal KG `v1.6.1` (`df6920cb…`, contract v1.12, Manual v1.7.1) — same pin and content as stable v0.10.3 | `beta` (superseded) |
| v0.20.0-beta.5 | 62a1eda (`62a1eda3982147e44369c8a9271ca3697af2680f`; annotated tag object `5165a04a`) | 2026-08-31 | formal KG `v1.7.0` (`29156b86…`, contract v1.14, ontology v2.2, Manual v1.7.1) — same pin and content as stable v0.10.4 | `beta` (`latest` = 0.10.4 untouched) |

## Current working state

**Current branch:** `0.20-beta` — this copy of the registry lives on the beta branch; the
stable-line rows mirror master (`2937236`, v0.10.4) and are maintained there.
**Beta line:** most recent prerelease v0.20.0-beta.5 → `62a1eda3982147e44369c8a9271ca3697af2680f`
(2026-08-31; `release.yml` run 33376552153 published npm `@shiftleftpt/sbd-toe-mcp@0.20.0-beta.5`
= `beta`, gitHead same commit; GitHub pre-release; `latest` = 0.10.4 untouched), npm dist-tag `beta`; serves the same formal
KG `v1.7.0` pin as v0.10.4. Prior: v0.20.0-beta.4 → `d89b30df` (KG v1.6.1), v0.20.0-beta.3 →
`5b346387` (KG v1.6.0). Not a published/frozen state.
**Most recent published state:** icsme-2026-tool-demonstration / v0.9.0 (2026-05-21)
**Most recent release:** v0.10.4 (2026-08-30) — served bundle: formal KG release
`v1.7.0` (commit `894af32a85d6a50f648f10d8a643848e806e533e` = `mcp-stable`; asset sha256
`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`; consumer contract
v1.14), ontology `sbdtoe-ontology-v2.2` (`2be86e8b`), Manual v1.7.1
(`8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`). Tag `v0.10.4` = squash commit of the PR
introducing this row (recorded here once created). Prior: v0.10.3 (2026-08-30,
`06f8bbaa`, KG v1.6.1), v0.10.2 (2026-08-29, `31aa22af`, KG v1.6.0).
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
- sbd-toe-knowledge-graph — formal release `v1.7.0` @ `894af32a85d6a50f648f10d8a643848e806e533e`
  (asset sha256 `29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`) since v0.10.4;
  `v1.6.1` @ `e9fc54f312829c632ecd50e2306bfa356e9e457c`
  (asset sha256 `df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`) for v0.10.3;
  `v1.6.0` @ `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d` (sha256 `baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`) for v0.10.2;
  `v1.5.0` (sha256 `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`) for v0.10.0/v0.10.1
- SbD-ToE/sbd-toe-manual — `v1.7.1` @ `8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac` (via the KG bundle) since v0.10.3;
  `v1.7.0` @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` for v0.10.2
- SbD-ToE/sbd-toe-ontology — `sbdtoe-ontology-v2.2` @ `2be86e8b` (via the KG bundle, sync tag `corpus-v2-ontology-sync-2be86e8`) since v0.10.4; `ontology-v1.1-fair-baseline` @ `84fe8bf6f5de1443d778f9b2f0555b722540bbff` (AppSec Core anchor)
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

- **Tag `v0.2.5` diverges between a local clone and origin** (observed 2026-08-29 while
  preparing v0.20.0-beta.3). `origin` `refs/tags/v0.2.5` → `8a479c81892e12a249279c772be313d7efffd777`
  (lightweight; «ci: remove NODE_AUTH_TOKEN from npm publish step», 2026-03-27 18:07:05Z; the
  GitHub Release `v0.2.5` was created at that instant on that commit). The local clone at
  `SecurityByDesign-TheoryOfEverything/sbd-toe-mcp-poc` carries `v0.2.5` →
  `318b8ee7e952c6e968a2836aa59223e778e62ec7` («chore: bump to 0.2.5», 18:07:36Z). The two
  commits are siblings (neither is an ancestor of the other; both reachable from master) and
  npm never published 0.2.5 (`npm view …@0.2.5` → 404). **Canonical = origin (`8a479c81`)** —
  the pushed tag and its GitHub Release are the published state (§3.2); the local ref is a
  stale pre-push variant. Per Rule 9 nothing was re-pointed; the only remediation, if the
  programme lead wants it, is refreshing the local ref in that clone
  (`git fetch origin --tags --force`), which touches no published state.

## Change log for this registry

| Date | Change | Author |
|---|---|---|
| 2026-06-25 | Initial skeleton created (file was absent). Populated from git tags + CITATION.cff; uncertain mappings marked TODO. | Claude (AI agent), under Pedro Farinha |
| 2026-08-29 | v0.10.2 registered (protected tag list, current working state, upstream pins with exact tags/hashes: KG v1.6.0, Manual v1.7.0, ontology v1.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | v0.10.2 tag commit recorded (`31aa22af`, squash of #47); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | Beta-line copy (branch `0.20-beta`): prerelease-tag table (beta.1/beta.2/beta.3), beta current working state, `v0.2.5` local/origin divergence recorded (canonical = origin; nothing re-pointed). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | v0.20.0-beta.3 tag commit recorded (`5b346387`); npm `beta` publish + GitHub pre-release confirmed (run 33266147054). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 registered (protected tag list, current working state, upstream pins: KG v1.6.1, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 tag commit recorded (`06f8bbaa`, squash of #51); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.4 registered (protected tag list, current working state, upstream pins: KG v1.7.0, ontology v2.2, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | Beta-line copy: stable rows synced from master (v0.10.3, KG v1.6.1); v0.20.0-beta.4 registered in the prerelease table (tag on the commit introducing this row). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.20.0-beta.4 tag commit recorded (`d89b30df`, fix-forward over `272d8c9`); npm `beta` publish + GitHub pre-release confirmed (run 33282763025). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Beta-line copy: stable rows synced from master (v0.10.4, KG v1.7.0); v0.20.0-beta.5 registered in the prerelease table (tag on the commit introducing this row). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.20.0-beta.5 tag commit recorded (`62a1eda3`); npm `beta` publish + GitHub pre-release confirmed (run 33376552153). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
