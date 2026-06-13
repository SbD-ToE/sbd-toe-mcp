# Pontifex — Implementation-view tool family: per-tool contracts (spec v0.1, DRAFT)

**Date:** 2026-06-14
**Owner:** Pontifex (`sbd-toe-mcp-poc`) · **For:** Orchestrator + programme-lead ratification
**Seed:** `DevelopmentGovernance/docs/mcp-value-stream-capability-map.md` §"Implementation-view
tool family" (confirmed 2026-06-13). Ratified front (value-stream amendment).
**Status:** SPEC ONLY. **Execution gated on the recompile** (rebuilt bundle with the
implementation/rollout profiles + Codex facets). What lands now: these contracts.

> I own the per-tool wire contracts (agentic model; done = the acceptance suite proves
> it). This doc fixes the contracts so implementation is mechanical once the bundle ships.

## Lenses & composition

Three lenses over the same public manual — **operational** (role/phase/guide),
**regulatory** (overlay cross-check), **implementation** (this family). They are not
separate products; they **compose via the RF-H `next` band**: e.g.
`get_sbd_regulatory_activation("DORA")` → `next`: "now per-role → work:
`get_guide_by_role(role)`"; `assess_sbd_implementation(...)` → `next`: "close gap X:
`get_sbd_chapter_implementation_checklist(NN)`". Each contract below names its `next`.

## Data-availability triage (verified against the consumed bundle, v1.6.4)

| Need | In bundle today? | Tool blocked? |
|---|---|---|
| `overlay_mappings.jsonl` (5508; EXT-DORA 1430 / CRA 1516 / NIS2 1085 / RGPD 1477) | ✅ YES | `get_sbd_regulatory_activation` → **buildable now** |
| `requirements.applicable_levels` ladder | ✅ YES | `plan_repo_governance` fix → **DONE** |
| KPIs **OPS-Kxx** as structured entities + `thresholds_by_level` | ❌ text-only in chunks (0 in signals.json) | `assess_sbd_implementation`, surface-KPIs → **gated** |
| canon/20 implementation checklist (structured) | ❌ chunk-text only | `get_sbd_chapter_implementation_checklist` → **gated** |
| operating-model / RACI / rollout profile (P-1) | ❌ not structured | `get_sbd_operating_model`, `plan_sbd_rollout` → **gated** |
| policies (POL-…) as referenceable entities | ⚠️ `bundle_policy_links.jsonl` exists | surface-policies → **partial; confirm at recompile** |

---

## Contracts

### 1. `get_sbd_chapter_implementation_checklist(chapter, risk_level?)`  — NEW, gated
- **What:** the **canon/20** "how to implement SbD for chapter NN" checklist — the
  artefact the demotion masked. Dual-purpose: implementation *guide* + progress
  *instrument* (filled-in → analysed by tool #4).
- **Args:** `chapter` (id or number; resolved via `chapterNumber`), `risk_level?`
  (L1/L2/L3 — narrows the checklist requirement-first, reusing the brief-#3 ladder).
- **Output:** `{ data: { chapter, items[{ id, text, applicable_levels, requirement_id?,
  evidence_type? }] }, provenance, coverage? }`. Items grounded in canon/20 + joined to
  the chapter's requirements (so each item carries its level + the requirement it serves).
- **Guard-rails:** never invent items; level filter is the requirement ladder; coverage
  declares the full checklist size.
- **`next`:** → `assess_sbd_implementation` (fill it in), → `get_guide_by_role(chapter→role)`.
- **Tier:** OSS. **Acceptance:** items for chapter 07 at L1 ⊆ L3; every item cites a
  canon/20 source or a requirement id.

### 2. `get_sbd_operating_model(orgScope?)`  — NEW, gated
- **What:** RACI, decision-rights, cadences, org-model (P-1 `rollout` profile data).
- **Args:** `orgScope?` (e.g. team / product / org — filters the model granularity).
- **Output:** `{ data: { roles[{ role_id, raci, decision_rights }], cadences[],
  org_model }, provenance }`. `role_id` joins the canonical-13 (so it composes with
  RF-S role skills).
- **Guard-rails:** roles resolve to the canonical-13; never invent RACI cells.
- **`next`:** → `plan_sbd_rollout` (sequence it), → `get_guide_by_role(role)` (per-role work).
- **Tier:** OSS. **Acceptance:** every `role_id` ∈ the 13 canonical; RACI references
  real cadences/decision-rights from the profile.

### 3. `plan_sbd_rollout(orgProfile?, horizon?)`  — NEW (MVP), gated
- **What:** phased rollout roadmap (operating-model + phase-order I-2). **Real DAG
  deferred (S-2)** — MVP = ordered phases, not a dependency graph.
- **Args:** `orgProfile?`, `horizon?` (e.g. quarters / phase count).
- **Output:** `{ data: { phases[{ order, name, chapters[], roles[], entry_criteria,
  exit_criteria }] }, provenance, note: "phase-ordered MVP; dependency DAG = S-2" }`.
- **Guard-rails:** phases reference real chapters/roles; the MVP limitation is declared
  (no silent pretence of a DAG).
- **`next`:** → `assess_sbd_implementation` (track progress per phase), → checklist per phase.
- **Tier:** OSS. **Acceptance:** phases cover the active chapters for the profile; order
  respects phase-order I-2.

### 4. `assess_sbd_implementation(kpi_values, risk_level)`  — NEW, gated
- **What:** progress / "how implemented am I" — measure the org's **KPIs (OPS-Kxx)
  against `thresholds_by_level`** → posture/level + gaps. The V3 audit over the KPIs.
- **Args:** `kpi_values` (map OPS-Kxx → value), `risk_level` (the target/"compliant" band).
- **Output:** `{ data: { posture: "below|at|above", per_kpi[{ id, value, threshold,
  meets }], gaps[{ kpi, shortfall, remediation_ref }] }, provenance }`.
- **Guard-rails:** thresholds come from the bundle (per-level), never invented; a KPI
  with no submitted value is reported as `not_reported`, never assumed pass.
- **Tier:** **OSS (self-report, stateless)** — input values in, posture out, nothing
  stored. **Premium (tracked):** persistent/observed progress over time = state layer
  (V3) — out of scope for this OSS tool; the stateless self-report is the OSS surface.
- **`next`:** → `get_sbd_chapter_implementation_checklist` for each gap's chapter.
- **Acceptance:** given KPI values that miss a per-level threshold, the gap is reported
  with the real threshold; meeting all → posture `at|above`.

### 5. `plan_sbd_toe_repo_governance`  — FIX, **DONE** (commit a37b07d)
Requirement-first ladder shipped (brief #3b). Re-verify against the recompiled bundle
(per-artefact requirement join may then resolve, replacing chapter-mediated).

### 6. Surface **KPIs (OPS-Kxx)** + **policies**  — promote, gated
- **What:** the implementation reference — KPI targets + governance policies.
- **Surface:** resources `sbd://toe/kpis` and `sbd://toe/policies`, and/or a
  `query_entities(type=kpi|policy)` facet once Codex emits them as structured entities.
- **Tier:** OSS. **Acceptance:** every OPS-Kxx lists its `thresholds_by_level`; policies
  resolve by id.

### 7. `get_sbd_regulatory_activation(framework)`  — adjacent, **buildable now**
- **What:** reverse-of-provenance regulatory lens — "DORA → which manual areas to
  activate". Data = the 5508 `overlay_mappings`.
- **Args:** `framework` (DORA/CRA/NIS2/RGPD → `EXT-*`; accept bare + prefixed names).
- **Output:** `{ data: { framework, activated[{ target_type, target_id, chapter?,
  obligation_ids[], mapping_count, top_citation }], totals }, provenance, coverage }`.
  Group the framework's mappings by `target_id`/`target_type` (chapter/requirement/
  control), counts per group — coverage-preserving (no blind dump of 1430 rows).
- **Guard-rails:** ≤ coverage-preserving grouping; `confidence` surfaced; never invent a
  mapping; unknown framework → error listing the 4.
- **`next`:** → `map_applicability` / `get_guide_by_role` ("now per-role → work"),
  → `consult_security_requirements` for the activated areas.
- **Tier:** OSS. **Acceptance:** `get_sbd_regulatory_activation("DORA")` returns the
  chapters/areas the 1430 EXT-DORA mappings touch, grouped with counts; sum of group
  counts = total mappings (coverage-preserving).

---

## Open for ratification

1. Tool-name prefix: `get_sbd_*` (this family) vs the existing `*_sbd_toe_*` convention
   — align before wire.
2. `get_sbd_regulatory_activation` may ship **ahead** of the recompile (its data exists)
   — confirm whether to land it early or hold the family together with the recompile.
3. Envelope: these tools adopt the Stage-2 `{data, provenance, coverage?, next?}`
   envelope from the start (greenfield — no back-compat cost), making them the
   **reference implementation** of the protocol spec.
4. `assess_sbd_implementation` stateless/Premium boundary — confirm the OSS tool never
   persists, and the tracked mode is a separate (Premium) surface.
