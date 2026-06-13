# SbD-ToE Interaction Protocol — Spec v0.1 (DRAFT for ratification)

**Date:** 2026-06-13
**Owner:** Pontifex (`sbd-toe-mcp-poc`) · **For:** Orchestrator + programme-lead ratification
**Seeds:** `DevelopmentGovernance/docs/mcp-interaction-protocol-charter.md` (8 invariants),
`…/mcp-role-skill-and-affordance-capabilities.md` (RF-S done, RF-H = Stage 3).
**Status:** SPEC ONLY — no wire change yet. Stage 2 deliverable per dispatch
`agentic/briefs/2026-06-12-orchestrator-role-skills-and-affordances-dispatch.md`.

> **One sentence:** MCP is the transport; this protocol is the semantic layer — it
> says every tool response carries a **pure deterministic `data` band** and an
> optional **advisory `next` band**, both grounded, both coverage-preserving, under
> one versioned envelope.

---

## 1. The envelope (formalises invariant #2)

Every tool response is one object:

```jsonc
{
  "data":      { /* the deterministic answer — pure, contract-stable */ },
  "provenance":{ "content_type": "canonical|derived|inferred",
                 "produced_by": "...", "source_data": "...", "note": "..." },
  "coverage":  { /* OPTIONAL — present when the answer bounds a larger set (E5) */ },
  "next":      [ /* OPTIONAL — ≤3 advisory affordances; Stage 3 (RF-H) */ ]
}
```

- **`data`** — answers exactly what was asked. **Never** reshaped/polluted by `next`
  or `coverage`. This is what an agent relies on. (Invariants #1 grounding, #8 determinism.)
- **`provenance`** — already on 6 tools; the protocol makes it **universal** and its
  `content_type` *is* the epistemic label (invariant #4).
- **`coverage`** — the E5 envelope (`resumo + coverage_map + coverage cursor +
  related_blocks`, contract v1.3 §1.11/§1.12) when `data` is a bounded view of a
  bigger set (invariant #3, never-silent).
- **`next`** — the advisory band (invariant #5); empty/absent is valid. Stage 3.

### Current reality (inventory 2026-06-13) — four shapes to converge

| Shape | Tools | Migration |
|---|---|---|
| bare | `list_chapters`, `query_entities`, `chapter_brief`, `map_applicability`, `map_review_scope` | wrap `data` + add `provenance` |
| `provenance` + flat fields | `consult`, `get_threat_landscape`, `get_guide_by_role`, `resolve_entities`, `prepare_codegen_context` | move flat fields under `data` |
| `coverage` + `size_estimate` | `plan_repo_governance` | already E5-shaped; align names |
| `meta{provenance,coverage}` | `generate_sbd_toe_skill` (Stage 1) | rename `meta` → split to envelope |

## 2. The 8 invariants → per-tool obligation

| # | Clause | How every tool obeys it | State |
|---|---|---|---|
| 1 | Deterministic grounding | `data` cites only published-bundle ids; closed-world | EXISTS, universal |
| 2 | Two-band response | the envelope above (`data` ⟂ `next`) | **THIS SPEC** |
| 3 | Coverage-preserving | `coverage` block whenever a set is bounded; never silent | EXISTS (2 tools) → universal |
| 4 | Epistemic labels | `provenance.content_type` ∈ {canonical, derived, inferred} | EXISTS (6) → universal |
| 5 | Grounded affordances | `next[]` references real tools/entities; ≤3 ranked | Stage 3 (RF-H) |
| 6 | Role-aware serving | RF-S projection (`generate_sbd_toe_skill(role,...)`) | **DONE (Stage 1)** |
| 7 | Cross-check ≠ compliance | regulatory overlay labelled advisory in `data`/`provenance` | EXISTS |
| 8 | Determinism | same input → same output; `next` ranking is a **pure function** of `data` | EXISTS; constrains Stage 3 |

## 3. Versioning & compatibility

- The envelope shape is gated by the **Codex `consumer_contract_version`** (today
  v1.3, in `consumed-bundle.json`). Wrapping flat fields under `data` is a
  **breaking** wire change → per the pin's `alignment_policy`, a major contract bump
  **gates** (halt + re-validate serving + programme-lead sign-off).
- **Strategy to avoid a hard break:** introduce the envelope **additively** behind a
  capability flag / contract minor bump first — emit `data` as a *superset* (keep
  current top-level fields AND nest under `data`) for one deprecation window, then
  remove the duplication on the next major. Acceptance suite + benchmark pin the
  transition.

## 4. Reconciliation with E5 (so RF-H completes, never duplicates)

- `coverage` (E5) answers **"what's the full extent + how to fetch each item"** for
  the *current* tool's set. `next` (RF-H) answers **"what adjacent thing you likely
  want next + which tool"** — *cross-tool*. They are orthogonal: coverage = depth,
  next = breadth.
- The one overlap — *whole-set requests* ("dá-me todos os requisitos") — is owned by
  **`coverage`** for the in-tool path (families + counts + handles) and by **`next`**
  only for the cross-tool drill (`consult(L, ≤3 concerns)`). Rule: **if it's the same
  tool's data, it's `coverage`; if it's another tool, it's `next`.**

## 5. Stage boundaries

- **Stage 2 (this doc):** ratify the envelope + the universalisation plan. No wire
  change until ratified + contract-bump coordinated with Codex.
- **Stage 3 (RF-H):** populate `next[]` per the seed table; structural affordances
  first (pure, derivable), semantic affordances after Codex ships the missing
  relation edges (category→requirement, requirement→US→test, threat→control).

## 6. Open for ratification

1. Envelope key names (`data` / `next` / `provenance` / `coverage`) — bikeshed now,
   freeze before wire.
2. Additive-superset transition vs. clean break at a major contract bump.
3. Whether `provenance` stays top-level or nests in a `meta` (Stage 1 used `meta`).
4. Codex: confirm the contract-version bump path for an envelope change (who bumps,
   gate vs additive).
