---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-07
purpose: handover
reasoning: Expor a travessia N:M (o roteiro passa a servir) e tipar as ausências pelo índice central.
review_status: pending-human-review
---

# Vaga beta.40 — A TRAVESSIA N:M E AS AUSÊNCIAS TIPADAS

**Persona:** Pontifex. **Autorização:** dispatch do Orchestrator.
**Pino:** dev-build `kg-v1-manual-v1.8.1-aligned-2026-09-07` (`15d3ddd11b59`, contrato v1.19
§1.26, ontologia v2.6). **Estável intocada.** Nada promovido.

## A — o roteiro cobre os 15

| fase | plan | design | develop | build | test | deploy | operate | govern |
|---|---|---|---|---|---|---|---|---|
| capítulos | 8 | **7** | **9** | 6 | 6 | 10 | 12 | 11 |

União **14**; o 15.º é o cap. 00, servido como **`species: piso`** e `is_absence: false` — fora
da derivação por não ser travessia, não por ausência. **`chapters_not_in_roadmap` = 0**, e
mantém-se servido a zero para que a cobertura completa seja verificável, não assumida.
`manual_chapter` **continua** em cada fase: ganhou companhia, não saiu. Novo:
`assignments_without_phase` — 219 atribuições em 8 capítulos, à vista.

As escolhas falsas do escalar desapareceram: `design` inclui o cap. 04, `develop` o cap. 06.

## B — definidores ≠ citadores

Cap. 01: **7 que DEFINE** vs **24 que apenas cita**. SBOM, imagem de container e relatório de
SAST deixam de ser servidos como seus. Cada artefacto traz `own` e as bases; o `chapter_brief`
faz a mesma separação, com os citados em `cited_values`.

## C — as ausências dizem de que espécie são

| superfície | vazio | espécie |
|---|---|---|
| `get_guide_by_role` | fornecedores-terceiros sem atribuições | **`gap`** ABS-003 (dívida, dono a triar) |
| `get_sbd_toe_playbook` | PCI-DSS sem cross-check | **`deferred`** ABS-004 (dívida **com gatilho**) |
| `get_sbd_toe_macro_processes` | travessia MP↔fase | **`out_of_scope`** ABS-001 (**fronteira**, do lead) |

`absence_type` vem do índice, nunca da superfície. **A ligação não é uma tabela à mão**:
procura-se no `statement` do próprio índice o valor que a superfície observou — uma ausência
nova que nomeie um valor servido é apanhada sem tocar no código, e ambiguidade devolve
`unindexed` em vez de escolher. Uma invariante varre o `src` e **parte se algum ficheiro fora do
módulo do índice carimbar um `absence_type`**. Vocabulário no guia gerado.

## D — `required_for_levels` pelo que é

**2 de 45** discriminam; 43 são `{L1,L2,L3: true}`. Declarado como quase degenerado, servido na
banda das bases, **não por artefacto** e não como se seleccionasse.

## A pergunta que decide a promoção

**As duas — e nesta ordem.** O rigor da b.39 é que tornou o ganho de utilidade *verificável*:
sem a banda de omissão, «8 de 15» era invisível e ninguém saberia que havia o que ganhar. A
prova do ganho é o Eixo H **byte-idêntico através de uma mudança de substrato**: o roteiro passou
de 8 para 15 capítulos e a selecção não se moveu um byte — é utilidade acrescentada sem custo em
rigor. E o `chapters_not_in_roadmap` ficou servido **a zero** em vez de apagado, porque a
honestidade não se retira quando deixa de doer.

A ressalva: **útil não é completo.** O roteiro cobre agora os 15 capítulos, mas continua a ser
uma projecção por fase — as 219 atribuições sem fase estão nos capítulos cobertos e não se
ancoram a momento nenhum. Está declarado, não resolvido.

## Verificação

Suite **814/814** · aceitação **173, 0 FAIL, gate PASS** (TC-F-66 novo; TC-F-65 e a invariante
da b.39 actualizados — assertavam a cobertura parcial que esta vaga fechou) · **13 invariantes
verdes** · **ouro do Eixo H byte-idêntico nos dois braços** · orçamentos **14/14** ·
`check:npm-package` verde. Re-pin moveu 8 linhas de ouro, **todas o carimbo `kg`**.
