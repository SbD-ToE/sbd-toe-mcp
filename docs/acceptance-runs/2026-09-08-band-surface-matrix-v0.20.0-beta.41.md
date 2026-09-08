# Matriz BANDA × SUPERFÍCIE — 2026-09-08 — @shiftleftpt/sbd-toe-mcp@0.20.0-beta.41

**Colunas derivadas do `tools/list` REAL** (29 superfícies servidas) — nunca de uma lista à mão.

Estados: `tem` · `n/a` (com motivo) · **`FALTA`** · `?` (não exercitável por esta chamada — também é achado).

**68 tem · 32 n/a · 13 FALTA · 119 ?**

| Banda | answer_sbd_toe_manual | assess_sbd_toe_implementation | consult_security_requirements | explain_sbd_toe_topic | generate_sbd_toe_skill | get_guide_by_role | chapter_brief | chapter_capability | chapter_implementation_checklist | macro_processes | operating_model | playbook | verification_matrix | get_threat_landscape | inspect_sbd_toe_retrieval | chapters | applicability | regulatory_activation | review_scope | repo_governance | rollout | prepare_sbd_toe_codegen_context | query_sbd_toe_entities | read_sbd_toe_resource | resolve_entities | manual | select_sbd_toe_requirements | trace_sbd_toe_graph | trace_sbd_toe_requirement_sources |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Proveniência com `content_type`** | n/a | ? | tem | tem | tem | tem | **FALTA** | tem | tem | tem | tem | tem | tem | tem | n/a | **FALTA** | **FALTA** | tem | **FALTA** | **FALTA** | tem | tem | ? | ? | tem | n/a | tem | tem | tem |
| **Nunca-silêncio: vazio DECLARADO** | ? | ? | ? | ? | ? | ? | ? | tem | ? | tem | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | tem | **FALTA** | tem |
| **Ausência TIPADA pelo índice (`absence_type`)** | ? | ? | ? | ? | ? | ? | ? | **FALTA** | ? | tem | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | **FALTA** | ? | **FALTA** |
| **`next` executável** | n/a | ? | tem | tem | **FALTA** | tem | tem | tem | tem | tem | tem | tem | tem | tem | n/a | tem | tem | tem | tem | tem | tem | tem | ? | ? | tem | n/a | tem | **FALTA** | tem |
| **`next` reconciliado com as bandas** | ? | ? | ? | ? | ? | ? | ? | tem | ? | tem | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | tem | ? | tem |
| **Paginação/cobertura declarada** | n/a | ? | n/a | tem | n/a | n/a | n/a | tem | tem | n/a | tem | **FALTA** | tem | tem | n/a | n/a | n/a | tem | n/a | tem | tem | n/a | ? | ? | **FALTA** | n/a | tem | n/a | tem |
| **Eco de input com `affects_result`** | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | tem | ? | ? |
| **Erro NOMEIA o vocabulário válido** | n/a | ? | n/a | ? | ? | tem | ? | tem | tem | tem | n/a | tem | n/a | n/a | n/a | n/a | n/a | tem | ? | n/a | n/a | tem | ? | ? | n/a | n/a | tem | ? | n/a |

## Células `FALTA` (achados desta corrida — não trabalho desta vaga)

- **get_sbd_toe_chapter_brief** · banda `provenance` — resposta sem proveniência
- **list_sbd_toe_chapters** · banda `provenance` — resposta sem proveniência
- **map_sbd_toe_applicability** · banda `provenance` — resposta sem proveniência
- **map_sbd_toe_review_scope** · banda `provenance` — resposta sem proveniência
- **plan_sbd_toe_repo_governance** · banda `provenance` — resposta sem proveniência
- **trace_sbd_toe_graph** · banda `never_silent` — todos os conjuntos vieram vazios e nada o declara
- **get_sbd_toe_chapter_capability** · banda `absence_typed` — 1 banda(s) de ausência sem `absence_type`
- **select_sbd_toe_requirements** · banda `absence_typed` — 1 banda(s) de ausência sem `absence_type`
- **trace_sbd_toe_requirement_sources** · banda `absence_typed` — 1 banda(s) de ausência sem `absence_type`
- **generate_sbd_toe_skill** · banda `next` — sem `next`
- **trace_sbd_toe_graph** · banda `next` — sem `next`
- **get_sbd_toe_playbook** · banda `pagination` — pagina sem declarar cobertura
- **resolve_entities** · banda `pagination` — pagina sem declarar cobertura

## Superfícies não exercitáveis por argumentos derivados do schema

- **assess_sbd_toe_implementation** — argumento obrigatório sem valor derivável: `kpi_values`
- **query_sbd_toe_entities** — argumento obrigatório sem valor derivável: `query`
- **read_sbd_toe_resource** — argumento obrigatório sem valor derivável: `uri`

## Motivos das células `n/a` (por banda)

**Proveniência com `content_type`**
- superfície de PROSA — a proveniência vive no texto, não num campo — 3 superfície(s): answer_sbd_toe_manual, inspect_sbd_toe_retrieval, search_sbd_toe_manual

**`next` executável**
- superfície de PROSA — não transporta afordâncias estruturadas — 3 superfície(s): answer_sbd_toe_manual, inspect_sbd_toe_retrieval, search_sbd_toe_manual

**Paginação/cobertura declarada**
- não devolve conjunto paginável (sem offset/limit no schema) — 13 superfície(s): answer_sbd_toe_manual, consult_security_requirements, generate_sbd_toe_skill, get_guide_by_role, get_sbd_toe_chapter_brief, get_sbd_toe_macro_processes, inspect_sbd_toe_retrieval, list_sbd_toe_chapters, map_sbd_toe_applicability, map_sbd_toe_review_scope, prepare_sbd_toe_codegen_context, search_sbd_toe_manual, trace_sbd_toe_graph

**Erro NOMEIA o vocabulário válido**
- sem parâmetro de vocabulário aberto (enum no schema já nomeia os válidos) — 13 superfície(s): answer_sbd_toe_manual, consult_security_requirements, get_sbd_toe_operating_model, get_sbd_toe_verification_matrix, get_threat_landscape, inspect_sbd_toe_retrieval, list_sbd_toe_chapters, map_sbd_toe_applicability, plan_sbd_toe_repo_governance, plan_sbd_toe_rollout, resolve_entities, search_sbd_toe_manual, trace_sbd_toe_requirement_sources

