---
ai_assisted: true
model: Claude Fable 5
date: 2026-08-30
purpose: documentation
reasoning: v0.11.0 — MP1 selection operation (select_sbd_toe_requirements + engine; D1 gate, D3 activators, D4; consult mode index; v2 token diet ported from the beta with stable-measured ceilings); Axis H 1/3/6 → 6/4/0; v0.10.4 — formal KG release v1.7.0 pinned (D2 close: 282 curated links, threats with associated_control_ids §1.21, contract v1.14) + G-b defining-chapters threat-routing fix (auth 77→95); v0.10.3 — formal KG release v1.6.1 pinned (curated requirement→control layer v2, Manual v1.7.1, contract v1.12) + #49 (acceptance regression runner with revised Axis-E criterion, query_entities filter fix, Algolia-era cache paths removed); v0.10.2 — formal KG release v1.6.0 pinned (source: release, sha256-verified; Manual v1.7.0; contract v1.11) after two same-day dev-build pins (v1.6.7 REQ-AGN, v1.7.0); requirement-id grammar v1.10 §1.18; declared gaps vs informative citations; toolchain hygiene (vitest 4). v0.10.1 and earlier entries below (v0.10.1 entry authored with Claude Opus 4.8).
review_status: pending-human-review
---

# Changelog

## 0.11.0 — 2026-08-31 (prepared — tag v0.11.0 only after the beta line absorbs, per G-mp1a)

**Minor** — the MP1 selection operation lands in the serving layer (new tool), closing the
four Axis-H defects (ciclo MP1, P2; gate G-mp1a). Served bundle unchanged: formal KG
`v1.7.0` (sha256 `29156b86…fb9a`, contract v1.14, Manual v1.7.1).

### Axis H — before / after (oracle v1 untouched)

| | 0.10.4 (baseline) | **0.11.0** |
|---|---|---|
| Verdicts | 1 PASS · 3 PART · 6 FAIL | **6 PASS · 4 PART · 0 FAIL** |
| prepare coverage (avg) | 41 % | **≈96 %** (9 of 10 cases ≥ 95 %; GC-07 72 %, GC-10 80 %) |
| Negative case (GC-09) | PASS | PASS (`needs_clarification`, 0 requirements) |

Remaining PART causes (measured, not forced — `docs/acceptance-runs/2026-08-31-axis-h-selection-v0.11.0.md`):
GC-02 SES ×8 selected via the loader's `auth → [AUT, ACC, SES]` concern map (data-level
coupling, next cycle); GC-03 DST-006 / GC-10 CFG-006 + LOG-001 / GC-06→0 (closed);
GC-07 agent-principal hygiene (AUT-006/ACC-002/ENC-006) and DEP-013/014 lack a declared
signal — candidates for a lead-ratified rule, not guessed here.

### Added — `select_sbd_toe_requirements` (MP1, consultive L3, OSS)

- Single selection engine `src/serving/selection.ts`: eligibility from the PUBLISHED
  `requirement_selection_model` (baseline cap. 02 `type: base` by level ∪ domain chapters
  activated by context — changed_files via the review-scope path map, technologies/stack,
  concern-derived chapters ⊕ overlay `extend`; `replace` awaits ADR 0014), then
  deterministic narrowing into two DECLARED bands: `selected[]` (per-item
  `selection_trace`: source/trigger/score) and `narrowed_out[]` (grouped by category,
  with reason) — never silent. Paginated (G1). `prepare_sbd_toe_codegen_context` now
  consumes the engine (its `completeness_report.selection` declares
  eligible/selected/narrowed-out with an executable ref).
- Acceptance scenarios in the same change (factory rule): TC-F-11/12.

### Changed — scope gate (D1) + activators (D3) + lexicon role (D4)

- The "max 50 activated requirements" cap is GONE (a legitimate L2 task activates >50 by
  design). The gate now guards task scope — vague/multi-family asks still return
  `needs_clarification`/`needs_decomposition`, and a task with NO real signal (only the
  informational risk_level) is `needs_clarification` — and payload (diet + budgets).
- `exposure` and `data_sensitivity` stop being decorative: declared activators
  (internal/authenticated → auth+logging; public → +api/validation/architecture;
  personal/regulated → encryption+validation+logging; secrets → secrets), each with its
  own `activation_trace` source. `agents` heuristics (mandate/kill-switch/tool-call/
  autonomy) reach the stable line (beta parity); new audited PT/EN signals (mtls,
  mensageria/fila de mensagens, assinatura → integrity+encryption, imagem/image,
  spa/frontend, formulário de registo; terraform/ansible narrowed to iac).
- The concern lexicon is now ONE signal among seven — the reference-semantics composition
  is the engine (D4).

### Changed — `consult_security_requirements`

- `mode: "index"` opt-in (G-mp1a decision 3, option c): per-category requirement index
  (ids + counts) with the same filters/totals; default mode byte-unchanged.
  Index-by-default stays flagged for a future major.

### Added — v2 token diet ported from the 0.20 beta line (byte-identical)

- `detail: full | standard | minimal | ultrathin` + `include_relations` on `prepare`,
  the `sbd://toe/codegen-instructions/{mode}` resource, golden snapshots, and the diet
  test suite (detail/minimal/ultrathin/caps-resource/reuse-hint/budget; the
  relations-ref suite stays beta-only — `relations_ref` names `trace_sbd_toe_graph`,
  which ships on the 0.20 line; on this line use `include_relations: true`, as the tool
  schema documents).
- **Stable payload ceilings fixed by measurement (P2)** — the MP1 selection summary adds
  ≈+50 tokens to `completeness_report`: totals `standard` fixture2 8.800 → **8.900**
  (measured 8.833), `minimal` 5.800 → **5.950** (5.850) and 8.100 → **8.200** (8.107);
  `rest` section budgets re-measured (980/985/1055). All other totals hold, including
  `standard` fixture1 ≤ 6.500. The beta re-ratifies its own ceilings when it absorbs P2.

### Verification

- `npm run check` green; **684/684** tests (engine + select suites added; diet suite
  ported); full `eval:acceptance`: 116 scenarios, 93 executed, **71 PASS · 22 PART ·
  0 FAIL · 23 SKIP — gate E PASS** (no regression); 22/22 tools exercised.

## 0.10.4 — 2026-08-30

**Patch** — formal KG release `v1.7.0` (D2 cycle close) + the G-b routing decision in the
serving layer. Additive on the tool surface (per-threat `associated_control_ids`,
`associated_controls_text`, `associated_control_ids_derivation`); no tool removed or reshaped.

Served bundle: **formal KG release `v1.7.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.7.0`, commit `894af32a85d6a50f648f10d8a643848e806e533e`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.7.0.zip`, sha256
**`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`**, fetched and
digest-verified against the release `.sha256`; `run_manifest.release = {stable, v1.7.0}`),
`consumer_contract_version` **v1.14** (§1.21), ontology `sbdtoe-ontology-v2.2`, **Manual
v1.7.1** @ `8e03454c`. Supersedes `v1.6.1` (0.10.3) and the dev-build v2.2 pin (#53).

### Changed — served knowledge (`v1.6.1` / dev-build v2.2 → `v1.7.0`)

- Curated requirement→control layer: 281 → **282 links** (GOV-013 gains its curated CAP
  secondary — Archon convergence 27/27; curated on surface 12 + 4). Requirements 256/27,
  EvidencePatterns 256/256, 20 controls unchanged.
- **Threats now carry structural control ids** (contract v1.14 §1.21, G-b decision 8):
  `associated_control_ids` (CTRL-* ids, chapter-grained derivation **declared per record**
  via `associated_control_ids_derivation`; 233/233 in this release) and
  `associated_controls_text` (the Manual's prose); `associated_controls` unchanged for
  compatibility. Served through `get_threat_landscape` — previously the surface carried
  only the prose field.

### Changed — threat routing (G-b decision 2, serving-layer fix)

- The **defining chapters** of the activated controls (`defining_chapter_ids`, published
  since contract v1.13) now count as in-scope in `get_threat_landscape`, and the ch.02
  suppression applies only to controls merely *catalogued* there: a control that DEFINES
  in ch.02 (C1 identity/auth, C2 data_protection, C3 dev tooling) brings the ch.02
  threats with it, with the control listed in `mitigated_by`. Post-fix scopes at L2:
  **auth 77 → 95** (+18 ch.02 catalogue threats), encryption 107, validation 72;
  logging (15) and iac unchanged — no ch.02-defining control. No-concern landscape
  unchanged (233).
- Acceptance criterion for TC-E-01/02 updated accordingly (both PASS: `mitigated_by` and
  `associated_control_ids` populated with resolving ids); TC-F-08 re-baselined to 282
  links / curated 12+4. Run record: `docs/acceptance-runs/2026-08-30-v0.10.4-acceptance.md`
  — 104 scenarios, 81 executed, **63 PASS · 18 PART · 0 FAIL · 23 SKIP, gate E PASS**.

## 0.10.3 — 2026-08-30

**Patch** — formal KG release `v1.6.1` (curated requirement→control layer v2) + the #49
serving/test changes. Additive on the tool surface (`filters` on `query_sbd_toe_entities`);
no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.1`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.1`, commit `e9fc54f312829c632ecd50e2306bfa356e9e457c`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.1.zip`, sha256
**`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.1}`), `consumer_contract_version`
**v1.12** (§1.19 curated layer v2), **Manual v1.7.1** @ `8e03454c` (mini-site aligned to
0.10.2; illustrative `REQ-NNN` → `EX-REQ-NNN`), ontology `ontology-v1.1-fair-baseline`.
Supersedes `v1.6.0` (0.10.2).

### Changed — served knowledge (`v1.6.0` → `v1.6.1`)

- **Curated requirement→control layer v2** (Archon opinion ratified 2026-08-30, applied by
  curated edit, no rebuild): `requirement_control_links` 263 → **265**, **0 requirements
  without a link**; 12 links removed / 14 added, each new link carrying an additive
  `curation {curator: archon-2026-08-29, rationale}` key (tolerated by the loader — served
  fields unchanged). Re-targets served: AUT-007/AUT-008 → identity control, AUT-010 →
  monitoring, CNT-003/005/006/009 → images, ENC-007 → secrets, GOV-009 → suppliers,
  REQ-001 → classification; INT-008 → suppliers (+ segmentation); ARC-013 + segmentation,
  ARC-001 + architecture. 10 EvidencePatterns follow (`maps_to_control_id`); overlay
  mappings 6382 → 6457; cross-layer referrals 7240 → 7315. Requirements 256/27 and
  EvidencePatterns 256/256 unchanged.
- Manual v1.7.1: content-only wave — the 25 illustrative `REQ-NNN` example ids became
  `EX-REQ-NNN` (never resolve, no citation note), and the mini-site `020-assets/mcp/`
  describes 0.10.2 as published (content-lag lifted).

### Acceptance regression (`npm run eval:acceptance`, this bundle)

- See `docs/acceptance-runs/2026-08-30-v0.10.3-acceptance.md`. Axis E criterion revised by
  the programme lead: the structural mitigation link is `mitigated_by` (must be populated,
  ids must resolve); the substrate's textual `associated_controls` is passed through and
  reported as PART, never as a serving FAIL. New TC-F-08 checks the curated layer v2 (265
  links, 0 gaps, the AUT re-targets, `curation` tolerated).

### Record corrections (Manual v1.7.1 handover, verified live on 0.10.2)

- AI Act overlay: **661** mappings (earlier handoffs said 651); the server exposes **3**
  prompts (`setup_sbd_toe_agent`, `ask_sbd_toe_manual`, `prepare_grounded_codegen`), not 2;
  the npm `beta` dist-tag is **0.20.0-beta.3** (not beta.2).

### Added — acceptance regression runner (merged in #49)

- **`npm run eval:acceptance`** (`scripts/run-acceptance-scenarios.mjs` + `scripts/acceptance/`):
  executes the **94 acceptance scenarios** of
  `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` (axes A–E) against the real
  stdio server on the pinned bundle, one verdict per scenario (PASS / PART / FAIL / SKIP with
  owner `mcp`·`graph`·`roadmap`), Axis E as the promotion gate (exit 1 on FAIL), and a
  **coverage** section (scenarios executed, tools exercised vs exposed, ACs covered, roles ×
  phases). **Axis F** (7 scenarios) covers the six 0.10.0 tools that post-date the June
  elicitation plus the G1 pagination gate. Run records live in `docs/acceptance-runs/`.
- First run on `0.10.2` / KG `v1.6.0`: 101 scenarios, 78 executed (23 SKIP: 21 commercial
  ACs + 2 needing a client LLM), **58 PASS · 18 PART · 2 FAIL**; **21/21 tools exercised**.
  The two FAILs (TC-E-01/02) are data-rooted: `associated_controls` on threats is empty for
  ch.12 and textual elsewhere in the bundle (routed to Codex); `mitigated_by` is populated
  structurally on every threat.

### Fixed — `query_sbd_toe_entities` filters (found by TC-A-13)

- `entityType` and `riskLevel` filters returned **0 for every query**: they matched the
  Algolia-era record fields `entity_type` / `risk_levels`, which no chunk of the current
  substrate carries. They now match what the substrate publishes — entity types via the
  chunk's entity mentions (`Requirement | UserStory | Metric | Threat`, aliases accepted) and
  the risk facet `filter_tags.risk_level` — over the full ranked retrieval, and the response
  declares `filters {applied, retrieval_pool, matched, pool_with_risk_facet, note}` (chunks
  without a risk facet are not returned — declared, never silent). `chapterId` accepts the
  bundle id or its numeric prefix. Tool schema documents the vocabulary.

### Removed — Algolia-era snapshot-cache paths (dead at runtime)

- `structured-tools.ts` (`list_chapters`, `query_entities`, `chapter_brief`,
  `map_applicability`) and `plan-repo-governance.ts` carried a `SnapshotCache` branch that
  the server never reached (runtime calls pass no cache). Removed, together with the ~25
  unit tests that only exercised those branches with `chapter_bundle` /
  `practice_assignment` / `risk_levels` fixtures; replaced by tests over the runtime bundle.
  Suite: 532 tests.

## 0.10.2 — 2026-08-29

**Patch** — served-bundle alignment + declared-gap serving. Additive on the tool
surface (new response fields, one new `concerns` value); no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`, commit `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.0.zip`, sha256
**`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.0}`), `consumer_contract_version`
**v1.11** (§1.19), **Manual v1.7.0** @ `d5c2586a` (remote `SbD-ToE/sbd-toe-manual`), ontology
`ontology-v1.1-fair-baseline` (unchanged). `source: release` — supersedes the formal `v1.5.0`
pin of 0.10.0/0.10.1. Lineage on this line (same day, both dev-builds, merged in #45 / #46):
`kg-v1-manual-v1.6.7-aligned-2026-08-29` (`762ccaaf`, sha256 `a66c3245…5276`, contract v1.10)
→ `kg-v1-manual-v1.7.0-aligned-2026-08-29` (`737efe20`, sha256 `2c27f4eb…64fa`, contract v1.11);
`v1.6.0` is byte-identical to the latter in `data/publish` — the only difference in the
consumed files is the `release` block of `run_manifest.json`.

### Changed — served knowledge (dev-build 2026-08-29 v1.6.7 → v1.7.0, contract v1.11)

- **Manual v1.7.0**: **OPS-015** «Sinais contínuos de saúde e disponibilidade operacional»
  (L2/L3, chapter 12) → `requirements.json` 255 → **256** (27 categories); EvidencePatterns
  256 (coverage 256/256). Per level: L1 120, L2 231, L3 256.
- **Curated requirement→control layer** (`requirement_control_links` 242 → **263**,
  `--preserve-existing`): the 20 requirements previously without a control link (AGN ×4,
  ARC-014/015, DEP-011…014, DPL-010/011, OPS-011…014, GOV-013/014, THR-008, VAL-008) and
  OPS-015 are now linked — REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-*`
  via the curated `domain_mapping.AGN: [governance, identity]` (programme-lead judgement,
  not Manual-derived). `coverage_gaps.requirements_without_control_link` is therefore **0**
  at every level — the declaration machinery stays (data-driven).
- **Legacy citations corrected upstream**: 0 unresolvable `REQ-[A-Z]{3}-NNN` mentions and
  0 `EX-` entries in `chunk_entity_mentions` → **0 declared legacy-citation gaps**. The 25
  illustrative `REQ-NNN` example mentions (20 ids, 8 example docs) and non-requirement
  tokens captured by the `<CAT>-NNN` shape (`CWE-`, `SHA-256`, …) are **informative, not
  gaps**: `query_sbd_toe_entities` / `resolve_entities` surface them as `citation_note` /
  `meta.citation_note` (`status: "informative"`) while keeping their normal path — never
  aliased, never silent.
- `00-fundamentos/macro-processos.md` (new, 82 chunks, role `addon`) is served in the
  **`guide`** and `consult` profiles (MP1–MP5 are not entities, by declaration).

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29 v1.6.7; superseded above)

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29)

- **REQ-AGN-001…004 served** — the AI-agent / automation governance catalogue (versioned
  mandate, autonomy A0–A4, kill-switch, intent declaration; Manual
  `02-requisitos-seguranca/addon/09-governaca-automatismos.md`). `requirements.json`
  251 → **255**, categories 26 → **27** (`AGN`, chapter 02); EvidencePatterns 251 → **255**
  (coverage 255/255). Per level: L1 118 → 120, L2 226 → 230, L3 251 → 255. Closes the
  Pontifex side of `agentic/briefs/2026-08-02-orchestrator-to-pontifex-req-agn-surface-gap.md`.
- Collateral of the dev-build line (contract v1.9, 2026-06-18): the regulatory overlay now
  indexes **AI Act** and **ENISA-CSA** (`external_frameworks` 4 → 6; overlay mappings 6360;
  cross-layer referrals 7218). The 0.10.0 note "AI Act cross-check is not indexed" no
  longer holds.
- Legacy `REQ-<CAT>-NNN` citations of base requirements no longer resolve by substring
  accident to requirements with another meaning (contract §1.18) — declared instead, below.

### Added — requirement-id grammar (consumer contract v1.10 §1.18)

- `src/serving/requirement-id.ts` — the single serving-side source of the grammar
  `^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$` (**fullmatch**; never search, never prefix
  normalisation). `category` = the segment before the number (`AGN`, never `REQ`).
  Audit: no site in this server assumed the old `^[A-Z]{3}-\d{3}$`; the loader now flags on
  stderr (never drops, never rewrites) any published id outside the grammar. Mandatory
  cases under test: `REQ-AGN-001` ✓, `AUT-003` ✓, `EX-AUT-003` ✗ (the Manual's illustrative
  `EX-` prefix — never resolves to `AUT-003`), `REQ-AUTH-001` ✗.
- `consult_security_requirements`: new `concerns` value **`agents`** → category `AGN`
  (consult only; `get_threat_landscape` has no domain chapter for it).

### Added — declared gaps (never silent; Codex handover 2026-08-29)

- **(a) Requirements without a control link.** `consult_security_requirements` returns
  `coverage_gaps.requirements_without_control_link` `{count, requirement_ids, note}` and a
  `REQUIREMENT_WITHOUT_CONTROL_LINK` rule-trace line. The 20 requirements with no
  `requirement_control_links` entry (AGN ×4, ARC-014/015, DEP-011…014, DPL-010/011,
  OPS-011…014, GOV-013/014, THR-008, VAL-008) are served with the absence declared — not
  omitted, no controls invented (link layer of 2026-04-07; refresh is a Codex decision).
- **(b) Legacy citations.** `query_sbd_toe_entities(query=<id>)` and
  `resolve_entities(requirement, {requirement_id})` answer a cited-but-unpublished
  requirement id with a **declared gap** (`match: "declared_gap"` / `meta.declared_gap`,
  with the citing chunk/document ids). The 20 legacy `REQ-<CAT>-NNN` citations (16 ids,
  6 Manual files) carry the serving phrase «citação legada não resolvível (finding
  editorial em curso)» — never «requisito inexistente», never a silent semantic fallback.
  The 21st (`REQ-AC-010`) is not present in this bundle's `chunk_entity_mentions`, so
  there is nothing to declare for it until the KG surfaces it.
- `assets/agent-guide.md`: requirement identifier convention (both forms, category rule,
  `EX-` illustrative prefix, legacy-citation rule), the `agents` concern, and
  interpretation rows for `coverage_gaps` / `declared_gap` / `citation_note`.

### Changed — toolchain hygiene (devDependencies only, no package impact)

- Dependabot alerts on the test toolchain: `vitest` 1.6.1 → **4.1.9**, `@vitest/coverage-v8`
  and `@vitest/ui` 1.6.1 → **4.1.9** (Dependabot #39/#41/#42), pulling `vite` 8.2.2 and
  `postcss` 8.5.26 through the tree; `esbuild` and `brace-expansion` (the other two alerts) are no
  longer in the dependency tree at all (vite 8 builds on rolldown; `test-exclude`/`minimatch` dropped).
  `npm audit`: 0 vulnerabilities. `npm test` / `npm run check` green; `npm pack --dry-run`
  file list identical before/after — toolchain hygiene, no impact on the published package.

### Governance

- No interim AGN gap declaration had been implemented in the served code (brief 02-08
  item 1); nothing to lift — the closure is the published data itself.
- Not a freeze event; `FREEZE-REGISTRY.md` unchanged. Pending upstream before a formal
  release: KG formal release (re-pin `source: release`) + `mcp-stable` move (Codex /
  programme lead); Manual correction of the legacy citations, then Codex recompile.

## 0.10.1 — 2026-06-25

**Patch** — packaging, distribution, and repository-metadata changes only. No
functional, API, or served-bundle changes; the MCP tool surface is identical to
0.10.0.

### Fixed

- **Broken npm tarball on clean install (`ERR_MODULE_NOT_FOUND`).** The `files`
  allowlist in `package.json` enumerated `dist/` outputs file-by-file and omitted
  `dist/version-info.js` (plus its `.d.ts` / `.js.map`), which `dist/index.js`
  imports. As a result `0.9.0` and `0.10.0` failed to start from a clean
  `npx -y @shiftleftpt/sbd-toe-mcp` pull (the file was only present in cached
  builds). Added the three `dist/version-info.*` entries to `files`; verified via
  `npm pack` that the tarball now contains them. `0.7.7` was unaffected and
  remained the last known-good published version.

### Changed

- Repository relocated to `github.com/SbD-ToE/sbd-toe-mcp` (was
  `Shiftleftpt/sbd-toe-mcp-poc`). Updated `repository`/`homepage`/`bugs` in
  `package.json`, the GitHub Releases link in `README.md`, and
  `repository-code`/`url` in `CITATION.cff`. The npm package name
  (`@shiftleftpt/sbd-toe-mcp`) is unchanged.

### Added

- **Distribution wrappers (zero-config install).** A Claude Code plugin
  (`sbd-toe-plugin/` + `.claude-plugin/marketplace.json`) and an OpenAI Codex CLI
  config example (`examples/codex-config.toml`). These wrap the standard,
  unchanged `@shiftleftpt/sbd-toe-mcp` server — no new server code, no change to
  the served bundle or tool surface.
- **`FREEZE-REGISTRY.md`** at the repo root, satisfying
  `PROGRAMME-PRESERVATION-PROTOCOL.md` §5 (the file was previously absent).
  AI-prepared skeleton, pending human verification; unverified tag→event mappings
  are marked `TODO — verify`, and no hashes/DOIs/tags were invented.

> Note: published `0.10.0` is immutable per `PROGRAMME-PRESERVATION-PROTOCOL.md`
> (Principle 1 / Rule 3); this is a fix-forward patch, not a republish of 0.10.0.

## 0.10.0 — 2026-06-17

**Minor** bump: 7 new tools + a changed `generate_sbd_toe_skill` schema + a `next`
advisory band retrofitted onto the legacy tools. Additive / backward-compatible on the
existing tools' core contract ⇒ minor.

Served bundle: **formal KG release `v1.5.0`** (GitHub Release
`Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`, sha256 `feaa0155…7294`,
`consumer_contract_version` v1.8, **Manual v1.6.4** @ `09b20f6f`, ontology
`ontology-v1.1-fair-baseline`).

### Added — Implementation view ("how do I run this" family)

- **`get_sbd_toe_chapter_implementation_checklist`** — retrieval-grounded canon/20
  "how to implement chapter NN" guidance; coverage-preserving, cites chunk ids.
- **`get_sbd_toe_operating_model`** — RACI / decision-rights / governance cadences /
  org-model from the rollout playbook; retrieval-grounded prose.
- **`plan_sbd_toe_rollout`** — phased rollout roadmap: the 8 canonical lifecycle phases
  mapped to manual chapters. Phase-ordered MVP; the dependency DAG is declared-deferred.
- **`assess_sbd_toe_implementation`** — stateless KPI self-report vs published per-level
  thresholds (`metrics.json`) → posture + gaps. An applicable KPI with no value is
  `not_reported`, never a pass; thresholds cited, never invented.

Together with `get_guide_by_role` these are the implementation view: what to do (role/DoD)
· how to implement (checklist) · who governs (operating model) · in what order (rollout)
· how compliant am I (assess).

### Added — Verification reference

- **`get_sbd_toe_verification_matrix`** — the EXPECTED side of verification: per
  requirement/control at a risk level, the validation method + expected evidence +
  EvidencePattern reference, cited per row. EvidencePatterns are first-class published
  entities — full coverage (L1 118, L2 226, L3 251 requirements covered; 0 gaps,
  0 unhinted). Coverage-preserving.

### Added — Regulatory lens

- **`map_sbd_toe_regulatory_activation`** — reverse-of-provenance lens: framework
  (DORA / NIS2 / CRA / RGPD) → which manual chapters it activates, grouped with mapping +
  obligation counts (coverage-preserving). DORA: 14 chapters, 1430 mappings.

### Added — Manual answering

- **`answer_sbd_toe_manual`** — retrieves grounded manual context and requests the final
  answer from the client's model via MCP sampling; falls back to formatted retrieval when
  the client lacks sampling support.

### Changed — Role-skill / sub-agent serving (RF-S)

- **`generate_sbd_toe_skill` schema extended**: `role`, `format` (`skill` | `subagent`),
  `flavour` (`harnessed` | `skilled`), `risk_level`, `phase`, `include_detail`.
  - **harnessed** sub-agent grants `mcp__sbd-toe__*` (queries live; embedded slice = index).
  - **skilled** sub-agent carries no MCP tools, embeds the frozen slice (DoD inline).
  - Coverage is declared (chapters / assignments / user stories / checklist items).
- New resources `sbd://toe/skill/{role}` and `sbd://toe/subagent/{role}`.

### Changed — Protocol envelope (`next` advisory band, RF-H)

- Tool responses carry a two-band **`next`** advisory band — ≤3 adjacent tools the caller
  likely needs next, each `kind: "semantic" | "structural"`, referencing only real
  tools/resources. Emitted by all new tools and retrofitted onto the legacy tools
  (`consult_security_requirements`, `get_threat_landscape`, `list_sbd_toe_chapters`,
  `map_sbd_toe_applicability`, `get_sbd_toe_chapter_brief`, `resolve_entities`,
  `plan_sbd_toe_repo_governance`, `map_sbd_toe_review_scope`, `generate_sbd_toe_skill`).
  Advisory only — never changes a tool's primary result shape.

### Fixed

- **`get_threat_landscape` base-concern routing** — base concerns
  (`auth` / `access` / `encryption` / `validation` / `session`) previously collapsed onto
  chapter 02 (their requirements' catalog home), surfacing the requirements-process
  meta-threats (`MT-021…038`) instead of the domain threats. Now routed by the concern's
  domain (`CONCERN_TO_DOMAIN_CHAPTER` + the resolved controls' chapters); chapter 02 is
  surfaced only for the explicit `requirements` concern. (`auth` → 144 domain threats,
  no `MT-021…038`.)
- `get_guide_by_role` now sharpens user stories by risk level via the assignment's
  proportionality (L1 ⊂ L3), and surfaces the level-specific obligation.
- `plan_sbd_toe_repo_governance` filters requirement-first (`applicable_levels`) instead
  of a hardcoded chapter table; control/artifact = floor.
- `map_sbd_toe_review_scope` path table extended beyond GitHub (containers/k8s/helm → 09,
  Terraform/Bicep → 08, Python deps → 05, CI → 07/10/11, `.env` → 06); unmapped paths
  fall to the foundation guardrail via an explicit pattern.
- `get_threat_landscape` passes through the substrate's `associated_controls`
  (previously hard-coded `[]`).
- `inspect_sbd_toe_retrieval` / response shaping: consumer-aware bounding, honours `topK`
  (≈17 MB → ≈50 KB at `topK=5`); no silent truncation.
- `list_sbd_toe_chapters` returns per-level `applicability {L1,L2,L3}` + `minLevel`.

### Provenance

- `sbd://toe/version` now exposes the served knowledge provenance: server version,
  **Manual `tag`/`version` (real — v1.6.4, read from `run_manifest.manual`, not the KG
  compiler version)**, KG `release_tag` + sha256 + `consumer_contract_version`, and
  ontology tag/commit — read live from the `consumed-bundle.json` pin, never invented.
- Pin: `consumed-bundle.json` → **formal release `v1.5.0`** (`source: release`,
  `release_ref: Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`), sha256
  `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`, contract v1.8 —
  fetched + digest-verified from the GitHub Release (`sync-bundle --from-release`), not a
  local dev snapshot.

### Notes

- AI Act cross-check is **not** indexed in this bundle (RGPD / NIS2 / DORA / CRA are).

## 0.9.0 — 2026-05-21

### Added — KG / runtime surface

- Consumes the AppSec Core V1 runtime surface (`data/publish/runtime/v1/`): `slices.json`, `control_objectives.json`, `mechanisms.json`, `practices.json`, `artifacts.json`, `relations.jsonl`, `manual_rastreabilidade.jsonl`, `v1_manifest.json`.
- Consumes the regulatory overlay surface (`data/publish/overlay/`): `external_frameworks.json`, `external_obligations.json`, `overlay_playbooks.json`, `overlay_mappings.jsonl`, `framework_overlay_index.json`.
- Pinned KG state: `master` @ `5c02010358d4afa5fc0b4aae5a026d5da25aa796` (baseline tag `kg-v1-cycle-b-manual-ref-2026-05-14`).
- `checkout-backend` extended to copy declared overlay artefacts (filter via upstream `publication_manifest.json`), expose `runtime/v1` and `overlay` status in `BackendCheckout`, and run a post-copy `sanitizePrivateAbsolutePaths` pass over the published runtime/indexes/overlay text artefacts.

### Added — Deterministic loaders

- `src/tools/g2-runtime-loader.ts`: caches the AppSec Core v1 surface with consistency checks against `v1_manifest.json` (entity counts, relation counts, file sha256) and exposes `getV1EntityDisplayName(entityId)` that returns `undefined` when `manual_rastreabilidade.jsonl` did not publish a name (no name invention).
- `src/tools/regulatory-overlay-loader.ts`: caches frameworks/obligations/mappings/playbooks with `frameworksByShortCode` lookup (case-insensitive). Returns `status: "absent"` when the overlay is not published, `OverlayAssetMissingError` when partially present.
- Both loaders tolerate legitimate upstream patterns: nullable `subject_type`/`object_type` for `objective_*` relations and empty `obligation_id` for `playbook_*` mapping types.

### Added — MCP tool surface

- New tool **`prepare_sbd_toe_codegen_context`** — prepares deterministic, bite-sized grounded context for a downstream LLM to generate, review or test-plan code. **Does not generate code and does not edit files.** Returns one of four statuses: `ready_for_codegen` | `needs_clarification` | `needs_decomposition` | `unsupported_scope`. On `ready_for_codegen` the response carries `activation_trace`, `activated_scope`, `g2_context`, `manual_grounding`, `regulatory_overlay`, `citation_map`, `completeness_report`, `llm_codegen_instructions` and `security_rationale_template`.
- `resolve_entities` extended with **10 new record types**: `appsec_slice`, `control_objective`, `mechanism`, `appsec_practice`, `appsec_artifact`, `appsec_relation` (runtime v1) and `regulatory_framework`, `regulatory_obligation`, `regulatory_mapping`, `regulatory_playbook` (overlay). Per-source provenance: runtime v0 → `data/publish/runtime/*.json`; runtime v1 → `data/publish/runtime/v1/*`; overlay → `data/publish/overlay/*` (or `... (absent)` when not published — never throws for overlay).

### Added — Semantic disambiguation (WP6)

- Activation engine carries deterministic per-entry `score` in `[0,1]` and exposes the following sources in `activation_trace`: `explicit_concern` (1.0), `task_term` (0.8), `compound_term` (0.7), `alias_expansion` (0.6 via `expandQueryWithAliases`), `intent_keyword` (0.5 via whole-word matcher; the gateway substring matcher is intentionally NOT reused for codegen), `changed_file` (0.5), `risk_level` (1.0).
- Compound phrases cover canonical multi-domain asks: `endpoint seguro`/`secure endpoint`, `segredo hardcoded`/`hardcoded secret`, `pipeline release`/`release pipeline`, `trust boundary`, `service to service`, etc.
- Evidence patterns are ranked by deterministic relevance (direct control match = 1.0, active requirement = 0.7, derived control = 0.5) and capped at 25 patterns to keep the LLM context manageable. Capped patterns appear in `debug.rejected_candidates` when `debug=true`.

### Added — Agent guidance

- New MCP resource `sbd://toe/grounded-codegen-guide` exposing the canonical agent guide at `prompts/sbd-toe-grounded-codegen.md`.
- New MCP prompt `prepare_grounded_codegen` that bundles the guide with a user task and instructs the agent to call `prepare_sbd_toe_codegen_context` before producing code. The guide enforces: cite `citation_map` IDs, fill `security_rationale_template` (decisions/validations/expected_evidence/residual_risk), distinguish code/tests/evidence, never declare regulatory compliance, never invent identifiers, never treat AI-generated code as evidence, route `needs_clarification`/`needs_decomposition`/`unsupported_scope` to user dialog instead of silent guessing.

### Hardened — Release artefact hygiene

- `npm run check:npm-package` now scans every published text artefact under `data/publish/**` and `data/reports/**` for absolute build-machine paths (`/Users/`, `/home/`, `/Volumes/`). Banned prefixes now include `data/upstream/` and `data/publish/overlay/p2v2_round_1/`.
- `package-release-lib.mjs` runs a recursive `scanBundleForPrivatePaths` over the entire release bundle (with an allowlist for placeholder strings such as `<absolute-path-to-repo>` and `<private>`). The release script aborts before tar/zip if leaks are detected.
- `shouldExcludeFromBundle` filters `.DS_Store`, `Thumbs.db`, `._*`, `.AppleDouble`, `.LSOverride` from the release tarball.
- Pre-existing leak fixed: `docs/MCP-QUALITATIVE-EVAL-PLAN.md` now references `<absolute-path-to-repo>/dist/index.js` instead of the author's local path.

### Notes

- This is the MVP G2 release. The full Paper 5 evaluation programme is out of scope.
- The tool's semantic activation is deterministic at WP6 (lexicon + alias expansion + whole-word intents). Probabilistic / learned scoring is not part of this release.
- The shipped npm package is ~4.19 MB (runtime/v1 ~1.3 MB, overlay ~4.6 MB raw, compressed in tarball).

## 0.8.0 — earlier

See git history (`git log v0.7.x..v0.8.0`).
