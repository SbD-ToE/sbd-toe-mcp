# Pontifex → Codex: structure the verification reference (2 data items, no rush)

**Date:** 2026-06-14
**From:** Pontifex (`sbd-toe-mcp-poc`, serving)
**To:** Codex (`sbd-toe-knowledge-graph`, data) + Orchestrator
**Priority:** low / robustness — **not a gate**. `get_sbd_toe_verification_matrix` ships
now, serving the structured EvidencePatterns and **declaring** these gaps coverage-
preservingly. These two items make the matrix's level dimension authoritative and close
its requirement coverage.

## Context

`get_sbd_toe_verification_matrix(risk_level)` is live: it serves the 223 published
EvidencePatterns (`verification_logic` + `evidence_expectation` are structured 223/223,
so the EXPECTED side was data-ready). Two data residuals remain — serve-side they are
surfaced, not hidden; the fix is producer-side (Codex), analogous to the `metrics.json`
KPI structuring.

## Item 1 — requirements with no EvidencePattern (coverage hole)

`evidence_patterns.json.maps_to_requirement_id` covers 223 distinct requirements; **28
requirements applicable at L3 (24 at L2, 9 at L1) have no EvidencePattern**. The
verification matrix therefore has declared holes (`coverage_gaps.requirements_without_
evidence_pattern`).

**Ask:** author/derive an EvidencePattern (validation method + expected evidence +
evidence_type + maps_to_control) for the uncovered requirements, OR mark them
explicitly "no-evidence-by-design" so the gap is intentional, not missing. Sample
uncovered ids available via the tool's `coverage_gaps.sample`.

## Item 2 — `risk_level_hint` sparse (level dimension is only a hint)

`risk_level_hint` is **null on 128/223** EvidencePatterns (54 "L1+", 36 "L2+", 5 "L3").
Pontifex applies a cumulative-hint filter and flags unhinted patterns
(`level_hint: "unhinted"`, applied broadly) — but the level dimension is not
authoritative until the hint is populated.

**Ask:** populate `risk_level_hint` (cumulative "Lx+" / exact "Lx") on the 128 unhinted
patterns — ideally derived from the mapped requirement's `applicable_levels` (the
authoritative ladder we already use), à la the KPI `thresholds_by_level` parse.

## Shape note (so it lands consumable, like metrics.json)

Keep the structured fields on the EvidencePattern entity (`verification_logic`,
`evidence_expectation`, `evidence_type`, `maps_to_requirement_id`, `maps_to_control_id`,
`risk_level_hint`, `responsible_roles`, `expected_artifact_type_ids`). Pontifex consumes
them as-is; no contract change needed for item 1/2 (additive data completion).

Lands with any future recompile — no urgency; the matrix degrades gracefully until then.
