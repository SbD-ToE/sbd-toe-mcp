---
ai_assisted: true
model: Claude Fable 5
date: 2026-08-30
purpose: documentation
reasoning: v0.20.0-beta.4 (beta line, npm `beta` dist-tag) — serves the formal KG release v1.6.1 (mcp-stable, contract v1.12 §1.19 curated requirement→control layer v2, Manual v1.7.1), same content as stable 0.10.3; absorbs master 8ade07f (PR #49: acceptance regression runner, query_sbd_toe_entities filter fix, Algolia-era cache paths removed) into the v2 line; first eval:acceptance run on this line. Earlier beta entries and the stable-line entries (synced from master) below.
review_status: pending-human-review
---

# Changelog

## 0.20.0-beta.4 — 2026-08-30

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.3`) is unchanged. Experimental; **not citable** — excluded from the scientific record
per `PROGRAMME-PRESERVATION-PROTOCOL.md` (see `FREEZE-REGISTRY.md`, beta line).

### Served bundle — formal KG release `v1.6.1` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.6.1`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.1`,
asset `sbd-toe-knowledge-graph-bundle-v1.6.1.zip` sha256
`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b` (fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`), contract
**v1.12** (§1.19 curated layer v2), Manual **v1.7.1** @ `8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`,
ontology `ontology-v1.1-fair-baseline`, `pinned_at` 2026-08-30. **Same pin and same served
content as stable `0.10.3`** (master `06f8bba`, PR #51); supersedes `v1.6.0` (beta.3).
Served-knowledge delta `v1.6.0` → `v1.6.1` as recorded in the `0.10.3` entry below (curated
requirement→control layer v2: `requirement_control_links` 263 → 265, 0 requirements without a
link; Manual v1.7.1 `EX-REQ-NNN`).

### Verified on this line (live server over stdio, `dist/index.js`; 2026-08-30)

- **`npm run eval:acceptance`** (first run on the beta line; record
  `docs/acceptance-runs/2026-08-30-v0.20.0-beta.4-acceptance.{md,json}`): **102 scenarios, 79
  executed — 59 PASS · 20 PART · 0 FAIL · 23 SKIP; promotion gate (Axis E) PASS**; Axis F
  7/7 incl. TC-F-08 (265 links, gaps 0/0/0, AUT-007/008 → identity, AUT-010 → monitoring).
  The scenario set is master's 0.10.3 one (#51: TC-E-01/02 criterion revised to structural
  `mitigated_by`, `associated_controls` textual → PART; `--stamp`). **21/22 exposed tools
  exercised — `trace_sbd_toe_graph` (this line only) is not covered by the stable scenario
  set** (follow-up: an Axis-G scenario for the SPARQL lens).
- `trace_sbd_toe_graph`: deterministic (3 lenses × 2 calls byte-equal); **270/270/270 rows —
  unchanged since beta.2** (`relations.v1` 529 untouched; the RDF projection's
  `requirement_control_links` source 263 → **265**, test re-baselined with history).
- `prepare_sbd_toe_codegen_context` with `concerns: ["agents"]` at `full`/`standard`/
  `minimal`/`ultrathin`: REQ-AGN-001…004 in the activated set at every level (11,760 / 4,998 /
  4,467 / 2,899 tokens; `category` elided at dieted levels, `description` at standard/minimal);
  task heuristic «AI agent … kill-switch … audit logging» also activates OPS-015.
- **Payload budgets** (vitest, `JSON.length/4`; tolerance ≤8,700 on fixture 2 `standard`
  ratified by the programme lead on 2026-08-29): fixture 1 full **18,992** · standard
  **6,280**/6,500 · minimal **5,641**/5,800 · ultrathin **3,746**/3,870 — the curated layer v2
  re-targets one link into this fixture (direct controls 9 → 10, `citation_map` 111 → **112**,
  re-baselined); fixture 2 full 24,790 · standard **8,617**/8,700 (gate 8,500 kept; −28 vs
  v1.6.0) · minimal **7,898**/8,000 · ultrathin **4,642**/4,840 · 151 ids. All within limits.
- Golden snapshots regenerated (data-driven: 131× `manual_commit_sha` `d5c2586a` → `8e03454c`,
  the re-targeted control in fixture 1, evidence totals). `npm run check` ✅ · **708/708** ✅
  (master's v1.6.1 tests `requirement-id.test.ts` / `req-agn-serving.test.ts` absorbed from #51).

### Absorbed from master `8ade07f1018d986816b8dadb8c5bc29be6c9fdf3` (PR #49)

Cherry-picked into the v2 line; `src/index.ts` merged cleanly (only the
`query_sbd_toe_entities` schema descriptions changed — `trace_sbd_toe_graph`, `detail`,
`include_relations` and `concerns: ["agents"]` untouched; the dieted `category` elision keeps
this line's `requirementCategoryOf` rule).

### Added — acceptance regression runner

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


## 0.20.0-beta.3 — 2026-08-29

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.2`, gitHead `31aa22af`) is unchanged. Experimental; **not citable** — excluded from the
scientific record per `PROGRAMME-PRESERVATION-PROTOCOL.md` (see `FREEZE-REGISTRY.md`, beta line).

### Served bundle — formal KG release `v1.6.0` (`mcp-stable`), `source: release`

`consumed-bundle.json`: `release_tag: v1.6.0`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`,
asset `sbd-toe-knowledge-graph-bundle-v1.6.0.zip` sha256
`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b` (verified by
`sync-bundle --from-release` against the release's `.sha256` asset), contract **v1.11**,
Manual **v1.7.0** @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` (`SbD-ToE/sbd-toe-manual`),
ontology `ontology-v1.1-fair-baseline` @ `84fe8bf6`, `pinned_at` 2026-08-29. **Identical pin
and identical served content to stable `0.10.2`** (master `31aa22af`, PR #47).

Pin lineage inside this version, all on 2026-08-29 (each step absorbed from `master` and
verified on this line — steps documented below in reverse order): dev-build
`kg-v1-manual-v1.6.7-aligned-2026-08-29` (PR #45 → `6353557`) → dev-build
`kg-v1-manual-v1.7.0-aligned-2026-08-29` (PR #46 → `eac79e6`) → **formal `v1.6.0`** (PR #47).
Diff of `data/` between the v1.7.0 dev-build and the formal release: **one file**,
`data/reports/run_manifest.json` — the `release` block only (`channel: dev-build → stable`,
`version: kg-v1-manual-v1.7.0-aligned-2026-08-29 → v1.6.0`); every served file byte-identical.

What this line adds over stable `0.10.2` (unchanged from beta.1/beta.2, re-verified on this
pin): `trace_sbd_toe_graph` (SPARQL/Oxigraph, deterministic, 270/270/270 rows per lens — equal
to beta.2), the `detail` parameter of `prepare_sbd_toe_codegen_context`
(`full`/`standard`/`minimal`/`ultrathin`), and — from this version —
`concerns: ["agents"]` accepted by `prepare` (REQ-AGN-001…004 + OPS-015 verified in the
activated set at all four detail levels) and the v1.10 category-segment rule in the dieted
encoding.

### Step 2 — re-pin to dev-build `kg-v1-manual-v1.7.0-aligned-2026-08-29` (absorbs master `947f38e6`, PR #46)

Superseded the `v1.6.7` pin (step 1, below) the same day; content identical to the formal
`v1.6.0` above.

- **Served bundle:** `consumed-bundle.json` → `kg-v1-manual-v1.7.0-aligned-2026-08-29`, sha256
  `2c27f4ebccb9a693ccb3ae50fb0bb64fd602aff3acc9b53d36f898a64c0064fa` (verified against the
  sidecar by `sync-bundle`; idempotent over the cherry-picked data, `+0 ~0 -0 =49`), contract
  **v1.11**, Manual **v1.7.0** @ `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce` (repo
  `SbD-ToE/sbd-toe-manual`), ontology unchanged. Identical to master's pin.
- **Served knowledge:** requirements 255 → **256** (OPS-015, ch. 12), categories 27; curated
  requirement→control layer: `requirement_control_links` 242 → **263** — the 20 formerly
  unlinked requirements (incl. REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-97aceecf29`)
  and OPS-015 now carry a direct control; `coverage_gaps.requirements_without_control_link`
  = **0** at L1/L2/L3 (mechanism kept, data-driven). Legacy `REQ-<CAT>-NNN` citations: **0**
  (`declared_gap` mechanism kept). Manual v1.7.0 `macro-processos` chunks served in `guide`.
- **Citation classifier (from master):** `src/serving/requirement-id.ts` `describeRequirementCitation`
  — illustrative `REQ-NNN` and non-requirement `<CAT>-NNN` tokens (`CWE-`, `SHA-`, …) answer
  with an **informative** `citation_note` (`status: "informative"`, `query_sbd_toe_entities` /
  `resolve_entities.meta`), never a gap, never resolved by approximation; `declared_gap` is
  reserved for the legacy shape. `EX-AUT-003` / `REQ-AUTH-001` still rejected (fullmatch).
- **v2 line, data-driven re-baselines (this line only):**
  - `src/serving/rdf/projection.test.ts`: `requirement_control_links` 242 → 263 (comment
    records the history). `trace_sbd_toe_graph` unchanged: 270/270/270 rows per lens,
    byte-equal to beta.2 (`relations.v1` 529 untouched).
  - Golden snapshots regenerated: 131× `manual_commit_sha` (`171db83d` → `d5c2586a`);
    fixture 2 gains OPS-015 (`logging` → OPS) in the activated set (68 → 69 requirements,
    +1 `citation_map` id, +1 grounding entry, `evidence_patterns_total` +1).
  - `prepare-codegen-context.budget.test.ts`: fixture 2 `citationIds` 150 → **151**;
    **payload deviation reported, gate not raised:** fixture 2 `standard` measures **8,645 >
    8,500** (EPIC hard gate; +223 tokens vs the v1.6.7 pin — OPS-015 with its published
    description; data growth, not an encoding regression). Recorded as a tolerated deviation
    (`KNOWN_TOTAL_DEVIATIONS`, ceiling **8,700 — ratified by the programme lead on
    2026-08-29**); the EPIC gate (8,500) itself is not raised; EPIC.md carries the
    re-baseline note. All other budgets within limits: f1 standard 6,227 / minimal 5,588 /
    ultrathin 3,696 (unchanged); f2 minimal **7,926**/8,000, ultrathin **4,642**/4,840; full
    18,903 / 24,792.
- **Toolchain hygiene (from master, separate commit on this line):** devDependencies `vitest` /
  `@vitest/coverage-v8` / `@vitest/ui` 1.6.x → **4.1.9**; resulting tree `vite` **8.2.2**
  (rolldown 1.2.6), `postcss` **8.5.26**; `esbuild` and `brace-expansion` leave the tree.
  Verified on the v2 line with `oxigraph` 0.5.9 (WASM): `npm run check` ✅, build ✅,
  **723/723** ✅ (incl. payload budgets and golden snapshots), `smoke:mcp` ✅, `npm audit`
  0 vulnerabilities. Package contents unchanged (devDependencies only).
- **Verified live (stdio):** resolve REQ-AGN-001…004 + **OPS-015** 5/5; consult L1 120/26,
  L2 **231/27**, L3 **256/27**, gaps 0/0/0; `concerns:["agents"]` → REQ-AGN-001…004 with 1
  direct control via `requirement_control_links` + 5 derived; `prepare_sbd_toe_codegen_context`
  at full/standard/minimal/ultrathin with REQ-AGN-001…004 **and OPS-015** in the activated set
  (task heuristic `ai agent` + `audit logging`); `npm run check` ✅, **723/723** ✅.

### Step 1 — absorb master `bc8c91890e454f171e267cea892d9d9b99f6585a` (PR #45): dev-build `v1.6.7`, id grammar v1.10, declared gaps

Absorbed into the v2 line by cherry-pick (`6353557`). Superseded the same day by step 2.

#### Served bundle at step 1 (same as master at #45)

`consumed-bundle.json`: formal `v1.5.0` → **dev-build `kg-v1-manual-v1.6.7-aligned-2026-08-29`**
(sha256 `a66c324575cede5ffb9e7c5ddae06bb8d090b3a1ec7150d53f80074f55185276`, verified by
`sync-bundle` against the `.sha256` sidecar; `pinned_at` 2026-08-29; contract **v1.10**; Manual
v1.6.7 @ `171db83d`). `sync-bundle` from the snapshot is idempotent over the cherry-picked
data (`+0 ~0 -0 =49`). Bundle deltas measured on this line: requirements 251 → **255**
(AGN ×4), EvidencePatterns 251 → **255**, `overlay_mappings` 5508 → **6360** (+852),
`cross_layer_referrals` 6366 → **7218** (+852), `external_frameworks` 4 → **6** (AI Act,
ENISA-CSA). The dispatcher's «+64 overlay edges / +32 EP» does not match these counts —
reported as a difference, not reconciled.

#### Absorbed from master (see `0.10.2` entry for the full description)

- REQ-AGN-001…004 served; `concerns: ["agents"]` on `consult_security_requirements`;
  `coverage_gaps.requirements_without_control_link` (20 at L3 / 18 at L2 / 4 at L1);
  `declared_gap` for legacy `REQ-<CAT>-NNN` citations on `query_sbd_toe_entities` /
  `resolve_entities`; `src/serving/requirement-id.ts` grammar v1.10 §1.18 (fullmatch) with
  its tests (`requirement-id.test.ts`, `req-agn-serving.test.ts`, +32 tests → 720/720).
- `src/index.ts` merged by hand: `concerns` enum gains `agents`; the v2 registrations
  (`trace_sbd_toe_graph`, `detail`, `include_relations`, codegen-instructions resource) are
  preserved. Version bump `0.10.2` **not** taken — this line is `0.20.0-beta.3`.

#### Changed — v2 line alignment with the v1.10 grammar (this line only; differences vs stable)

- `prepare_sbd_toe_codegen_context` dieted levels elided `category` when it equalled the
  requirement_id **prefix before the first `-`** — a grammar assumption the stable audit could
  not see (the site exists only on this line). Now derived through the single source
  `requirementCategoryOf` (segment before the number: `REQ-AGN-001` → `AGN`); the lossless
  guard (field kept inline on mismatch) is unchanged. `provenance_legend` / `detail_encoding`
  wording updated accordingly (+8…+17 tokens per dieted payload).
- `prepare_sbd_toe_codegen_context` **accepts `concerns: ["agents"]`** (→ category `AGN` via the
  loader's `concernsMap`; no AppSec Core slice family, no control invented) and the task
  heuristics `ai agent`, `agentic`, `kill-switch`/`kill switch`, `autonomy level` → `agents`.
  On the stable line `agents` is consult-only; here it is needed so the AGN catalogue can enter
  the activated set of a codegen context (verified live at `full`/`standard`/`minimal`/
  `ultrathin`: REQ-AGN-001…004 present at every level, `category` elided at dieted levels,
  published `description` at standard/minimal, none at ultrathin).
- Golden snapshots (`__snapshots__/codegen-detail/*`) regenerated: the diff is purely
  data-driven — 131× `manual_commit_sha` (`09b20f6f` → `171db83d`), 8× `name` + 4×
  `description` (markdown asterisks removed upstream in OPS-013 / REQ-AGN text), 6× legend
  `note` (above). No line added or removed.

#### Verified on this line (live server over stdio, `dist/index.js`)

| Check | Result |
|---|---|
| `resolve_entities` REQ-AGN-001…004 | ✅ 4/4, `category: AGN`, chapter 2; 001/002 L1–L3, 003/004 L2–L3 |
| `AUT-003` ✓ · `EX-AUT-003` ✗ (never AUT-003) · `REQ-AUTH-001` ✗ · `REQ-AUT-003` → `declared_gap` | ✅ |
| `consult` L1 / L2 / L3 | ✅ 120/26 · **230/27** · **255/27** categories; AGN ×2 / ×4 / ×4 |
| `coverage_gaps.requirements_without_control_link` | ✅ 4 / 18 / **20** (+ `REQUIREMENT_WITHOUT_CONTROL_LINK` rule-trace line) |
| `consult` `concerns:["agents"]` | ✅ exactly REQ-AGN-001…004, 0 controls, 4 declared |
| `query_sbd_toe_entities` REQ-AUT-003 / REQ-010 / EX-AUT-003 | ✅ `legacy_citation_unresolvable` / `citation_unresolvable` / no AUT-003 |
| `get_sbd_toe_verification_matrix` L3 | ✅ 255/255 EvidencePatterns |
| `trace_sbd_toe_graph` (3 lenses, pageSize 200) | ✅ deterministic (2 calls byte-equal per lens); totals **270 / 270 / 270 — identical to beta.2** (the RDF projection covers the v1 relations, untouched by this bundle; `anchor: REQ-AGN-001` → 0 rows, consistent with the declared gap; `anchor: ASC-01` → 19) |
| Payload budgets (vitest, method `JSON.length/4`) | ✅ f1 full 18,903 (= beta.2) · standard **6,227**/6,500 · minimal **5,588**/5,800 · ultrathin **3,696**/3,870; f2 full 24,730 (beta.2: 24,731) · standard **8,422**/8,500 · minimal **7,703**/8,000 · ultrathin **4,612**/4,840. Deltas vs beta.2: +17/+17/+8 and +11/+11/+6 tokens (legend wording) |
| `npm run check` · `npm test` · `npm run smoke:mcp` | ✅ · ✅ 42 files, **720/720** · ✅ |

Not a freeze event; `FREEZE-REGISTRY.md` unchanged. Same upstream pendings as the stable
line (formal KG release + `mcp-stable` → re-pin `source: release`; Manual legacy-citation
correction; `requirement_control_links` refresh).

## 0.20.0-beta.2 — 2026-07-05

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.x`) is unchanged. Experimental; **not citable** — excluded from the scientific
record per `PROGRAMME-PRESERVATION-PROTOCOL.md`.

### Added — v2 token diet of `prepare_sbd_toe_codegen_context` (epic `v2-token-diet`)

Measured baseline (2026-07-05, beta.1): typical codegen payload ≈18.9K tokens,
3-family ≈24.7K. External eval (D-a/D-b) attributed the 5.5× MCP cost multiplier to
*large payload × many turns*. This release cuts the payload, never the context.

- **`detail` input parameter** — `"full" | "standard" | "minimal" | "ultrathin"`,
  **default `"full"` is byte-identical to beta.1** (proven by binary comparison and
  golden snapshots; zero breaking change). The dieted levels re-encode, they never
  drop the activated set: no top-k, no ranking, complete requirement/control sets at
  every level, identical citable ID set (111/150 on the baseline fixtures) at every level.
  - `standard` — ≈6.2K/8.4K tokens (−67%/−66%): inverted `citations` grouped by source,
    `manual_grounding` grouped by (role, chapter, file, sha), top-level `provenance_legend`,
    evidence patterns capped at 10 (deterministic prefix, `total/returned/capped` +
    executable rest-reference), and — new context — the published verbatim `description`
    (the "how") on activated requirements and direct controls.
  - `minimal` — ≈5.6K/7.7K: same complete scope with descriptions; traceability
    serialization reduced to counts + executable references; evidence cap 5.
  - `ultrathin` — ≈3.7K/4.6K (−80%): complete sets as `{id, name, type}` without
    descriptions (`descriptions_ref` points at `minimal`); evidence 0 inline;
    grounding as `{total_entries, sha, groups_ref}`. Ablation arm for measuring the
    value of the description field.
- **Relations on-demand** — at dieted levels `g2_context.relations` (≈4.3K inline) becomes
  `relations_ref`: executable `trace_sbd_toe_graph` `{lens, anchor}` calls whose union is a
  proven superset of the elided edges (verified by real execution in tests; no IRI leakage;
  ids only). `include_relations: true` restores inline. Two orphan edges in the published
  bundle v1.5.0 (`ACM-SLG-005/006` in relations.jsonl without entities in mechanisms.json)
  are kept inline verbatim in `residual_relations` — never silent, data untouched.
- **`sbd://toe/codegen-instructions/{mode}` MCP resource** — static per-mode
  `llm_codegen_instructions` + `security_rationale_template` (byte-identical to the
  `full` inline content) referenced by `codegen_instructions_ref` at dieted levels;
  also carries the `detail_encoding` legend.
- **Context-reuse workflow** — grounded-codegen guide and plugin skill now instruct:
  one call per task (deterministic), loop against the received context, deepen via
  `detail:"minimal"` or targeted `consult_security_requirements` (measured ≈3K ≈16% of
  full); `repeat_call_hint` (54 tokens) added to dieted outputs.
- **Payload budget gates** — per-section vitest budgets on two fixed baseline fixtures;
  hard totals: standard ≤6,500/8,500 (epic), minimal ≤5,800/8,000 and ultrathin
  ≤3,870/4,840 (fixed by measurement, operator-ratified 2026-07-05).

### Unchanged

- `consumed-bundle.json` (formal release v1.5.0, sha256-pinned) — the diet is
  serialization only, never data. Deterministic activation core untouched.
- All other tools; offline/`npx` operation; stable `0.10.x` line.

## 0.20.0-beta.1 — 2026-06-29

**Prerelease (beta line).** Published to the npm `beta` dist-tag — `latest` (stable
`0.10.x`) is unchanged. Experimental; **not citable** — excluded from the scientific
record per `PROGRAMME-PRESERVATION-PROTOCOL.md`.

### Added — SPARQL graph-query capability (v2 engine R&D)

- **`trace_sbd_toe_graph`** — a new tool exposing curated multi-hop traversals over the
  AppSec Core v1 relation graph, served by an embedded SPARQL engine (Oxigraph/WASM).
  Three lenses: `slice_implementation` (slice → control objectives → mechanisms/practices),
  `objective_realization` (objective → mechanisms/practices), `mechanism_provenance`
  (mechanism/practice → objectives → slices). Deterministic (`ORDER BY`) and
  coverage-preserving (total + cursor); output is entity ids — internal IRIs never leak.
- Internal serving layer: `src/serving/rdf/projection.ts` (bundle → RDF triples,
  provisional local IRI scheme) and `src/serving/rdf/graph-store.ts` (Oxigraph wrapper
  enforcing `ORDER BY` + coverage paging).
- Adds the `oxigraph` (WASM) dependency — no native binaries; `npx`/offline preserved.

### Unchanged

- **Additive only.** Every existing tool's contract and output is identical to the stable
  line; `consumed-bundle.json` (the served data) is unchanged. New engine, constant data.

> The IRI scheme is **provisional/local**; canonical IRIs are an upstream (ontology)
> decision required before any graduation of this line to stable.
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
