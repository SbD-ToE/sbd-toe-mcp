# Pontifex — skills residual is pure serving (brief #3, updated)

**Date:** 2026-06-13
**From:** Pontifex (`sbd-toe-mcp-poc`)
**Re:** RF-S Stage 1 residual. **Pure serving** (Pontifex domain) — the served effect
lands/reconciles at the next **governed recompile** (data side unchanged here).

## Finding

The RF-S role-skill inherited two serving defects from its grounding tools; both are
level-applicability bugs, not data bugs:

### (a) `get_guide_by_role` did not filter user stories by level

The substrate **replicates every assignment across L1/L2/L3** (432×3), so filtering by
`risk_level` returned identical sets at every level — making the role-skill's
`risk_level` decorative. The level signal lives in the **assignment's** level-specific
`proportionality` string (e.g. US-10: L1 "Recomendado - SAST básico" → L3 "Obrigatório
- SAST+SCA+DAST"), **not** in `us.proportionality` (a `{L1,L2,L3}` object that the code
was reading and which is often null).

**Fix (serving):**
- Carry `proportionality` on `PracticeAssignment` (loader).
- In `_resolveGuideByRole`, drop assignments whose level proportionality marks them
  **non-applicable** — obligation matching `^(não|não aplicável|não obrigatório|n/a)`.
  Conservative & coverage-preserving: `Opcional`/`Recomendado`/`Obrigatório` are kept
  (they *are* applicable at the level), only the genuinely-N/A are dropped.
- Surface `proportionality_level` (the assignment's level string) in `role_checklist`
  and slim assignments — the sharp ladder, visible.

**Effect:** L1 now narrows vs L3 — devops-sre 72/75, qa 18/20, appsec 102/112 (was
identical). RF-S skills at L1 are genuinely sharper.

### (b) `plan_repo_governance` filtered by a hardcoded chapter table, not requirements

The ontology path used a hand-maintained `ACTIVE_CHAPTERS_BY_RISK` map (the coarse
"floor"), which wrongly marked e.g. **ch03 threat-modeling active at L1** though it has
**0 requirements applicable at L1**.

**Fix (serving):** derive the ladder **requirement-first** from
`requirements.applicable_levels` (the sharp `{L1,L2,L3}` ladder) keyed by
`source_chapter`. An artefact rides the levels at which its chapter carries an
applicable requirement; a chapter with **no** requirements stays floor-present at every
level (control/artifact = floor). Removed the hardcoded table.

**Effect:** ch03 now correctly absent at L1, present L2/L3; L1 totals 438 vs L2/L3 467.

## Boundary note

The artefact→requirement join (`artifact_requirements.requirement_id` = `REQ-*` vs
`requirements.requirement_id` = `ACC-001`…) does **not** resolve in the current bundle
(0/45). The fix is therefore **chapter-mediated** (`source_chapter`), which works today;
a precise per-artefact requirement join lands when the id namespaces reconcile at the
next governed recompile.

## Validation

`npm run check` ✅ · **470 tests** ✅ (+5: level-sharpening in `get-guide-by-role`,
requirement-first ladder in `plan-repo-governance`). No regressions; RF-S acceptance
(L2) unchanged.
