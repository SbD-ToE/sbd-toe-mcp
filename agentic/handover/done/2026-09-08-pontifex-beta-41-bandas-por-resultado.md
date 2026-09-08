---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Vaga C — declaração indexada a RESULTADOS vazios, vocabulário de papel, e a matriz banda × superfície.
review_status: pending-human-review
---

# Vaga C (beta.41) — A DECLARAÇÃO OLHA PARA O RESULTADO

**Persona:** Pontifex. **Autorização:** dispatch do Orchestrator (Vaga C), 2.ª auditoria externa
(8,5/10). **Bundle pin INALTERADO.** **Estável intocada.** Nada promovido.

## C1 — o vazio por combinação

| caso | antes | agora |
|---|---|---|
| `map_sbd_toe_applicability(projectRole="manager")` | 15 vistas vazias, silêncio | `empty_role_view`, causa `unresolved_vocabulary`, canónicos à vista |
| `get_guide_by_role(role="gestao-executiva", phase="plan")` | `[]`,`{}`,`{}`, silêncio | `empty_result` com a causa **isolada** |

A causa não é adivinhada: **reconta-se o mesmo corte sem cada filtro**, pelo próprio resolvedor.
Papel sozinho **14**, fase sozinha **21**, cruzamento **0** → `emptied_by: "combination"`. E o
`next` passa a **reflectir** a banda — o caminho de recuperação vai à frente.

## C2 — os dois vocabulários

O enum de 5 era disjunto dos 13 canónicos; **4 de 5 devolviam zero em silêncio** (mais do que a
auditoria reportou — só `developer` coincidia). O bundle **publica aliases** e o `resolveRoleId`
já os lia: a tool é que não os usava.

- `devops` → `devops-sre`: **0 → 75** user stories. Alias **publicado**.
- `architect`, `security`, `manager` **não têm alias** → declara-se, não se inventa.

## C3 — uma ausência, uma espécie

`unpublished_gap` (rótulo local) + ABS-001 (`out_of_scope`) eram servidos lado a lado. A fonte já
dizia que o local ficava superseded. Agora: `supersedes_local_label` **dentro** da banda, como
história. Mecanismo no `absenceBand`, não neste caso.

## C4 — a matriz banda × superfície

`npm run gate:band-matrix` · **29 superfícies × 8 bandas = 232 células**, colunas do `tools/list`
vivo. **63 tem · 32 n/a · 13 FALTA · 119 ?**

**Células FALTA (achados, não trabalho desta vaga):**
- `provenance` em falta: `chapter_brief`, `list_chapters`, `map_applicability`, `map_review_scope`,
  `plan_repo_governance` (5)
- `absence_typed` em falta: `chapter_capability`, `select_requirements`, `trace_requirement_sources` (3)
- `next` em falta: `generate_skill`, `trace_graph` (2)
- `pagination` sem cobertura: `get_playbook`, `resolve_entities` (2)
- `never_silent`: `trace_graph` devolve conjuntos vazios sem banda (1)

**Não exercitáveis por argumentos derivados do schema (também achado):**
`assess_implementation` (`kpi_values`), `query_entities` (`query`), `read_resource` (`uri`).

**A matriz revelou uma banda nova:** o nunca-silêncio no caminho de **ERRO**. Duas superfícies
calculavam o vocabulário e deitavam-no fora no `rpcError`. Fechei-as — é a classe da C1 noutro
caminho — e a prova de que funciona é a sonda ter passado a auto-corrigir-se (não exercitáveis:
4 → 3).

**Sobre as 13 tools «nunca exercitadas»:** não se confirma contra o nosso inventário — as 29 são
todas nomeadas em cenários. O que a matriz dá em vez disso é o inventário por BANDA, acima.

## O que decidi NÃO fazer

1. **Não fiz a banda de vazio central no `sendResponse`.** Só a superfície sabe qual é o seu
   resultado principal; um detector genérico teria de adivinhar, e adivinhar é o que esta vaga
   veio acabar. A classe fecha-se pela MATRIZ, não por um heurístico.
2. **Não deixei o `next_withheld` retirar o `generate_sbd_toe_skill`** no caso do guide, ao
   contrário do que o dispatch previa. O papel tem 14 atribuições ao nível pedido: a sugestão não
   é contraditada pela banda, é só incompleta. Retirá-la seria esconder um caminho legítimo.
3. **Não fechei as 13 células FALTA.** São achados desta corrida, como pedido.
4. **Não inventei alias** para `architect`, `security` e `manager`.

## Verificação

Suite **815/815** · aceitação **174, 0 FAIL, gate PASS** · **14 invariantes verdes** · **ouro do
Eixo H byte-idêntico** · orçamentos **14/14** · `check:npm-package` verde · matriz **13 FALTA**,
sem subir.
