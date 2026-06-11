# DSR-HISTORY — Round 1 (closed 2026-04-20)

**Round:** 1 (first iteration of the P2-v2 DSR cycle under DELTA 2026-04-05 7-category operational taxonomy)
**Open:** Phase A kickoff 2026-04-20 (post Orchestrator unblock D1(a)/D2/D3)
**Close:** Phase A G-A reached 2026-04-20; Phase B rollup + heat-map + this log entry shipped 2026-04-20
**Authority:** P2-v2 Phase A dispatcher 2026-04-20 + Phase B dispatcher 2026-04-20

---

## Round-1 scope

The first iteration of P2-v2's iterative DSR cycle, applied to the full 27-pilot canonical corpus under the 7-category operational taxonomy distilled from DELTA-coverage-preserving-knowledge-compilation-v2 (2026-04-05).

**Input artefacts (Phase A):**
- 27 canonical pilots per `data/instance_level_mapping/*_instance_mapping.json`
- AppSec Core v1 (release `0b44ac9`) as ontology target
- DELTA 2026-04-05 7-category operational taxonomy (dispatcher §5 distillation)
- Two-mode authoring (Block 1 additive re-classification on iter-1 stubs; Blocks 2-6 native authoring from instance_mapping signals)

**Output artefacts (Phase A + B):**
- 27 `manual_gap_analysis.json` stubs (3,562 items total, DELTA-7-cat-classified)
- 6 paper-feed work-notes (5 per-block + 1 G-A consolidation)
- 1 G-A close-out mirror to Orchestrator (`sbd-ai-runtime/handover/em-curso/2026-04-20-cartographer-p2v2-phase-a-ga-reached.md`)
- 1 `gap_rollup_round_1.json` with cross-pilot aggregation (Phase B)
- 1 `heatmap_27x10_pressure` (JSON + CSV + MD formats) (Phase B)
- Schema extraction rule doc (`method/phase-b-7cat-extraction-rule.md`) (Phase B)
- This DSR-HISTORY log entry (Phase B)

## Round-1 empirical findings (headline)

**F1 — Zero Manual-content absence.** Across 3,562 items + 27 heterogeneous pilots, the 7-category taxonomy classifies **zero `content_gap` and zero `claim_gap`**. Strongest single empirical validation of DELTA 2026-04-05 thesis: coverage-preserving compilation is a residual-classification method, not a Manual-content-absence detector.

**F2 — Three empirically distinct source-type distribution profiles:**
- Iter-1-ready mixed-technical (Block 1): `traceability_repair` ~21%
- Regulatory / compliance (Block 2 + PCI DSS): `overlay_repair` 73-91%
- Foundational + inverted + heavy control frameworks (Block 3/4/6): `not_a_gap` 48-81%

**F3 — 827 Phase-C-actionable items** (traceability_repair 581 + overlay_repair 246) for Manual refinement.

**F4 — 35 adjunct candidates** clustered into 4 prospective ACR patterns (tool integrity, agentic context, roles/responsibilities, generic secure-coding). Per feedback memory: Cartographer flags only; Orchestrator + programme-lead decide batching/timing.

**F5 — Method scalability demonstrated.** NIST 800-53 Rev 5 (1,196 items) + ASVS v5 (443) + CWE (400) + CAPEC (559) all processed single-session via mechanical heuristic.

## Round-1 per-CO-slice pressure distribution (heat-map 27×10)

| Slice | Items | % of v0-mapped | Interpretation |
|---|---:|---:|---|
| `ACO-IAT` | 678 | 24.7% | Identity/access/session trust — largest single concentration; CAPEC + NIST + ASVS v4/v5 all concentrate here |
| `ACO-IVF` | 314 | 11.4% | Input validation / fail-safe — second-largest; CWE attack patterns + injection-focused sources |
| `ACO-SCBI` | 311 | 11.3% | Supply-chain + build integrity — SLSA + SAMM + DSOMM + PCI + SSDF + NIST |
| `ACO-SPC` | 296 | 10.8% | Secret handling / protected config — NIST SP800-53 + PCI DSS + HIPAA |
| `ACO-ATB` | 280 | 10.2% | Architecture + trust boundaries |
| `ACO-ITS` | 234 | 8.5% | Integration trust / service-to-service |
| `ACO-SLG` | 207 | 7.5% | Security event logging |
| `ACO-TSV` | 149 | 5.4% | Testing / security validation |
| `ACO-TMR` | 125 | 4.6% | Threat modeling / risk disposition |
| `ACO-RPR` | 94 | 3.4% | Release promotion / rollback |
| **v0 sum** | **2,688** | 100% | |
| v1 adjunct (CBI+SRQ) | 3 | — | SAMM/DSOMM items with validated_adjunct anchor per ACR-001/002 |
| OOS (scope_boundary + not_in_7cat) | 871 | — | CWE inverted-OOS (256), HIPAA admin/physical (7), EU CRA non-safeguards (5), NIST non-AppSec families (327), context surfaces |

**Observation:** ACO-IAT pressure (24.7%) is nearly 2.4× the next-highest slice. Identity/access/session trust is the single most pressured area across the corpus — consistent with its centrality to security frameworks generally.

## Round-1 methodological observations

**M1 — Two-mode authoring.** Block 1 additive-wrapper re-classification (11 pilots, preservation-safe over iter-1) + Blocks 2-6 native authoring (16 pilots, no iter-1 predecessor). Both converge on same 7-cat taxonomy.

**M2 — Schema-aware extraction rule.** Downstream consumers (this DSR-HISTORY + Phase B rollup + heat-map) handle both schemas via `method/phase-b-7cat-extraction-rule.md`. Key detection: presence of `delta_2026_04_05_reclassification` key signals Block 1.

**M3 — Pilot-type prior in classification rules.** Regulatory/compliance pilots route bounded-mapped items to `overlay_repair`; direct-technical pilots route bounded-mapped to `traceability_repair`. Documented per-stub in `classification_rules` field.

**M4 — `topic_mapped` as third iter-1 landing mode.** Introduced by CIS v8.1.2 (21 items). Classified as `traceability_repair` (topic-level landing is bounded by nature).

**M5 — KEYWORD_FALLBACK is a resolution-mechanism signal, not a confidence signal.** Cross-tab analysis (Block 6 note): NIST's 181 KEYWORD_FALLBACK items all resolved to out_of_scope; CIS's 15 all resolved to topic_mapped.

**M6 — In-stub classification rules (traveling-with-data pattern).** Every Phase-A-authored stub carries its own `classification_rules` field. Auditability property: rules travel with the data; no external rule document can drift from applied rules.

## Round-1 vs. DSR baseline

This is the first formal DSR round under the 7-category taxonomy. No prior round to compare against for this specific taxonomy. Prior P2 (v0, OSF A6ZFJ published) used a 3-category taxonomy (claim gap / cross-reference gap / content gap / scope exclusion). The 7-category refinement was introduced in DELTA 2026-04-05.

Comparison dimensions for future rounds:
- Stability of distribution shape across rounds (expect regulatory overlay_repair share to remain high; not_a_gap share to decrease if Phase C Manual refinement converts some `traceability_repair` items to actual cross-refs)
- Movement of items between categories (e.g., `traceability_repair` → resolved, or `adjunct_creation_candidate` → `not_a_gap` post-ACR promotion)
- Emergence of `content_gap` or `claim_gap` items in future rounds (if the ready iter-1 corpus is expanded to new pilots)

## Round-1 close

- Phase A: complete 2026-04-20, G-A criteria 7/7 met
- Phase B: complete 2026-04-20 (this entry + rollup + heat-map + extraction rule shipped)
- Phase C: gated on G-B (Orchestrator review of Phase B outputs); scope = programme-lead Manual refinement against 827 candidate items
- Phase D: Round 2 DSR cycle; gated on G-C completion
- Phase E: freeze + headline claim; gated on G-D

## Round-1 preservation record

All Round-1 artifacts are preservation-safe per dispatcher §7:
- 27 stubs additive-only (Block 1) or native-new (Blocks 2-6)
- 4 `data/<pilot>/stubs/` folders created per D2 ruling (recorded in stubs)
- CIS v8.1 deprecated stub preserved as audit trail per D1(a); v8.1.2 stub authored fresh
- No immutable refs touched
- No freeze events triggered
- FREEZE-REGISTRY tag proposal (`p2v2-phase-a-complete-<sha>`) deferred to programme-lead discretion

## Artefact SHAs (Round-1 traceability anchors)

To be populated per-commit by Phase B commit; this section will be updated with Phase B SHA after commit:

- Phase A G-A commit: `fbce0e5`
- Phase B commit: [to be filled at commit]
- `data/p2v2_phase_a_rollups/gap_rollup_round_1.json`: [sha-256]
- `data/p2v2_phase_a_rollups/heatmap_27x10_pressure.json`: [sha-256]
- `method/phase-b-7cat-extraction-rule.md`: [sha-256]
- This file: [sha-256]
