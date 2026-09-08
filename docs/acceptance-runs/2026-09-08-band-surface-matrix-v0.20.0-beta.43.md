# Matriz BANDA × SUPERFÍCIE — 2026-09-08 — @shiftleftpt/sbd-toe-mcp@0.20.0-beta.43

**Colunas derivadas do `tools/list` REAL** (29 superfícies servidas) — nunca de uma lista à mão.

Estados: `tem` · `n/a` (com motivo) · **`FALTA`** · `?` (não exercitável por esta chamada — também é achado).

**109 tem · 49 n/a · 0 FALTA · 74 ?**

| Banda | answer_sbd_toe_manual | assess_sbd_toe_implementation | consult_security_requirements | explain_sbd_toe_topic | generate_sbd_toe_skill | get_guide_by_role | chapter_brief | chapter_capability | chapter_implementation_checklist | macro_processes | operating_model | playbook | verification_matrix | get_threat_landscape | inspect_sbd_toe_retrieval | chapters | applicability | regulatory_activation | review_scope | repo_governance | rollout | prepare_sbd_toe_codegen_context | query_sbd_toe_entities | read_sbd_toe_resource | resolve_entities | manual | select_sbd_toe_requirements | trace_sbd_toe_graph | trace_sbd_toe_requirement_sources |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Proveniência com `content_type`** | n/a | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | n/a | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | n/a | tem | tem | tem |
| **Nunca-silêncio: vazio DECLARADO** | ? | tem | ? | ? | ? | ? | ? | tem | ? | tem | ? | ? | ? | ? | ? | ? | tem | ? | ? | ? | ? | ? | ? | ? | ? | ? | tem | tem | tem |
| **Ausência TIPADA pelo índice (`absence_type`)** | ? | n/a | ? | ? | ? | ? | ? | tem | ? | tem | ? | tem | ? | ? | ? | ? | n/a | ? | ? | ? | ? | ? | ? | tem | ? | ? | n/a | n/a | n/a |
| **`next` executável** | n/a | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | tem | n/a | tem | tem | tem | tem | tem | tem | tem | tem | n/a | tem | n/a | tem | tem | tem |
| **`next` reconciliado com as bandas** | ? | tem | ? | ? | ? | ? | ? | tem | ? | tem | ? | ? | ? | ? | ? | ? | tem | ? | ? | ? | ? | ? | ? | ? | ? | ? | tem | tem | tem |
| **Paginação/cobertura declarada** | n/a | tem | n/a | tem | n/a | n/a | n/a | tem | tem | n/a | tem | n/a | tem | tem | n/a | n/a | n/a | tem | n/a | tem | tem | n/a | n/a | n/a | tem | n/a | tem | n/a | tem |
| **Eco de input com o seu PAPEL declarado** | n/a | tem | tem | tem | ? | tem | tem | tem | ? | n/a | n/a | tem | tem | tem | n/a | tem | tem | ? | n/a | tem | n/a | tem | tem | tem | tem | n/a | tem | tem | n/a |
| **Erro NOMEIA o vocabulário válido** | n/a | tem | n/a | ? | ? | tem | ? | tem | tem | tem | n/a | tem | n/a | n/a | n/a | n/a | n/a | tem | ? | n/a | n/a | tem | ? | ? | n/a | n/a | tem | ? | n/a |

## Células `FALTA` (achados desta corrida — não trabalho desta vaga)

_Nenhuma._

## Superfícies não exercitáveis por argumentos derivados do schema

_Nenhuma: as 29 superfícies responderam a argumentos derivados do próprio schema._

## Motivos das células `n/a` (por banda)

**Proveniência com `content_type`**
- superfície de PROSA — a proveniência vive no texto, não num campo — 3 superfície(s): answer_sbd_toe_manual, inspect_sbd_toe_retrieval, search_sbd_toe_manual

**Ausência TIPADA pelo índice (`absence_type`)**
- bandas negativas presentes, nenhuma é ausência do Manual: not_reported (contagem/flag, não uma banda); unknown_metrics (lista de vocabulário) — 1 superfície(s): assess_sbd_toe_implementation
- bandas negativas presentes, nenhuma é ausência do Manual: empty_role_view (rejeição de input do chamador) (exercitada por combinação: {"riskLevel":"L3","projectRole":"manager"}) — 1 superfície(s): map_sbd_toe_applicability
- bandas negativas presentes, nenhuma é ausência do Manual: not_comparable (lista vazia) — 1 superfície(s): select_sbd_toe_requirements
- bandas negativas presentes, nenhuma é ausência do Manual: empty_traversal (rejeição de input do chamador) — 1 superfície(s): trace_sbd_toe_graph
- bandas negativas presentes, nenhuma é ausência do Manual: unknown_requirement_ids (lista vazia) — 1 superfície(s): trace_sbd_toe_requirement_sources

**`next` executável**
- superfície de PROSA — não transporta afordâncias estruturadas — 3 superfície(s): answer_sbd_toe_manual, inspect_sbd_toe_retrieval, search_sbd_toe_manual
- superfície de PASSAGEM — serve o recurso verbatim; um `next` nosso alteraria o conteúdo — 1 superfície(s): read_sbd_toe_resource

**Paginação/cobertura declarada**
- não devolve conjunto paginável (sem offset/limit no schema) — 15 superfície(s): answer_sbd_toe_manual, consult_security_requirements, generate_sbd_toe_skill, get_guide_by_role, get_sbd_toe_chapter_brief, get_sbd_toe_macro_processes, inspect_sbd_toe_retrieval, list_sbd_toe_chapters, map_sbd_toe_applicability, map_sbd_toe_review_scope, prepare_sbd_toe_codegen_context, query_sbd_toe_entities, read_sbd_toe_resource, search_sbd_toe_manual, trace_sbd_toe_graph
- esta chamada não devolveu conjunto de registos — não há o que paginar — 1 superfície(s): get_sbd_toe_playbook

**Eco de input com o seu PAPEL declarado**
- nenhum argumento ecoado nesta chamada — 8 superfície(s): answer_sbd_toe_manual, get_sbd_toe_macro_processes, get_sbd_toe_operating_model, inspect_sbd_toe_retrieval, map_sbd_toe_review_scope, plan_sbd_toe_rollout, search_sbd_toe_manual, trace_sbd_toe_requirement_sources

**Erro NOMEIA o vocabulário válido**
- sem parâmetro de vocabulário aberto (enum no schema já nomeia os válidos) — 13 superfície(s): answer_sbd_toe_manual, consult_security_requirements, get_sbd_toe_operating_model, get_sbd_toe_verification_matrix, get_threat_landscape, inspect_sbd_toe_retrieval, list_sbd_toe_chapters, map_sbd_toe_applicability, plan_sbd_toe_repo_governance, plan_sbd_toe_rollout, resolve_entities, search_sbd_toe_manual, trace_sbd_toe_requirement_sources

