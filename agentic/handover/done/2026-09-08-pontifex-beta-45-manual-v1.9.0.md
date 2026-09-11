---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Re-pin para o Manual v1.9.0 × ontologia v2.8 — tabelas do cap. 14 e ausências fechadas.
review_status: pending-human-review
---

# beta.45 — AS TABELAS ENTRAM, E O QUE FECHOU DEIXA DE PARECER ABERTO

**Persona:** Pontifex. **Pino:** `kg-v1-manual-v1.9.0-aligned-2026-09-08-v2.8` (`347f5cfd305e`,
contrato v1.23). **Estável intocada.** Nada promovido.

## Um defeito meu, que só a v2.8 tornou visível

A banda de ausências lia `absence_type` e **ignorava `status`**. ABS-005 e ABS-012 chegam
`closed` e saíam como `gap` com `is_debt: true`. Passa a servir `status`, `closed_on`,
`closed_evidence` e quem registou; a espécie mantém-se, o `is_debt` não. A `closure_rule` da
v2.8 — que é a minha recusa da b.44 virada regra — vai no guia, verbatim.

## O cap. 14 no roteiro

| | antes | agora |
|---|---|---|
| atribuições | 108 | **174** |
| `govern` | 102 (política) | **24** |
| `plan`·`test`·`operate` | 0·0·6 | **36·45·39** |
| fases no roteiro | 1 | **4** |

Cobertura mantém-se **15/15**, omissão **0**.

## As 30 sem fase, e a subida para 219

Servidas com os **`unmapped_phase_labels` verbatim** (14 rótulos; `Execução` ×6) e a razão:
*«forçá-los a uma fase seria afirmar o que a fonte não diz»*. **Não compensei nada.**

Corrigi a **redacção**, não o número: a banda diz que um número alto ali é **visibilidade**, e —
o que interessa mais — que **um zero pode ser pior**, porque pode significar que nenhuma linha
do capítulo foi tabelada e uma política de recurso o absorveu inteiro.

## O que recusei

1. **Não forcei fase** a nenhuma das 30, nem inventei vocabulário.
2. **Não «corrigi» o 219 para baixo** para a superfície parecer melhor.
3. **Não declarei ABS-005/012 fechadas por minha conta** — li o `status` do índice, que é a
   regra que a v2.8 escreveu.
4. **Não fixei outro par no TC-F-67**: o cenário passa a derivar um par ainda vazio, porque o
   que fixei antes a v1.9.0 preencheu — e voltará a acontecer.

## Verificação

Suite **816/816** · aceitação **177, 0 FAIL, gate PASS** · **15 invariantes verdes** · **ouro do
Eixo H byte-idêntico nos dois braços** apesar de 66 atribuições mudarem de fase por desenho ·
orçamentos **14/14** · matriz **0 FALTA, 0 não exercitáveis**. O re-pin moveu 139 linhas de ouro,
todas de proveniência.
