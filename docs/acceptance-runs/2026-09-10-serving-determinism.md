# Determinismo do SERVING entre processos — 2026-09-10

Dois **processos distintos** do servidor, arrancados independentemente sobre o mesmo bundle pinado.

A mesma chamada em cada um; payloads comparados **byte a byte**. Repetir no mesmo processo mediria a cache, não o serving.

**28 byte-idênticos · 1 idênticos após neutralizar voláteis · 0 DIVERGEM · 0 não comparáveis**

| Superfície | Resultado | Bytes | Voláteis presentes |
|---|---|---|---|
| `search_sbd_toe_manual` | byte-idêntico | 4522 | — |
| `answer_sbd_toe_manual` | byte-idêntico | 4680 | — |
| `inspect_sbd_toe_retrieval` | byte-idêntico | 15778 | — |
| `list_sbd_toe_chapters` | byte-idêntico | 4251 | — |
| `query_sbd_toe_entities` | byte-idêntico | 1184 | — |
| `get_sbd_toe_chapter_brief` | byte-idêntico | 4572 | — |
| `plan_sbd_toe_repo_governance` | byte-idêntico | 21664 | — |
| `generate_sbd_toe_skill` | idêntico após neutralizar voláteis | 9517 | artifact_generated_at, generated_at |
| `map_sbd_toe_review_scope` | byte-idêntico | 3337 | — |
| `get_sbd_toe_chapter_implementation_checklist` | byte-idêntico | 3834 | — |
| `get_sbd_toe_operating_model` | byte-idêntico | 12490 | — |
| `get_sbd_toe_verification_matrix` | byte-idêntico | 223326 | — |
| `assess_sbd_toe_implementation` | byte-idêntico | 12249 | — |
| `plan_sbd_toe_rollout` | byte-idêntico | 7274 | — |
| `get_sbd_toe_macro_processes` | byte-idêntico | 11376 | — |
| `explain_sbd_toe_topic` | byte-idêntico | 10109 | — |
| `get_sbd_toe_chapter_capability` | byte-idêntico | 20462 | — |
| `get_sbd_toe_playbook` | byte-idêntico | 9095 | — |
| `map_sbd_toe_regulatory_activation` | byte-idêntico | 7712 | — |
| `map_sbd_toe_applicability` | byte-idêntico | 10446 | — |
| `read_sbd_toe_resource` | byte-idêntico | 3269 | — |
| `trace_sbd_toe_requirement_sources` | byte-idêntico | 11458 | — |
| `select_sbd_toe_requirements` | byte-idêntico | 28657 | — |
| `consult_security_requirements` | byte-idêntico | 8079 | — |
| `get_threat_landscape` | byte-idêntico | 25172 | — |
| `get_guide_by_role` | byte-idêntico | 80929 | — |
| `resolve_entities` | byte-idêntico | 10214 | — |
| `trace_sbd_toe_graph` | byte-idêntico | 5143 | — |
| `prepare_sbd_toe_codegen_context` | byte-idêntico | 44598 | — |

## Campos voláteis declarados

- `generated_at` — carimbo temporal da própria resposta
- `timestamp` — carimbo temporal
- `run_id` — identificador de execução
- `duration_ms` — medição de tempo
- `elapsed_ms` — medição de tempo
- `artifact_generated_at` (prosa) — hora de geração impressa no artefacto instalável (P1: o ficheiro data-se a si mesmo)
- `artifact_generated_at_json` (prosa) — o mesmo carimbo, escapado dentro do JSON de `content`

Um campo que varie e **não** esteja nesta lista conta como DIVERGE: é achado, não ruído.
