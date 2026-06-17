# Pontifex — RF-S Stage 1 wire contract (role-skill + sub-agent serving)

**Date:** 2026-06-12
**From:** Pontifex (`sbd-toe-mcp-poc`)
**To:** Orchestrator + programme-lead (for ratification; implementing now per dispatch autonomy)
**Re:** `agentic/briefs/2026-06-12-orchestrator-role-skills-and-affordances-dispatch.md` — Stage 1.

## Verify-first findings (drive the contract)

1. **The role→manual-slice mapping is already derivable structurally** from the
   consumed bundle: `assignments.json` carries `chapter_id` per canonical role.
   No semantic reconstruction at the consumer (ADR 0002 respected) — the skill is a
   structural projection of the same join `get_guide_by_role` already does. The
   Codex "data support" ask is therefore **not blocking** for Stage 1; richer
   mappings (requirement categories per role) can refine later.
2. **Full-DoD embedding is a token bomb** (measured: devops-sre = 103 assignments,
   75 US, 376 checklist items, ~255KB JSON; developer ~106KB). The Wave 1
   response-shaping lesson applies: the skill is a **digest** by default,
   full detail is opt-in.
3. **Acceptance by construction:** the skill content is generated *from* the
   `handleGetGuideByRole(role, include_detail=true)` output — so "embedded guidance
   matches what get_guide_by_role grounds" holds structurally, not by review.

## Contract

### Tool — `generate_sbd_toe_skill` (extended, backwards-compatible)

| Param | Type | Default | Semantics |
|---|---|---|---|
| *(none)* | — | — | current behaviour unchanged: generic agent-guide content |
| `role` | string | — | natural names OK (consumer aliases + KG `roles.json` aliases resolve); unknown → error listing the 13 canonical `role_id`s — never invented |
| `risk_level` | L1\|L2\|L3 | `L2` | stated in the output |
| `format` | `skill`\|`subagent` | `skill` | skill = role-specialised guidance file; subagent = installable agent definition |
| `flavour` | `harnessed`\|`skilled` | `harnessed` | subagent only. **harnessed** grants `mcp__sbd-toe__*` (queries live); **skilled** embeds the frozen skill, **no MCP tools** |
| `include_detail` | boolean | `false` | embeds the full DoD checklist items (heavy — declared in coverage) |
| `phase` | string | — | narrows the slice (same canonical resolution as `get_guide_by_role`) |
| `clientType` | string | — | hint for `suggested_path` only; content is client-neutral |

Output: `{ content, suggested_path, meta: { role, canonical_role, risk_level,
format, flavour, coverage { chapters, assignments, user_stories, checklist_items,
of_total_chapters }, provenance } }`.

### Content shape (matches `sbd-toe-mcp-benchmark/skills/*.md`)

Frontmatter `name: sbd-{canonical_role}` + `description` (chapters + level +
flavour statement) + `tools:`. Body:
1. role mission (deterministic, from the slice);
2. **SbD-ToE core** — epistemic labels + identifier conventions, extracted from
   `assets/agent-guide.md` (manual-grounded, never re-authored);
3. **manual slice** — the role's chapters (readableTitle) with its user-story
   titles (+ `us_id`) and checklist-item counts; full items only with `include_detail`;
4. **coverage block (always)** — real counts, "this is the {role} slice at {L},
   not the whole manual ({N} chapters)", and the path to the rest
   (harnessed → call `get_guide_by_role(include_detail=true)`; skilled → re-generate
   via the MCP or consult the manual).

### Guard-rails (hard)

- **skilled** flavour: `tools:` carries client-local tools only — `mcp__sbd-toe__*`
  never appears (asserted in tests).
- Never invent: every chapter id/title, `us_id`, US title and checklist item in the
  content exists verbatim in the `get_guide_by_role` output / `list_chapters`.
- Coverage-preserving: counts always declared; no silent truncation.

### Resources

`sbd://toe/skill/{role}` (format=skill, L2) and `sbd://toe/subagent/{role}`
(harnessed, L2) — template-matched like `chapter-applicability/{riskLevel}`,
mime `text/markdown`.

## Acceptance (from the dispatch)

`generate_sbd_toe_skill(role="devops-sre", format="subagent")` returns an
installable definition whose embedded guidance matches
`get_guide_by_role("devops-sre", include_detail=true)` — tested as: every slice
element in the content exists in the guide output, counts equal the guide totals,
and the skilled flavour carries no MCP tools.

## Open for ratification (not blocking)

- Default risk level `L2` for the no-arg resource case.
- `harnessed` as subagent default (caller is already MCP-connected).
- Stage 2/3 (protocol formalisation, affordances) — separate; this contract only
  lands RF-S.
