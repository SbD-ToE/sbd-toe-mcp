# Determinismo do SERVING entre processos — 2026-09-09-residuos-publicado

Dois **processos distintos** do servidor, arrancados independentemente sobre o mesmo bundle pinado.

A mesma chamada em cada um; payloads comparados **byte a byte**. Repetir no mesmo processo mediria a cache, não o serving.

**29 byte-idênticos · 0 idênticos após neutralizar voláteis · 0 DIVERGEM · 0 não comparáveis**

| Superfície | Resultado | Bytes | Voláteis presentes |
|---|---|---|---|
| `search_sbd_toe_manual` | byte-idêntico | 4522 | — |
| `answer_sbd_toe_manual` | byte-idêntico | 4680 | — |
| `inspect_sbd_toe_retrieval` | byte-idêntico | 15813 | — |
| `list_sbd_toe_chapters` | byte-idêntico | 4265 | — |
| `query_sbd_toe_entities` | byte-idêntico | 1201 | — |
| `get_sbd_toe_chapter_brief` | byte-idêntico | 4582 | — |
| `plan_sbd_toe_repo_governance` | byte-idêntico | 21681 | — |
| `generate_sbd_toe_skill` | byte-idêntico | 7562 | — |
| `map_sbd_toe_review_scope` | byte-idêntico | 3354 | — |
| `get_sbd_toe_chapter_implementation_checklist` | byte-idêntico | 3851 | — |
| `get_sbd_toe_operating_model` | byte-idêntico | 12507 | — |
| `get_sbd_toe_verification_matrix` | byte-idêntico | 221707 | — |
| `assess_sbd_toe_implementation` | byte-idêntico | 12266 | — |
| `plan_sbd_toe_rollout` | byte-idêntico | 7241 | — |
| `get_sbd_toe_macro_processes` | byte-idêntico | 11367 | — |
| `explain_sbd_toe_topic` | byte-idêntico | 8858 | — |
| `get_sbd_toe_chapter_capability` | byte-idêntico | 20434 | — |
| `get_sbd_toe_playbook` | byte-idêntico | 9112 | — |
| `map_sbd_toe_regulatory_activation` | byte-idêntico | 7729 | — |
| `map_sbd_toe_applicability` | byte-idêntico | 10463 | — |
| `read_sbd_toe_resource` | byte-idêntico | 3303 | — |
| `trace_sbd_toe_requirement_sources` | byte-idêntico | 11475 | — |
| `select_sbd_toe_requirements` | byte-idêntico | 28568 | — |
| `consult_security_requirements` | byte-idêntico | 8096 | — |
| `get_threat_landscape` | byte-idêntico | 25189 | — |
| `get_guide_by_role` | byte-idêntico | 71421 | — |
| `resolve_entities` | byte-idêntico | 10231 | — |
| `trace_sbd_toe_graph` | byte-idêntico | 5160 | — |
| `prepare_sbd_toe_codegen_context` | byte-idêntico | 44615 | — |

## Campos voláteis declarados

- `generated_at` — carimbo temporal da própria resposta
- `timestamp` — carimbo temporal
- `run_id` — identificador de execução
- `duration_ms` — medição de tempo
- `elapsed_ms` — medição de tempo

Um campo que varie e **não** esteja nesta lista conta como DIVERGE: é achado, não ruído.
