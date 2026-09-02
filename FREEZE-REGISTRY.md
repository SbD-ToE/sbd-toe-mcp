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
**Last updated:** 2026-08-31
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
- v0.10.4 → `2937236d7521d72be140dbc4d9111dae211eb14b` (2026-08-30; formal KG release v1.7.0
  pinned — see CHANGELOG; npm `@shiftleftpt/sbd-toe-mcp@0.10.4` = `latest`, gitHead same commit;
  GitHub Release `v0.10.4`)
- v0.11.0 → `102b8166608717aea8baea2534c05a907175ae7c` (2026-08-31 14:56Z; MP1 cycle —
  tag DOES exist and npm 0.11.0 was published with that gitHead, same minute as
  0.20.0-beta.6: the G-mp1a two-line gate was fulfilled. CORRECTION 2026-09-01: earlier
  rows/notes claiming "superseded — tag never created" were written on stale knowledge
  during the 0.12.0 lote and are amended by this entry; history append-only.)*
- v0.12.0 → `b475900e87a3035d36a16201dd80d5e5b36c396d` (2026-08-31; formal lote — KG
  v1.9.0 pinned, sha256 `11153c85…`, contract v1.15; npm `@shiftleftpt/sbd-toe-mcp@0.12.0`
  = published, gitHead same commit; GitHub Release `v0.12.0`)
- v0.15.1 *(reverificação Desktop fechada — tool_prefix placeholder, orgScope erro
  accionável, assess completo, maxItems 5 medido; bundle pin unchanged KG v1.9.0;
  annotated tag on the squash after merge; npm `latest`)*
- v0.15.0 → `7c4d6a7918df988865f801373c07d4bd1a614367` (2026-09-02; Desktop-audit cycle;
  npm `@shiftleftpt/sbd-toe-mcp@0.15.0` = published, gitHead same commit; GitHub Release)
