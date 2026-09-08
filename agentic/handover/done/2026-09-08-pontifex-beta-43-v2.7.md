---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Vaga F — expor a v2.7; as asserções negativas passam a chegar ao consumidor.
review_status: pending-human-review
---

# Vaga F (beta.43) — A ASSERÇÃO NEGATIVA CHEGA AO CONSUMIDOR

**Persona:** Pontifex. **Pino:** `kg-v1-manual-v1.8.1-aligned-2026-09-08-v2.7`
(`97bd7b583594`, contrato v1.21 §1.28). **Estável intocada.** Nada promovido.

## A condição da vaga

Cada travessia derivada serve agora `asserts: { verb, source, does_not_assert }`, **verbatim**
da ontologia. Se ela deixar de publicar uma travessia que servimos, a banda di-lo
(`published: false`) em vez de a inventar.

**O `own` saiu.** A b.40 separou bem produtores de citadores e chamou-lhe `own`; o verbo
publicado é `produced_or_operated_by` e a fonte diz que **não afirma posse**. A palavra entrou
por não haver nada que a impedisse — agora há.

| base | verbo | não afirma |
|---|---|---|
| `produced_or_operated_by` | produz ou opera | posse; casa única; exigência probatória |
| `required_as_evidence_by` | exige como prova | produção; cobertura total (8/45 órfãos) |

## `evidence_chapter_ids` e os 8 órfãos

Terceira base, dado publicado. Os 8 artefactos sem capítulo probatório vêm **um a um**, cada um
com a ausência que a fonte já lhes tipa (`absence_type: gap`).

## RH/PeopleOps

`canonical: false`, com as **2 âncoras autoradas**, ausência ABS-011 tipada, e a nota de que os
canónicos **continuam a ser 13**. A contagem vem do vocabulário, não do `knownRoles` desta
superfície — que inclui a sentinela `unassigned` e faria os 13 parecerem 14 justamente na banda
que existe para dizer que ninguém foi acrescentado.

## BLOQUEIO — `decision_involvements` não vem no bundle

O manifesto do pino declara **163 `DecisionInvolvement`** no ficheiro
`decision_involvements.json`. **O arquivo não o traz** — nem em `runtime/`, nem em
`data/entities/`. Verifiquei os teus números contra a árvore upstream e **conferem todos**:
163 = 158 `approves` + 5 `consulted` · 12 capítulos · 163/163 com `anchor_text` · todos
`derived` · 12 involvements de `gestao-executiva` no cap. 01. **O conteúdo está certo; o
empacotamento deixou-o de fora.** É a classe da b.38, a montante.

Não o fui buscar à árvore de origem: a proveniência é verificada por digest contra o artefacto
pinado, e servir de fora seria servir o que ninguém verificou. A falta é **declarada** no
`get_guide_by_role` — onde um consumidor procuraria «quem aprova o quê» — com o que a entidade
responderia. **ABS-005 não fecha a partir deste artefacto** e o **GR-04 não se moveu**: medi,
não assumi.

## O que recusei

1. **Não servi `decision_involvements` de fora do pino**, embora o ficheiro exista na árvore
   upstream. Um pino verificado por digest não admite excepções de conveniência.
2. **Não promovi RH/PeopleOps a 14.º canónico**, nem o deixei cair no vazio.
3. **Não mantive o `own`** com uma nota a dizer que não significa posse — a palavra sai.
4. **Não assumi que ABS-005 fechou** por o dispatch o dizer: sem os dados no artefacto, não há
   o que medir, e digo-o.

## Verificação

Suite **816/816** · aceitação **175, 0 FAIL, gate PASS** · **15 invariantes verdes** · **ouro do
Eixo H byte-idêntico nos dois braços ATRAVÉS da mudança de substrato** · orçamentos **14/14** ·
matriz **0 FALTA, 0 não exercitáveis**. O re-pin moveu 8 linhas de ouro, todas o carimbo `kg`.
