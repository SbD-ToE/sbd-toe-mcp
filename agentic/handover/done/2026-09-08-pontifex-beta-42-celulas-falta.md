---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Vaga E — fechar as 13 células FALTA da matriz, reduzir o «?» e reconciliar o inventário.
review_status: pending-human-review
---

# Vaga E (beta.42) — FECHAR O QUE A MATRIZ ENCONTROU

**Persona:** Pontifex. **Pino INALTERADO.** **Estável intocada.** Nada promovido.

## As 13 células: 9 defeitos, 4 regras

| célula | veredicto | o que se fez |
|---|---|---|
| `never_silent` · trace_graph | **defeito** | banda `empty_traversal` com as âncoras válidas **derivadas do grafo** |
| `next` · trace_graph, generate_skill | **defeito** | `next` nos dois; o ramo POR PAPEL do skill não tinha nenhum |
| `provenance` × 5 | **defeito** | `structuralProvenance` como fonte única |
| `pagination` · resolve_entities | **defeito** | `coverage` com `truncated` e a declaração de que **não há `offset`** |
| `pagination` · get_playbook | **regra** | contava vocabulário como conjunto paginado |
| `absence_typed` × 3 | **regra** | lista vazia, limite de serviço e rejeição de input não são ausências do Manual |

Mais dois defeitos que só apareceram quando as superfícies ficaram exercitáveis:
**`assess`** calculava `posture` sobre zero KPIs num capítulo inexistente; **`query_entities`**
servia sem proveniência.

## O `?`: 116 → 74. Não exercitáveis: 4 → 0

- **Sonda de combinação** — cruza dois selectores do schema. Se der resultados, fica `?`.
- **Prova por variação** — chama duas vezes com valores diferentes do mesmo argumento e compara
  o payload sem os ecos. Igual ⇒ **inerte**. Apanhou o `task` do `prepare`, mudo, enquanto o
  `select` já declarava o mesmo input como `recorded_context`.
- **Exemplos derivados no schema** — `kpi_values`, `query`, `uri` vindos do bundle e do
  catálogo de recursos. É o mesmo movimento do erro que passou a nomear o vocabulário.

## O gate que NÃO se levantou

O `task_role` custou tokens. Reduzi-o a **uma chave com o termo do vocabulário**. Os **gates
duros do EPIC passaram sem se mexer**; ajustei a guarda por secção do `full` em **+6 tokens
medidos**, declarados na linha — é retrato do comportamento actual, não gate do EPIC.

## O inventário, reconciliado

**29 tools · 12 resources · 3 prompts.** As 29 são **chamadas** por cenários, não só nomeadas —
a afirmação de «13 de 31 nunca exercitadas» não se confirma aqui. O `31` mais plausível é
**tools + prompts de uma build anterior** (28+3); não o reconstruo a partir daqui e digo-o em
vez de o encaixar. Na reconciliação acusei o guia de citar uma tool inexistente
(`prepare_grounded_codegen`) e era **um prompt** — falso positivo meu, hoje impossível de
repetir: uma invariante valida cada nome citado contra tools ∪ prompts ∪ resources.

## O que recusei

1. **Não relaxei o critério para baixar o `?`.** 74 células continuam por exercitar porque
   exigem um vazio que nenhum input válido produz nesta corrida. Um `?` honesto vale mais.
2. **Não levantei um gate duro** para caber a minha declaração — encolhi a declaração.
3. **Não reportei como achados os 4 falsos positivos do instrumento.** São regras minhas.
4. **Não inventei o número do auditor.** Digo o que meço e onde a diferença pode estar.

## Verificação

Suite **816/816** · aceitação **174, 0 FAIL, gate PASS** · **15 invariantes verdes** · **ouro do
Eixo H byte-idêntico** · orçamentos **14/14** · matriz **0 FALTA, 0 não exercitáveis**, baseline
do portão a **zero**.
