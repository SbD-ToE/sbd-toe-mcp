---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-07
purpose: handover
reasoning: Vaga B — as superfícies de projecção afirmavam ou omitiam sem declarar; fechar pela classe.
review_status: pending-human-review
---

# Vaga B (beta.39) — AS SUPERFÍCIES DE PROJECÇÃO

**Persona:** Pontifex. **Autorização:** dispatch do Orchestrator (Vaga B), a partir de
auditoria externa à beta.37. **Bundle pin INALTERADO.** **Estável intocada.** Nada promovido.

## B1 — a junção capítulo→artefacto (a única afirmação FALSA)

A fonte declara sobre si mesma: *«`chapter_ids` rows form the chapter↔artifact relation (469
rows) — sum them for relation edges, never for totals»*. A vista de capacidade servia as 31
arestas do cap. 01 como `"total": 31, "mandatory": 31`, sob «tem de PRODUZIR», `canonical`.

Passa a servir **duas bases**, e nenhuma é «o que o capítulo tem de produzir»:

| base | cap. 01 |
|---|---|
| `evidence_pattern` (EP → requisito → capítulo) | 8 EP → **11 artefactos** |
| `chapter_relation` (registos que nomeiam o capítulo) | 31 arestas, com a proibição **verbatim** |

**Os 11 do auditor: CONFIRMADOS** por rota independente (pertença do requisito ao capítulo, não
prefixo de id). Cada artefacto declara de que base vem; a banda é `derived`.

**Achados de CONTEÚDO (sobem ao lead, não compensados):**
- `mandatory: true` em **45 de 45** — o campo não discrimina. Deixou de haver contagem de
  obrigatoriedade na superfície.
- `chapter_ids` mais largo que a própria proveniência: o registo do SBOM nomeia **os 15
  capítulos** e os seus `source_practice_ids` cobrem **7** — mais largo do que a triagem dizia.

## B2 — as bandas estendidas (a classe)

| superfície | passou a declarar |
|---|---|
| `plan_sbd_toe_rollout` | 7 de 15 capítulos fora, **5 `obrigatorio`** (02,04,06,08,09), com `demand_by_level` e chamada copiável |
| `get_sbd_toe_operating_model` | `authority` HERDADA dos 6 playbooks de `exemplo-playbook`: `illustrative_overlay`/`example_only` + `delimitation` partilhada |
| `search_sbd_toe_manual` | ancoragem à cabeça: termos da pergunta **sem âncora no corpus** (`datacenters, instalações`) |

## B3 — o `next` lê as bandas da resposta que o transporta

Reconciliação no **`sendResponse`**, o único ponto por onde tudo passa: uma tool nova é coberta
sozinha e as bandas novas da B2 não herdam o defeito. Decide pela FORMA (banda negativa nomeia
o valor; `next` que o mencione contradiz), retira do `next` e **declara em `next_withheld`** com
a banda que bloqueou. **19 tools varridas, zero falsos positivos.**

## B4 — menores

- `orgProfile` (rollout): `recorded_context`, `affects_result: false`. `orgScope`
  (operating_model): `affects_result: true` — **filtra**, e a distinção fica dita.
- `unassigned` sai de `phases` e passa a `phases_unassigned` **com contagem**.
- `scarcity.note`: o «2 passos» fixo segue os dados.
- **Prática «para L3» a L2 — nem serviço nem conteúdo.** A mesma prática publica-se nos três
  níveis com proporcionalidade graduada (L1 «Não» · L2 «Recomendado - Revisão peer reforçada» ·
  L3 «Obrigatório - Processo formal e auditável»). O nível filtra bem; engana o **rótulo**.
  16 atribuições em 1296; banda `level_named_in_label` com a proporcionalidade do nível pedido.

## O que decidi NÃO fazer

1. **Não inventei um piso numérico de relevância no `search`.** Um limiar de score seria um
   número nosso. Servi o que é derivável do corpus: que termos não ocorrem.
2. **Não mudei o `content_type` do `operating_model`.** A superfície de referência usa
   `canonical` para a mesma fonte; o rótulo é PROVENIÊNCIA e a força normativa vive na banda
   `authority`. Um quarto valor faria as duas discordarem — o defeito que a invariante entre
   superfícies existe para apanhar.
3. **Não compensei os achados de conteúdo.** O `mandatory` 45/45 e a largura do `chapter_ids`
   declaram-se; corrigi-los no servidor seria inventar dado.
4. **Não filtrei o `unassigned` em silêncio**, como o `explain_topic` fazia. Declara-se.

## Verificação

Suite **812/812** · aceitação **172, 0 FAIL, gate PASS** (TC-F-65 novo; **TC-F-61 actualizado —
assertava o `artifacts.total` que ERA a afirmação falsa**) · **13 invariantes verdes** · **ouro
do Eixo H byte-idêntico** · orçamentos **14/14** · `check:npm-package` verde (54 superfícies).
