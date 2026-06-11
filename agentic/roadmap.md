# Pontifex roadmap

Horizons for the consumption / MCP-serving layer. Status is point-in-time; verify against current artefacts.

## Near — Wave 1 serving-logic corrections (independent of the KG; serve-side only)

Serving-pipeline defects diagnosed in the MCP surface review (Orchestrator, 2026-06). None require KG changes; all are Pontifex-local.

- **get_threat_landscape** — selection derives active chapters from requirement `source_chapter` (invariantly 02) → returns only 18 chapter-02 threats though **233 exist, correctly chapter-tagged**, in the bundle. Fix: select by risk-level active chapters + concern→chapter mapping; populate `mitigated_by`/`associated_controls`. [diagnosed]
- **map_review_scope** — path heuristic blind to containers/IaC/Python/GitLab (~73% of files fall to fallback 01+02; ch.08/09 never fire). Fix: extend path map.
- **ID lookup** — `query_entities` returns 0 for ID lookups (CTRL-/THR-/ART-); route ID resolution to `resolve_entities`; correct the agent-guide example (`CTRL-<chapter>-<number>` convention is false; real is `CTRL-<domain>-<slug>-<hash>`).
- **Token-bombs** — `inspect_retrieval` (2.67M chars even at topK=5) and `plan_repo_governance` without `riskLevel` (51k) exceed budget; bound output / honour topK.
- **Decorative params** — `data_sensitivity`/`exposure`/`personalData`/`publicFacing` not used in filtering; implement or remove.
- **Response shaping** — size-aware output for inline consumers (Copilot).

## Medium — OSS / commercial re-segregation

Per ADR 0002/0008/0009: separate consultive L1–L3 (`securitybydesign-oss-mcp`) from interventive L4 (`securitybydesign-toe-mcp`). The prototype currently mixes them (`prepare_codegen_context`, `map_review_scope` are L4 on a consultive server).

## Longer — projection & faces

Platform adapters, machine-readable face, embedded/event modes, external face — see `DevelopmentGovernance/docs/mcp-surface-coverage-acceptance-suite.md`.

## Depends on Codex (not Pontifex)

Consumed once Codex re-publishes: role/phase normalization (`kg-role-phase-normalization-map`), the v0↔v1 bridge, framework-coverage traceback exposure, playbook re-categorization.
