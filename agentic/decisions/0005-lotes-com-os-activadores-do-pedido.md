---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-26"
---

# 0005 — Os lotes levam os activadores do pedido original: a promessa

**Linha:** 0.21.x · **Data:** 2026-09-26 · **Autor:** Pontifex · **Branch:** `0.21.2-cost-ceilings` (cabe: é aditivo à decisão 0004).
**Decisão de origem:** lead, 2026-09-26, via Orchestrator. Cada lote de `needs_decomposition` leva as `technologies`, os
`changed_files` e as fatias que o pedido original activava, para ter o contexto G2 e o `manual_grounding` certos para as suas
categorias. Um «lote único» deixa de ser saída válida.
**Estado:** PROPOSTA — **a promessa vem antes do código.** Há um protótipo descartável, fora do repositório, que serviu só para
medir a §5.

---

## 1. A promessa, escrita primeiro

> **Cada lote é o pedido original restrito às suas categorias.** Leva:
> - os mesmos requisitos que o pedido original traria para essas categorias;
> - o mesmo contexto que o pedido original traria para elas: entidades do grafo AppSec Core e `manual_grounding` das fatias que
>   as concerns do pedido activavam;
> - as mesmas `technologies`, os mesmos `changed_files` e o mesmo overlay.
>
> **A união dos lotes devolve o pedido inteiro:** todos os requisitos (recall 1, como hoje) e todas as fatias e entidades G2 que o
> pedido original activava.
>
> **Uma decomposição tem sempre dois lotes ou mais.** Se o pedido não cabe e tem uma só categoria decomponível, é o caso
> irredutível: sai pronto e declarado, como na decisão 0004. Nunca sai uma «decomposição» de um só lote.

O resto da decisão 0004 fica igual: envelope medido, lotes medidos que cabem, custo declarado igual ao custo recebido, sem ciclo, e
`full` inalterado.

## 2. O defeito que isto fecha

Hoje um lote é uma declaração só por `categories`. Isso activa os requisitos certos, mas **nenhuma fatia**, porque as fatias vêm das
concerns. O lote chega assim sem entidades G2 e sem `manual_grounding`, exactamente o contexto que o prepare existe para dar.

Medido sobre a matriz (§5):
- em 26 das 32 decomposições, a união dos lotes perde parte do contexto G2 do pedido original;
- a cobertura média de G2 é 0,19, e a mínima é 0;
- 8 decomposições são de um só lote, com os mesmos requisitos e menos contexto. Por exemplo, `auth`/L2 com RGPD dá um único lote
  AUT+SES+ACC de 27 requisitos, sem fatias.

## 3. O mecanismo

**Parâmetro novo e opcional no prepare: `slice_families`.**
- É uma declaração estrutural de contexto: activa as fatias dessas famílias (entidades G2 e `manual_grounding`) e **nunca
  selecciona requisitos**.
- Não conta como declaração: sozinho continua a dar `needs_input`.
- Um valor fora do vocabulário é declarado inerte, com `valid_values`, como os outros activadores.
- O vocabulário é o conjunto de famílias publicadas no bundle, derivado e nunca escrito à mão. Passa a constar de
  `sbd://toe/activation-vocabulary`.

**Porque não levar as concerns no lote.** As concerns somam categorias, não restringem. Um lote `categories=["ACC"]` com
`concerns=["auth"]` traria também AUT e SES, e a partição deixava de ser uma partição. `slice_families` dá o contexto sem mexer
na selecção.

**Que fatias leva cada lote.** Uma família entra num lote quando uma das concerns activadas pelo pedido original a produz e cobre
uma das categorias do lote. Isto inclui as concerns que vêm de `exposure` e de `data_sensitivity`, pelo seu efeito. Uma família
partilhada por categorias de lotes diferentes vai em ambos: esse contexto repete-se, e o custo mede-se. Uma família do pedido
que não cubra nenhuma categoria da seleção vai no primeiro lote, para a união nunca perder uma fatia.

**Receita do lote.** `with` passa a levar:
- `categories`;
- `slice_families`, quando há;
- `technologies`, `changed_files`, os parâmetros do overlay e `mode`, quando não é `codegen`. Estes já viajam hoje.

A receita executa-se tal e qual, e o payload medido é o que se recebe.

**Nunca um lote único.** Se o empacotamento der um lote só com duas categorias ou mais, o lote divide-se em dois, medidos. O
último lote aberto recebe a última categoria, e o custo declarado continua a ser o medido. Na matriz isto nunca aconteceu, porque
com as fatias o lote único deixa de caber. A regra existe para que a promessa não dependa dos dados.

## 4. O que muda na superfície

- **`prepare_sbd_toe_codegen_context`:**
  - parâmetro novo `slice_families`, opcional e só de contexto;
  - `requirement_ceiling.batches[].with.slice_families`;
  - `derived_from` inalterado.
- **`sbd://toe/activation-vocabulary`:** passa a incluir as famílias de fatia, com o que cada uma activa e as concerns que a
  produzem.
- **Guia de codegen e descrições:** «cada lote é o teu pedido restrito às suas categorias; executa-os e junta-os». Continuam sem
  números de versão.
- **Nada mais muda:** nem o `select`, nem o `full`, nem as respostas prontas que não decompõem.

## 5. O efeito, medido antes de escrever o código

Os 116 casos da decisão 0004, mais quatro casos nomeados: `auth`/L2 com RGPD; auth+logging/L2 com `jwt` e `exposure: public`, o
exemplo dos docs; e as duas variantes de overlay. São 120 casos em `lista` e `standard`. Cada lote foi **executado** e a união
comparada com o payload `full` do pedido original.

| | hoje (0004) | com esta promessa |
|---|---:|---:|
| decomposições | 32 | 32 |
| lotes, no total | 68 | 76 |
| decomposições de **um só lote** | **8** | **0** |
| decomposições cuja união recupera **todas** as entidades G2 do pedido | 6 | **32** |
| cobertura média de G2 da união (mínima) | 0,19 (0,00) | **1,00 (1,00)** |
| decomposições cuja união recupera todas as fatias | 6 | 32 |
| lotes irredutíveis | 0 | 0 |
| violações (lote não pronto, fora do envelope, custo declarado ≠ recebido, recall < 1) | 0 | 0 |
| divisões forçadas de lote único (§3) | — | 0 |
| chamada mais lenta | 464 ms | 482 ms |

**Dois exemplos:**
- **`auth`/L2 com RGPD, `lista`** (o pedido mede 9 347 tk):
  - hoje: **um** lote, AUT+SES+ACC, 27 requisitos, 8 417 tk, sem fatias;
  - depois: AUT+SES com `ACO-IAT` (18 requisitos, 7 200 tk) e ACC com `ACO-IAT` (9 requisitos, 4 833 tk).
- **O exemplo dos docs**, auth+logging/L2 com `jwt` e `exposure: public`, `lista`:
  - hoje: ARC+API+AUT+VAL+LOG+ERR (54 requisitos) e ACC+SES (17), sem fatias;
  - depois: ARC+API+VAL+AUT+ERR com `ACO-ATB`, `ACO-IAT` e `ACO-IVF` (45 requisitos, 8 388 tk), e LOG+ACC+SES com `ACO-IAT` e
    `ACO-SLG` (26 requisitos, 4 882 tk).
  - SES-008, trazido por `jwt`, continua nos dois lotes.

**O preço:** oito lotes a mais em 32 decomposições, porque o contexto de uma família partilhada repete-se nos lotes que a partilham.
É o custo de cada lote ser uma resposta completa por si.

## 6. Como se prova (os testes vêm antes da constante)

1. **Propriedade, sobre a matriz inteira:**
   - toda a decomposição tem dois lotes ou mais;
   - cada lote executado sai pronto, dentro do envelope ou irredutível declarado, e com custo declarado igual ao recebido;
   - a união cobre todos os requisitos, todas as fatias e todas as entidades G2 do pedido original.
2. **`slice_families` nunca muda a selecção:** para qualquer declaração, os mesmos requisitos com e sem `slice_families`.
3. **`slice_families` sozinho dá `needs_input`;** um valor desconhecido é declarado inerte com `valid_values`.
4. **Sem ciclo:** chamar um lote nunca devolve `needs_decomposition`.
5. **Mantêm-se:** `full` byte-idêntico; invariante 3 contra o oráculo; Eixo H 10/10; determinismo; acceptance (TC-F-34 passa a
   verificar também a união do contexto G2).

## 7. Decisão pedida ao lead

Não há pergunta binária: a decisão do lead fixou o quê, e isto é o como. Há um ponto que a promessa assume e que convém ver:

- **O nome e a exposição de `slice_families`.** É um parâmetro público, porque a receita do lote tem de se poder executar
  tal e qual. Proponho mostrá-lo no vocabulário como activador «só de contexto» e não o ensinar como forma de pedir: quem o
  escreve é o servidor, na receita do lote.

---

## 8. Decisão do lead e implementação (2026-09-26, append)

**Decisão (via Orchestrator):** SIM. `slice_families` fica público, declarado no vocabulário como activador «só de contexto»,
não ensinado como forma de pedir, e sozinho devolve `needs_input`.

**Implementado como prometido**, no branch `0.21.2-cost-ceilings`. Dois pontos que a implementação fixou:
1. **A âncora das famílias órfãs** é a categoria de maior custo isolado, medido sem as órfãs (desempate por id). Fica fixada antes
   do empacotamento, porque o custo de uma categoria depende das fatias que leva.
2. **Um valor desconhecido em `slice_families` devolve `needs_input`**, mesmo com uma declaração válida ao lado. Nomeia o valor e
   traz `valid_values.slice_families`. Não se engole: a receita do servidor nunca o produz, e um valor inventado por um cliente não
   deve passar em silêncio.

**Prova:**
- matriz de 120 casos: 0 decomposições de um só lote; cobertura G2 da união 1,00 (mínima 1,00); fatias completas em 32 de 32;
  0 violações; `full` byte-idêntico à 0.21.1 em 60 de 60;
- `prepare-codegen-context.batch-context.test.ts`: casos nomeados, propriedade sobre concerns e trios, selecção invariante por
  família, `needs_input` sozinho e com valor desconhecido, vocabulário;
- TC-F-34, com o exemplo dos docs: contexto G2 43/43;
- vitest 848/848; acceptance 141/16/0/23 PASS; Eixo H 10/10.

**Achado para o lead (anterior, não causado por esta decisão):** `exposure` e `data_sensitivity` activam categorias, mas **nenhuma
fatia**. As concerns que produzem aparecem no trace, mas não entram no mapa concern → família. Um pedido declarado só por eles
(ex.: o caso do avaliador, `exposure: public` + `data_sensitivity: personal`) não tem contexto G2 nem no `full`. Os lotes reproduzem
fielmente o pedido original, como esta decisão promete, e por isso também não têm contexto. Se os activadores largos devem
produzir fatias, é outra decisão.

