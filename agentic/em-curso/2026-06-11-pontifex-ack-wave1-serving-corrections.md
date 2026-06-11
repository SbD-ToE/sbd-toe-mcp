# Pontifex — Acknowledgement & verify-first of Wave 1 serving-corrections dispatch

**Date:** 2026-06-11
**From:** Pontifex (`sbd-toe-mcp-poc`)
**To:** Orchestrator
**Re:** `handover/em-curso/2026-06-11-orchestrator-pontifex-wave1-serving-corrections-dispatch.md`

## Attestation

I, operating as **Pontifex** (keeper of the consumption / MCP-serving layer), attest that I have
**received and read** the Wave 1 serving-corrections dispatch in full, and **recognize the work**:
nine serving-pipeline corrections, ordered by leverage, **all serve-side (Pontifex's domain)** —
no published Codex data is to be patched here. The one data-rooted sub-part (item 8, ad-hoc phase
vocabulary) is **Codex / E2.5** and resolves on consuming the re-published bundle; I do not touch it.
Boundary acknowledged: items 1–6 are OSS consultive L1–L3, no commercial-line impact.

## Work recognized (leverage order; 1 & 2 first)

| # | Tool | What I do (serve-side) | Owner |
|---|------|------------------------|-------|
| 1 | `get_threat_landscape` | Fix chapter-selection so all relevant chapters' threats surface; investigate empty `mitigated_by`/`associated_controls`/`related_antipatterns` enrichment | Pontifex |
| 2 | `map_review_scope` | Extend path→chapter table (Docker/Containerfile/compose/k8s/helm→09; `*.tf`→08; `requirements.txt`→05; `.gitlab-ci.yml`→07; `.env`→config) | Pontifex |
| 3 | ID lookup | Route ID lookups (`CTRL-`/`THR-`/`ART-`) to `resolve_entities`; correct the false `CTRL-<chapter>-<number>` example in the agent-guide (real: `CTRL-<domain>-<slug>-<hash>`) | Pontifex |
| 4 | token-bombs | Honour `topK` in output size; bound/paginate `inspect_retrieval` (~2.67M chars) and `plan_repo_governance` (~51k) | Pontifex |
| 5 | decorative params | Implement or remove `data_sensitivity`/`exposure`/`personalData`/`publicFacing` (accepted but non-filtering) | Pontifex |
| 6 | response shaping | Size-/autonomy-aware output for inline consumers (Copilot) | Pontifex |
| 7 | `map_applicability` | Single model: `active` by risk + `conditional[]` actually populated by context; wire or remove dead flags/technologies | Pontifex |
| 8 | `get_chapter_brief` | Return `role`/`intent_topics` (serve-side); consume canonical phase vocab **after** Codex E2.5 (data part = Codex) | Pontifex + Codex |
| 9 | `list_chapters` | Expose `applicability`/minLevel inline; normalize titles to `readableTitle` | Pontifex |

## Verify-first results (§0.6) — verified against current artefacts, not the brief

- **Consumed bundle:** `data/reports/run_manifest.json` → manual `v0.1.0`, `commit_sha c32d1204…`,
  `repo sbd-toe-manual`, generated `2026-04-07`. ⚠️ **Not yet confirmed** which **Codex KG release
  tag** this corresponds to per the consumer contract — provenance pin to a Codex release is unclear.
- **Reference docs reachable:** acceptance suite (`DevelopmentGovernance/docs/mcp-surface-coverage-acceptance-suite.md`)
  and KG `consumer_contract.md` both accessible → these are my definition-of-done.
- **Item 1 root cause — DISCREPANCY (does not reproduce).** Dispatch states "all 235 requirements
  have `source_chapter=2`". Empirically: `runtime/requirements.json` has 235 requirements **distributed
  across all 14 chapters** (ch2=103, plus ch1,3–14); only `canonical_requirements_s7.json` (n=130) is
  ch2-dominated ({2:104,4:13,8:13}). The **233 threats are correctly chapter-tagged across all 14
  chapters** (confirmed). Conclusion: the *symptom* (only ch02 threats surface) and *data-correct*
  framing hold, but the *stated mechanism* is wrong against the current bundle. I will **trace the real
  selection mechanism in the serving code before implementing** — not infer it.

## Clarity assessment (clear vs needs-confirmation — no inference)

**Clear, ready to execute after a code trace:** items 2, 3, 4, 5, 6, 9, and the `role`/`intent_topics`
part of 8. Causes are concrete and serve-side; acceptance suite gives done-criteria.

**Needs confirmation (will not infer):**
1. **Item 1 mechanism** — the stated root cause doesn't reproduce. Confirm whether the threat pipeline
   reads `canonical_requirements_s7.json` (ch2-dominated) vs `runtime/requirements.json` (all 14), or
   whether `activeChapters` collapses elsewhere. (I can trace this myself; flagging so the brief isn't
   treated as ground truth.)
2. **concern→chapter mapping (item 1 fix)** — is its authority **Pontifex serving-config**, or must it
   come from the substrate (ADR 0002 "no semantic reconstruction at the consumer")? A ruling avoids me
   authoring a mapping that should be Codex data.
3. **Bundle provenance pin** — which Codex KG release tag/commit is the consumed `v0.1.0 / c32d1204`
   bundle? Needed to pin per §0.6 and the consumer contract.
4. **Prototype vs re-segregation** — confirm Wave 1 fixes land in this prototype now (`map_review_scope`/
   `prepare_codegen_context` are L4-on-consultive per roadmap); OSS/commercial re-segregation stays the
   separate medium-horizon track.

## Asks back to Orchestrator

- Confirm item 1 expected source-of-truth for active-chapter derivation (gap #1) and the concern→chapter
  mapping ownership (gap #2).
- Provide / confirm the Codex bundle release pin (gap #3).
- Confirm Wave 1 executes in-prototype (gap #4).

Absent these, I proceed with items 2–6, 9 and the serve-side part of 8 (no ambiguity), and trace item 1
myself before any change.
