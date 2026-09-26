---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-26"
---

# 0004 — Tectos por custo em vez de por contagem: a promessa (0.21.2)

**Linha:** 0.21.x · **Data:** 2026-09-26 · **Autor:** Pontifex · **Branch:** `0.21.2-cost-ceilings` (a partir da 0.21.1, `fix/overlay-scope` @ `f4b5564`)
**Decisão de origem:** lead, 2026-09-26 (via Orchestrator): tectos de `lista` e `standard` por custo projectado, overlay e variância por
requisito incluídos; acima do envelope, `needs_decomposition` com lotes; release seguinte à 0.21.1.
**Estado:** PROPOSTA — **a promessa vem antes do código.** Nada implementado.

---

## 1. A promessa, escrita primeiro

> **`lista` e `standard`:** uma resposta pronta **cabe no envelope do nível** — `lista` 8 450 tokens, `standard` 9 200 —
> medido sobre o payload que o cliente recebe, com tudo o que ele leva: requisitos, controlos, entidades, adjacência e overlay
> regulatório. Se não cabe, a resposta é `needs_decomposition` com **lotes que somam o todo e que cabem cada um**.
>
> **A única excepção, sempre declarada:** um lote **irredutível** — uma única categoria — que sozinho não caiba. Esse serve-se
> pronto, com `within_envelope: false` e a razão; nunca devolve outra decomposição.
>
> **`full`:** sem envelope. Promete não faltar e declara o preço (inalterado).

Hoje a promessa é «no máximo 52 / 55 requisitos», e o envelope é só declarado. Depois, o envelope passa a ser a regra.

## 2. O modelo de custo, e porque é medido e não projectado

### O que a medição mostrou (0.21.1, `lista`)

- **O custo por requisito varia nove vezes.** Um requisito fundido custa entre 67 e 597 tokens (mediana 129, percentil 90 = 280).
  A média por categoria vai de 78 (REQ, DST, AUT) a 322 (THR). Um declive único de 133 tk/req erra para as duas pontas.
- **Há custo que não depende do número de requisitos.** O overlay RGPD pesa ≈5 500 tokens numa tarefa de 36 requisitos. Os
  controlos e as entidades do grafo crescem com os **capítulos** activados, não com a contagem: `agents` com 18 requisitos já
  custa 8 819 tokens.
- **Construir o payload real custa ≈5 ms** (a primeira chamada de um processo ≈100–300 ms, pelo carregamento).

### A regra

**Custo = o `size_estimate` do payload que seria entregue**, construído antes de responder e medido com a mesma régua
(`withDeclaredSize`, chars/4). Não há modelo a calibrar nem declive a re-derivar a cada bundle: a projecção é o próprio payload,
com erro zero. É a forma exacta do «custo projectado» da decisão do lead, e inclui por construção o overlay e a variância por requisito.

**Onde uma projecção a sério é inevitável** — o `next` do `select_sbd_toe_requirements` anuncia o custo de um `prepare` que ainda não
foi pedido — usa-se a soma dos custos médios por categoria, derivados do bundle servido (nunca escritos à mão), mais a base do nível.
Esse número é **declarado como estimativa** e **nunca bloqueia nada**.

## 3. Os lotes

- **Unidade:** a categoria (igual à 0.21 §6-a). `technologies`, `changed_files` e os parâmetros do overlay preservam-se literalmente
  em cada lote; `exposure` e `data_sensitivity` preservam-se pelo efeito, declarado em `derived_from`.
- **Empacotamento determinístico:** categorias por custo isolado decrescente (desempate por id); cada categoria entra no primeiro
  lote em que o payload **medido** do lote continue dentro do envelope. Cada tentativa constrói o payload real do lote — são os
  mesmos inputs que a chamada do lote vai usar, logo o custo anunciado é o custo que se vai receber.
- **Contagem e custo reais por lote:** `requirements` e `measured_tk`.
- **União declarada**, como hoje: `union.requirements` e `union.recall` (= 1).
- **Irredutível:** uma categoria que sozinha passe o envelope forma um lote próprio com `irreducible: true`. Chamado, esse lote sai
  pronto e declarado fora do envelope. A decomposição só dispara quando a selecção tem **duas ou mais** categorias — é o que
  impede o ciclo.

## 4. O que muda na superfície

- **Retiram-se** os tectos por contagem: `REQUIREMENT_CEILING_BY_DETAIL`, `COST_PER_REQ_TK`, `BASE_TK`, `CEILING_FIT`,
  `PROPOSED_CEILING_BY_DETAIL`. Ficam os envelopes (`PAYLOAD_PROMISE_TK`).
- **`requirement_ceiling`** (na resposta bloqueada) mantém o nome e `detail`, `selected`, `promise_tk`, `projected_tk` (agora o
  medido), `batches` e `union`. Ganha `basis: "measured_payload"` e, por lote, `measured_tk` e `irreducible`. **Saem `limit` e
  `cost_per_req_tk`**, porque descrevem uma regra que deixa de existir — mantê-los seria a mentira que esta casa não comete.
- **`size_estimate`** ganha `irreducible_note_id` quando aplicável; o resto igual.
- **Descrições das tools, guia e docs:** «a `lista` promete caber em 8 450 tokens; acima, lotes» substitui «tecto 52 / 55».

## 5. O efeito, medido antes de escrever o código

Matriz de 116 casos prontos hoje ou bloqueados por contagem (cada concern isolado em L2 e L3, oito trios em L3, overlay RGPD, o
caso do avaliador), em `lista` e `standard`:

| resultado | casos |
|---|---:|
| iguais — prontos com as duas regras | 87 |
| iguais — bloqueados com as duas regras | 6 |
| **prontos hoje → bloqueiam com a regra de custo** | **22** |
| **bloqueados hoje → prontos com a regra de custo** | **1** |

Os 22: `supply_chain`, `deployment`, `agents` e `release` isolados; três trios de L3; e o overlay RGPD (36 requisitos, 11 523 tokens).
Todos saem hoje prontos **acima do envelope** — é a promessa que hoje não se cumpre. O que desbloqueia: `auth`+`logging`+`validation`
em L3, 53 requisitos baratos, 7 981 tokens — hoje bloqueado só porque passa de 52.

Irredutível existe: a categoria mais cara isolada é **GOV com overlay CRA, 14 requisitos, 10 475 tokens** em `lista`.

## 6. Como se prova (os testes vêm antes da constante)

1. **Propriedade, sobre a matriz inteira:** toda a resposta pronta em `lista`/`standard` tem `size_estimate.approx_tokens ≤ envelope`,
   salvo lote irredutível declarado.
2. **Lotes executados:** cada lote sai pronto, dentro do envelope (ou irredutível declarado), com `measured_tk` igual ao `size_estimate`
   da chamada; a união cobre a selecção inteira (recall 1).
3. **Sem ciclo:** chamar um lote nunca devolve `needs_decomposition`.
4. **`full` byte-idêntico** à 0.21.1; **invariante 3** contra o oráculo da 0.20.0; **Eixo H 10/10**; determinismo.
5. TC-F-34 reescrito para a regra de custo; testes de tecto por contagem retirados com a regra.

## 7. Decisão pedida ao lead (binária)

**Um lote irredutível que não caiba no envelope serve-se pronto e declarado (`within_envelope: false`)?**
- **Sim (recomendo):** nenhuma pergunta legítima fica sem resposta; o excesso é dito. É o comportamento de hoje, só que limitado a
  uma categoria.
- **Não:** bloqueia e aponta para `detail: "full"`. O envelope fica absoluto, mas uma pergunta sobre governação com overlay CRA deixa
  de ter resposta em `lista`.

O resto desta promessa não depende dessa resposta.
