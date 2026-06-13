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
