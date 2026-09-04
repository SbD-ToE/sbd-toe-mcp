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
- v0.19.1 *(ronda 4 — empty_selection_warning + precedência explicit>lexical no R2
  (replay-guard re-validada); bundle pin unchanged KG v1.11.0; annotated tag on the
  squash after merge; npm `latest`)*
- v0.19.0 → `ab4340d80367d9c8c61a04af52a6bd397b87e6c1` (2026-09-04; ronda 3 — basis +
  aviso de dominância; npm `@shiftleftpt/sbd-toe-mcp@0.19.0` = published, gitHead same
  commit; GitHub Release `v0.19.0`)
- v0.18.1 → `dc5500afe73eecd9724daf52676a5affd575a885` (2026-09-03; lote formal — pin
  release KG v1.11.0; npm `@shiftleftpt/sbd-toe-mcp@0.18.1` = published, gitHead same
  commit; GitHub Release `v0.18.1`)
- v0.18.0 → `b1dbc7e6d15fc760f4c0056b862f1b1dddb97f53` (2026-09-03; estação 3 — trace
  de fontes; npm `@shiftleftpt/sbd-toe-mcp@0.18.0` = published, gitHead same commit;
  GitHub Release `v0.18.0`)
- v0.17.0 → `61183f06454b07f4c40a12bb2df426d68e3d3be3` (2026-09-02; ronda 2 — never-silent
  no resolve + requisito→prova; npm `@shiftleftpt/sbd-toe-mcp@0.17.0` = published,
  gitHead same commit; GitHub Release `v0.17.0`)
- v0.16.1 → `04430cbd28e8a8ca046f1e05c4fc9eb460cd868a` (2026-09-02; lote formal — pin
  release KG v1.10.0; npm `@shiftleftpt/sbd-toe-mcp@0.16.1` = published, gitHead same
  commit; GitHub Release `v0.16.1`)
- v0.16.0 → `3e32af19e62d9009214a09639115310ac3076305` (2026-09-02; dívida de dados
  exposta — pin dev-build v1.16; npm `@shiftleftpt/sbd-toe-mcp@0.16.0` = published,
  gitHead same commit; GitHub Release `v0.16.0`)
- v0.15.1 → `a3536fdee12612dd307994d4cdf62a7a9d33a2c1` (2026-09-02; reverificação Desktop
  fechada; npm `@shiftleftpt/sbd-toe-mcp@0.15.1` = published, gitHead same commit;
  GitHub Release `v0.15.1`)
- v0.15.0 → `7c4d6a7918df988865f801373c07d4bd1a614367` (2026-09-02; Desktop-audit cycle —
  universal pagination, excluded_by_level band, derived index-compact; npm
  `@shiftleftpt/sbd-toe-mcp@0.15.0` = published, gitHead same commit; GitHub Release
  `v0.15.0`)
- v0.14.0 *(graduated applicability — Author decision 2026-09-01: «capítulo nunca se
  exclui por nível»; binary lists retired, demand derived from authored assignment
  proportionality; bundle pin unchanged KG v1.9.0; annotated tag on the squash commit
  after merge; npm `latest` via release.yml)*
- v0.13.0 → `8a3a9a90fac66ddcfa2395296d0c763eaa6bc105` (2026-09-01; serving batch —
  read_sbd_toe_resource + provenance.kg stamp + inspect pin provenance; bundle pin
  unchanged KG v1.9.0; npm `@shiftleftpt/sbd-toe-mcp@0.13.0` = `latest`, gitHead same
  commit; GitHub Release `v0.13.0`)*

## Current working state

**Current branch:** master
**Most recent published state:** icsme-2026-tool-demonstration / v0.9.0 (2026-05-21)
**Most recent release:** v0.10.4 (2026-08-30) — served bundle: formal KG release
`v1.7.0` (commit `894af32a85d6a50f648f10d8a643848e806e533e` = `mcp-stable`; asset sha256
`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`; consumer contract
v1.14), ontology `sbdtoe-ontology-v2.2` (`2be86e8b`), Manual v1.7.1
(`8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`). Tag `v0.10.4` = squash commit of the PR
introducing this row (recorded here once created). Prior: v0.10.3 (2026-08-30,
`06f8bbaa`, KG v1.6.1), v0.10.2 (2026-08-29, `31aa22af`, KG v1.6.0).
**Expected next freeze event:** annotated tag `v0.12.0` on the squash commit of the
formal-lote PR (npm `latest` via release.yml). The `v0.11.0` gate is dissolved —
superseded by 0.12.0. Next beta absorbs the MP1 cycle + v1.8.0 wave in its own session.

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

## Change log for this registry

| Date | Change | Author |
|---|---|---|
| 2026-06-25 | Initial skeleton created (file was absent). Populated from git tags + CITATION.cff; uncertain mappings marked TODO. | Claude (AI agent), under Pedro Farinha |
| 2026-08-29 | v0.10.2 registered (protected tag list, current working state, upstream pins with exact tags/hashes: KG v1.6.0, Manual v1.7.0, ontology v1.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-29 | v0.10.2 tag commit recorded (`31aa22af`, squash of #47); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 registered (protected tag list, current working state, upstream pins: KG v1.6.1, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.3 tag commit recorded (`06f8bbaa`, squash of #51); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-30 | v0.10.4 registered (protected tag list, current working state, upstream pins: KG v1.7.0, ontology v2.2, Manual v1.7.1). No published/frozen-state rows changed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.10.4 tag commit recorded (`2937236d`, squash of #54); npm publish + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | v0.11.0 registered as pending (protected-tag list; tag gated on 0.20.0-beta.6 + two-line verification). Served bundle pins unchanged (KG v1.7.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Dev-build `kg-v1-manual-v1.8.0-aligned-2026-08-31` pinned on the serving line (sha256 `ad0fc96c…`, contract v1.15, 273 req/29 cat — FIL/PRI). No frozen state touched; formal KG v1.9.0 em lote. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-08-31 | Re-pin `source: release` KG v1.9.0 (sha256 `11153c85…` verified; zero-delta over the dev-build; mcp-stable = `93fe9fb1`). v0.12.0 registered (protected-tag list); v0.11.0 marked superseded (tag never created). Ceilings ratified+harmonized 9.200/8.450 ("3 sims"). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.12.0 tag commit recorded (`b475900e`, squash of #62); npm publish (`latest`) + GitHub Release confirmed. v0.13.0 registered (protected-tag list; serving batch, bundle pin unchanged). `release_ref` owner normalized SbD-ToE (cosmetic). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | CORRECTION (lead-approved): v0.11.0 WAS tagged (`102b8166`) and published to npm on 2026-08-31 14:56Z alongside 0.20.0-beta.6 — the G-mp1a gate was fulfilled; the "superseded/never tagged" notes from the 0.12.0 lote were stale. Protected-tag entry amended. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.13.0 tag commit recorded (`8a3a9a90`, squash of #63); npm publish (`latest`) + GitHub Release confirmed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.14.0 registered (protected-tag list): graduated applicability cycle — binary chapter exclusion retired from the serving per the Author's verbatim decision; derivation from bundle assignments + chapter-01 matrix anchor. Pins unchanged (KG v1.9.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-01 | v0.14.0 tag commit recorded (`1f199ccb`); npm latest + Release confirmed. v0.15.0 registered (Desktop-audit cycle; static index-compact retired from the package lists). Pins unchanged (KG v1.9.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |

| 2026-09-02 | v0.15.0 tag commit recorded (`7c4d6a79`, squash of #66); npm latest + Release confirmed. v0.15.1 registered (reverificação Desktop; pins unchanged KG v1.9.0). REPAIR NOTE: the 0.15.1 release commit briefly truncated this file by a bad splice — restored from master and re-applied cleanly in the same PR (declared). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.15.1 tag commit recorded (`a3536fde`, squash of #67); npm latest + Release confirmed. v0.16.0 registered — re-pin dev-build 2026-09-02 (`c832fd97…`, v1.16, digest-verified) with the data-debt joins exposed. | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.16.0 tag commit recorded (`3e32af19`, squash of #68); npm latest + Release confirmed (boleia declarada). v0.16.1 registered — lote formal: re-pin release KG v1.10.0 (`d8df472b…`, digest-verified, byte-igual ao dev-build). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-02 | v0.16.1 tag commit recorded (`04430cbd`, squash of #69); npm latest + Release confirmed (boleia declarada). v0.17.0 registered — never-silent no resolve + requisito→prova na matriz. Pins unchanged (KG v1.10.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.17.0 tag commit recorded (`61183f06`, squash of #70); npm latest + Release confirmed (boleia declarada). v0.18.0 registered — estação 3: pin dev-build kg-2026-09-03 (`e5c3581b…`, v1.17, digest-verified) + trace de fontes (directas vs compensadas). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-03 | v0.18.0 tag commit recorded (`b1dbc7e6`, squash of #71); npm latest + Release confirmed (boleia declarada). v0.18.1 registered — lote formal: re-pin release KG v1.11.0 (`b7444094…`, digest-verified, byte-igual). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.18.1 tag commit recorded (`dc5500af`, squash of #72); npm latest + Release confirmed (boleia declarada). v0.19.0 registered — ronda 3 (basis+aviso; near-touch resolvido por dieta; 2º incidente de gate travado em draft → sentinela adoptada). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |
| 2026-09-04 | v0.19.0 tag commit recorded (`ab4340d8`, squash of #73); npm latest + Release confirmed (boleia declarada). v0.19.1 registered — ronda 4 (zero=alarme; explicit>lexical; a sentinela de gate travou uma 1ª versão errada da precedência antes de docs/PR — mecanismo validado). Pins unchanged (KG v1.11.0). | Claude Fable 5 (Pontifex), authorised by Pedro Farinha |