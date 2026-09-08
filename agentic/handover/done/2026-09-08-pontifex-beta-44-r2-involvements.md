---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Re-pin sobre o r2 — servir os 163 envolvimentos de decisão; medir ABS-005 e GR-04.
review_status: pending-human-review
---

# beta.44 — QUEM DECIDE, AO LADO DE QUEM EXECUTA

**Persona:** Pontifex. **Pino:** `kg-v1-manual-v1.8.1-aligned-2026-09-08-v2.7-r2`
(`b9bb73fd240e`, contrato v1.22 §1.29). **Estável intocada.** Nada promovido.

## Errata do meu diagnóstico

O relatório do bloqueio afirmou «não é a allowlist — `release_bundle.py:54` lista o ficheiro».
**Não listava.** Corri o `grep` sobre a **árvore de trabalho** do KG, que já tinha a correcção,
em vez do ficheiro em `f6d4b97` (confirmado: 0 ocorrências no commit pinado). Apliquei a
disciplina do pino aos dados com todo o cuidado e falhei-a no diagnóstico — **li fonte fora do
commit pinado e afirmei sobre ele**. O Codex ter ido verificar em vez de seguir a minha pista
foi o que evitou o custo.

A **decisão** da vaga mantém-se e é independente da causa: não ir buscar o ficheiro à árvore de
origem estava certo então e continua certo.

## Os 163 envolvimentos

`get_guide_by_role` serve a espécie **paralela** à execução — 158 `approves` + 5 `consulted`,
12 capítulos, **163/163 com âncora verbatim**, todos `derived`. As atribuições ficam intocadas.
A asserção da fonte chega ao consumidor: **«não afirma execução; RACI completo»**. Um papel sem
envolvimentos declara *ausência de estrutura publicada*, não ausência de responsabilidade.

**A banda `decision_involvement_unavailable` saiu limpa** — não ficou pendurada.

## ABS-005 — a condição fecha; o registo não é meu

**As 7 âncoras ratificadas estão TODAS servidas** (42, 225, 273, 292, 432, 447, 452), mais 5:
**12 envolvimentos no cap. 01**. O `closes_in` está cumprido e é verificável.

**O índice NÃO regista a closure** (sem `closed_on`). Pela regra da b.40 — *o tipo vem do índice,
nunca da superfície* — **não a declaro fechada por conta própria**. É do Archon.

*Nota:* a `evidence` da ABS-005 diz «6×» e enumera **sete** linhas.

## GR-04 — moveu-se: **SERVIDO**. Painel **6·0·0**

A sonda passou a olhar para a espécie nova; **a expectativa não mudou** e o critério manteve-se
estrito: os **dois lados** para o papel, cada um **ancorado**. O product-owner é o **único papel
com ambos**: 5 aprova · 5 consultado · 10/10 ancorados.

**Ressalva na evidência, não escondida:** a fonte não afirma RACI completo; «delega» não é
publicado como tal. Serve-se **decide vs. não-decide**. ABS-002 continua a ser conteúdo.

## O que recusei

1. **Não declarei ABS-005 fechada** só porque a condição está cumprida — o registo é do índice.
2. **Não relaxei o critério do GR-04** para o fazer subir: exigi os dois lados e âncora em todos.
3. **Não escondi a ressalva** do «delega» para o veredicto ficar mais limpo.

## Verificação

Suite **816/816** · aceitação **176, 0 FAIL, gate PASS** (TC-F-69 novo) · **15 invariantes verdes**
· **ouro do Eixo H byte-idêntico** · orçamentos **14/14** · matriz **0 FALTA, 0 não exercitáveis** ·
Eixo I **6·0·0**. O re-pin moveu 8 linhas de ouro, todas o carimbo `kg`.
