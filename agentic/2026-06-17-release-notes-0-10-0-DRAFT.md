---
ai_assisted: true
model: Claude Opus 4.8 (1M context)
date: 2026-06-17
purpose: documentation
reasoning: Release notes draft for v0.10.0 — implementation view + verification reference + role-skills + protocol envelope. Prepared by Pontifex; not yet committed. To be folded into CHANGELOG.md at publish time by the programme-lead.
review_status: pending-human-review
---

# Release notes (DRAFT) — `@shiftleftpt/sbd-toe-mcp` 0.9.0 → 0.10.0

> ✅ **SUPERSEDED (2026-06-17):** folded into `CHANGELOG.md` (`## 0.10.0`) by Pontifex with
> corrections — Manual **v1.6.4** (not the 0.1.0 placeholder), contract **v1.7** (not v1.6),
> pin `…-2026-06-17` (sha `4500c709…`), and `get_threat_landscape` auth routing moved from
> *known-limitation* to **Fixed** (confirmed live). This draft is kept as history only.

**Minor** bump: 7 new tools + a changed `generate_sbd_toe_skill` schema + a `next`
advisory band retrofitted onto the legacy tools. All additive / backward-compatible
on the existing tools' core contract ⇒ minor, not patch.

Served bundle: `kg-v1-manual-v1.6.4-aligned-2026-06-15`
(sha256 `caa8cfef…d6b2`, `consumer_contract_version` v1.6, Manual v0.1.0 @ `09b20f6f`,
ontology `ontology-v1.1-fair-baseline`).

## 0.10.0 — 2026-06-17

### Added — Implementation view (the "how do I run this" family)

- **`get_sbd_toe_chapter_implementation_checklist`** — the retrieval-grounded
  "how to implement chapter NN" guidance (the operational *Aplicação no Ciclo de Vida*
  profile). Coverage-preserving, cites chunk ids.
- **`get_sbd_toe_operating_model`** — RACI / decision-rights / governance cadences /
  org-model promoted from the rollout playbook. Retrieval-grounded prose.
- **`plan_sbd_toe_rollout`** — phased rollout roadmap: canonical lifecycle phases
  (8) mapped to manual chapters. Phase-ordered MVP; the dependency DAG is declared-deferred,
  not faked.
- **`assess_sbd_toe_implementation`** — stateless KPI self-report: submitted KPI values
  vs. published per-level thresholds (`metrics.json`) → posture (below/at/above) + gaps.
  An applicable KPI with no value is **`not_reported`**, never a pass. Thresholds never invented.

Together with the existing `get_guide_by_role`, these four faces are the implementation
view: **what to do (role/DoD) · how to implement (checklist) · who governs (operating model) ·
in what order (rollout) · how compliant am I (assess)**.

### Added — Verification reference

- **`get_sbd_toe_verification_matrix`** — the EXPECTED side of verification: per
  requirement/control at a risk level, the validation method + expected evidence +
  EvidencePattern reference. EvidencePatterns are **first-class published entities**:
  L2 = 226/226 requirements covered (0 gaps, 0 unhinted), L3 = 251/251 (0 gaps, 0 unhinted).
  Coverage-preserving — declares any requirement with no EvidencePattern; cited per row.

### Added — Regulatory lens

- **`map_sbd_toe_regulatory_activation`** — reverse-of-provenance lens: given a framework
  (DORA, NIS2, CRA, RGPD) returns which manual chapters it activates, grouped with mapping +
  obligation counts per chapter (coverage-preserving, never a blind dump). DORA: 14 chapters
  activated, 1430 mappings.

### Added — Manual answering

- **`answer_sbd_toe_manual`** — retrieves grounded manual context and requests the final
  answer from the client's model via MCP sampling; falls back to formatted retrieval
  (same as `search_sbd_toe_manual`) when the client has no sampling support.

### Changed — Role-skill / sub-agent serving (RF-S)

- **`generate_sbd_toe_skill` schema extended**: `role`, `format` (`skill` | `subagent`),
  `flavour` (`harnessed` | `skilled`), `risk_level`, `phase`, `include_detail`.
  - **harnessed** sub-agent grants the `mcp__sbd-toe__*` tools (queries the manual live;
    the embedded slice is the index).
  - **skilled** sub-agent carries no MCP tools and embeds the frozen manual slice
    (per-user-story DoD detail) inline.
  - Coverage is declared (chapters / assignments / user stories / checklist items); nothing
    silently truncated.
- New resources `sbd://toe/skill/{role}` and `sbd://toe/subagent/{role}`.

### Changed — Protocol envelope (`next` advisory band, RF-H)

- Tool responses now carry a two-band **`next`** advisory band — adjacent tools the caller
  likely needs next, each tagged `kind: "semantic"` or `"structural"`. Retrofitted onto the
  legacy tools (`map_sbd_toe_review_scope`, `get_threat_landscape`, `list_sbd_toe_chapters`,
  `consult_security_requirements`, …) and emitted by all the new tools. Advisory only —
  does not change any tool's primary result shape.

### Fixed — Grounding / serving corrections (Wave 1)

- `map_sbd_toe_review_scope` path table extended beyond GitHub: containers/k8s/helm → ch09,
  Terraform/Bicep → ch08, Python deps → ch05, CI → ch07/10/11, `.env` → ch06. Unmapped paths
  still fall to the foundation guardrail (ch01 + ch02), now via an explicit
  `Guardrail (path não mapeado)` pattern.
- `get_threat_landscape` now passes through the substrate's `associated_controls`
  (previously hard-coded to `[]` — a serving-layer drop, not absent data).
- `inspect_sbd_toe_retrieval` / response shaping: consumer-aware bounding (no silent
  truncation); inspect honours `topK` (≈17 MB → ≈50 KB at `topK=5`).
- `list_sbd_toe_chapters` now returns per-level `applicability {L1,L2,L3}` + `minLevel`
  (previously promised in the description but omitted).
- Decorative applicability params (`hasPersonalData` / `isPublicFacing` / `projectRole`)
  relabelled "informational — does not affect scope".

### Known limitation (carried into 0.10.0)

- **`get_threat_landscape` base-concern routing**: domain concerns route correctly
  (`iac` → ch08, `architecture` → ch04, `logging` → ch12). The base concerns
  (`auth` / `access` / `encryption` / `validation` / `session`) route by the requirements
  catalog's source-chapter and collapse onto chapter 02, surfacing the requirements-process
  meta-threats (`MT-021…038`) instead of the domain threats. The domain-routing fix is staged
  in the working tree (`CONCERN_TO_DOMAIN_CHAPTER` + control-chapter routing) but ships
  effective in a follow-up build. See the prep report for the include-vs-defer decision.

### Provenance

- Served bundle pin: `consumed-bundle.json` → `kg-v1-manual-v1.6.4-aligned-2026-06-15`,
  sha256 `caa8cfef5318aaac324fcedce2490cd76ef450b724ec2579224d27afce74d6b2`,
  `consumer_contract_version` v1.6, source `dev-build`.
- `sbd://toe/version` echoes this pin (server name/version/description + manual/kg/ontology
  provenance), read live from the pin — never invented.
</content>
</invoke>
