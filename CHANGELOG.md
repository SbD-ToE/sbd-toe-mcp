---
ai_assisted: true
model: Claude Opus 4.8 (1M context)
date: 2026-06-29
purpose: documentation
reasoning: v0.20.0-beta.1 (beta line; beta.0 aborted on a Sigstore tlog flake before reaching npm) — new `trace_sbd_toe_graph` tool: curated multi-hop SPARQL traversals (Oxigraph/WASM) over the AppSec Core v1 relation graph. Additive, deterministic, non-citable prerelease on the `beta` dist-tag; stable `0.10.x` unchanged. v0.10.1 and earlier entries below.
review_status: pending-human-review
---

# Changelog

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
