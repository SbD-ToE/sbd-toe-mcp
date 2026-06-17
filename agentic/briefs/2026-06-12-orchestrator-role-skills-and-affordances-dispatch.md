# Pipeline dispatch: MCP interaction protocol — self-configuration & skills first

> 🤝 **ACTIVE — CO-DESIGN (green-lit by programme-lead, 2026-06-12).** The open MCP
> work is handed to you as a **pipeline**. **You own and develop the protocol** — best
> knowledge of the channel; full autonomy to refine, reshape, reorder or push back, in
> discussion with Orchestrator + programme-lead. Start at Stage 1 now.

**Date:** 2026-06-12
**From:** Orchestrator
**To:** Pontifex (`sbd-toe-mcp-poc`, serving) + Codex (`sbd-toe-knowledge-graph`, data — Stage support)
**Re:** Everything open framed as one pipeline. **Both OSS, protocol-level.** Specs:
`DevelopmentGovernance/docs/mcp-interaction-protocol-charter.md` (the protocol seed) +
`DevelopmentGovernance/docs/mcp-role-skill-and-affordance-capabilities.md` (RF-S, RF-H).

This brief is the **WHAT**. The per-stage wire contract is **yours**; build agentic
(implementer → tester → adversarial verifier); done = the acceptance suite proves it;
Orchestrator verifies above you by running the MCP.

---

## The pipeline

### ▶ Stage 1 — Self-configuration & role-skills  ⭐ PRIORITY (start now)

**Goal: help the consuming LLM / frontier model configure *itself* to use the MCP
well and appropriately** — and serve the per-role skills that make that real.

- **RF-S — per-role serving:** the MCP serves, per canonical role, (1) a
  role-specialised skill and (2) an installable **sub-agent definition** (frontmatter
  + recommended tools + role→manual-slice mapping), in two flavours — **harnessed**
  (grants `mcp__sbd-toe__*`, queries live) and **skilled** (frozen skill, no MCP).
- **Self-configuration:** a frontier model should be able to ask the MCP *"how do I
  configure myself to use you well for role X / client Y?"* and get a correct,
  installable answer. Candidate surface (you settle it): extend
  `generate_sbd_toe_skill(role?, risk_level?, concerns?, phase?, clientType?,
  format=skill|subagent)`; the `agent-guide` resource as the canonical "how to use me"
  (operating discipline, routing, epistemic rules); the `setup` prompt.
- **Codex (data support):** the role→manual-slice mapping (chapters / requirement
  categories / practices / user-stories per role). Coverage-preserving.
- **Guard-rails:** never invent; skilled flavour has no MCP tools; the config states
  what it covers + how to reach the rest.
- **Reference output:** `sbd-toe-mcp-benchmark/skills/*.md` (6 roles) — the
  hand-authored stand-in; match its shape/quality.
- **Acceptance:** `generate_sbd_toe_skill(role="devops-sre", format="subagent")`
  returns an installable definition whose embedded guidance matches
  `get_guide_by_role("devops-sre", include_detail=true)`.

### Stage 1 — verification findings (Orchestrator, live MCP, 2026-06-13)

Verified the delivered RF-S against the reconnected server (0.9.1). **All passed**:
version provenance (manual + kg v1.6.4 + ontology), harnessed/skilled flavours
(skilled carries no `mcp__sbd-toe__*` ✅), aliases (`sre`→`devops-sre`), resources
`sbd://toe/{skill,subagent}/{role}`, guard-rail (`pentester` → error listing the 13),
coverage-preserving block + `meta{coverage,provenance}`. Strong — the generated
skills even carry the **correct ID convention** (debunk `CTRL-<chapter>-<number>`),
i.e. more correct than the mini-site.

**One bug to fix (Stage 1 polish): `risk_level` is cosmetic in the role-skill projection.**

- The param is accepted, defaults to L2, and is reflected in `description` / slice
  header / `meta.risk_level` — but it **does not filter the slice**. `qa` and
  `devops-sre` return **identical** coverage at L1 = L2 = L3
  (`devops-sre` = 12 chapters / 103 assignments / 75 US / 376 checklist at all levels).
- Proof: the **L1** `devops-sre` slice includes a user story the manual tags **(L3)** —
  `04-arquitetura-segura · US-17 — Segmentação … como código **(L3)**`.
- Per the manual model the slice should **grow with level** (L2 unlocks ch.06/11, L3
  unlocks ch.13). Constant slice + L3 items in an L1 skill is wrong.
- **Likely root:** the `get_guide_by_role` pipeline (which the projection reuses)
  does not filter assignments by `risk_level`. **Codex to confirm** whether
  assignments carry `applicable_levels` gating that isn't being applied; **Pontifex**
  applies the level filter in the projection (and, if relevant, in `get_guide_by_role`).
- Does not block the capability; fix as Stage 1 polish.

**UPDATE (2026-06-13, after Codex A+B):** the *data* side is resolved — the
`applicable_levels` ladder was authoritative all along (boolean map, not a list:
118 L1L2L3 / 108 L2L3 / 25 L3, cumulative; `consult` honours it). Codex also
propagated derived levels to controls/artifacts (provenance-marked). So the residual
is **purely serving**, two pieces:
  1. **`get_guide_by_role` / the role-skill projection** does not filter the
     assignments/US slice by `risk_level` (US/assignments aren't level-scoped) — that
     is why the RF-S skill slice is identical across L1/L2/L3. Pontifex: filter the
     slice by the level of the requirements/controls the US map to, **or** stop
     labelling `risk_level` on a role-scoped (not level-scoped) skill.
  2. **`fix plan_sbd_toe_repo_governance`** (level-flat: returns all 379 artefacts as
     `[L1,L2,L3]`). Data is now ready. Per the matrix §7: **filter by
     `requirements.applicable_levels` FIRST** (requirement-grained — the sharp ladder);
     control/artifact derived levels are a **conservative-floor secondary** (they wash
     to coarse). Requirement-grained audit precision is the design conclusion.
  3. Served effect of the level fixes needs the **next recompile** (governed: Manual
     pin + programme-lead auth) — not a blocker you action, but the gate where it lands.

### ▶ Stage 2 — Formalise the interaction protocol (co-design)

The realisation: this is **one communication protocol over the MCP channel** (MCP =
transport; the SbD-ToE protocol = the semantic layer on top). Develop and own the
protocol spec from the charter's **8 invariants** — notably the **two-band response**
(`data` deterministic + `next` semantic advisory). The E5 envelope, grounding,
epistemic labels are already clauses; you formalise the whole as one coherent contract.

### ▶ Stage 3 — Affordances (RF-H)

The `next` semantic advisory band — *"se calhar também precisas de… podes obter assim"*
— 1–3 ranked, structural + semantic, grounded, never auto-executed.
**Coverage-preserving** (whole-set requests → grouped + counts + path to the rest).
**Reconcile case-by-case with the existing E5 envelope** so it *completes*, never
duplicates or contradicts, current behaviour. This is the gated stage — ratify the
reconciliation before shipping.

---

## Model

Orchestrator seeds the WHAT + verifies (runs the MCP); you own the contracts and the
protocol; programme-lead steers and ratifies. Report per the production-chain cadence;
group decisions for us. Autonomy to challenge any of this seed.
