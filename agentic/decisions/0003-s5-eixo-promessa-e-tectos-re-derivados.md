# 0003 — §5: o eixo, a promessa escrita, e os tectos re-derivados

**Linha:** 0.21 (épico da forma da resposta) · **Data:** 2026-09-11 · **Autor:** Pontifex
**Despacho:** `sbd-ai-runtime/handover/em-curso/2026-09-11-orchestrator-pontifex-despacho-forma-da-resposta.md`
**Estado:** PROPOSTA — **gate do programme lead antes da §1**. Nada foi ligado ao servidor.
**Medição:** `scripts/measure/s5-form-projection.mjs` (reprodutível: `npm run build && node scripts/measure/s5-form-projection.mjs`)

---

## 1. O eixo muda de natureza

O eixo era **«quanto detalhe»** e media codificação: os níveis diziam o mesmo por extenso ou por
referência, e o mais barato pagava a diferença cortando a descrição publicada. O eixo passa a ser
**«o que está inline e o que está por referência»**, e uma coisa deixa de estar no eixo: a
**descrição nunca sai, em nenhum nível**.

Consequência directa: o `ultrathin` **reforma-se**. A sua razão documentada de existir é
`includeDescriptions: false` — «requirements/controls WITHOUT the published description». Quando a
descrição passa a inegociável, o nível fica sem conteúdo próprio: seria o `lista` com outro nome.
Ficam **três**: `lista`, `standard`, `full`.

## 2. A promessa de cada nível — escrita primeiro, e sem falar em tokens

> **`lista`** — Todo o requisito activado vem completo e verbatim: id, nome, **descrição publicada**,
> como se verifica e que prova se espera. Com ele vêm os ids que podes citar, as instruções que te
> proíbem de inventar ids, e o aviso do que **não** declaraste e mudaria o conjunto. O detalhe da
> adjacência e o ancoramento no manual obtêm-se por referência — nada se perde, muda de sítio.

> **`standard`** — O que a `lista` promete, e mais: a adjacência **inteira nomeada** em vez de
> contada — cada sinal do vocabulário que não declaraste e que mudaria o conjunto, com o que
> acrescentaria.

> **`full`** — O que o `standard` promete, e mais: o **ancoramento no manual verbatim, inline** —
> as passagens que sustentam o que foi activado. As relações do grafo ficam por referência.
> É o nível da completude: **não promete caber, promete não faltar.**

Os três passam o teste do despacho: nenhuma destas frases precisa da palavra «tokens» para dizer o
que o nível é. O `ultrathin` não passa — a sua frase honesta seria «o `lista`, mas sem a descrição»,
e essa deixou de ser uma escolha que se ofereça.

## 3. De onde vem o envelope (e porque NÃO se re-deriva)

Um envelope de tokens **não é propriedade do nosso conteúdo — é propriedade do consumidor**: quanto
pode custar uma volta ao agente que está a gerar código ao lado. Mudar o que servimos não muda o que
o consumidor aguenta. Por isso o envelope **herda-se**, e o que se **re-deriva é o tecto (N)**,
porque a base e o custo por requisito mudaram.

- **`lista`** herda **8.450** — o envelope do pedido barato, ratificado pelo lead (3 sims, 2026-08-31).
- **`standard`** mantém **9.200** — ratificado e harmonizado entre linhas.
- **`ultrathin`** leva consigo o seu **4.840**: esse número era o preço de não ter descrição.
- **`full`** não tem envelope — a sua promessa é completude, não uma classe de custo. **A medição
  proíbe-lhe um tecto linear:** os residuais do modelo linear no `full` chegam a **+2.753 tk**
  (o `manual_grounding` não escala com o número de requisitos). Um tecto derivado de uma recta que
  não descreve o nível seria um número inventado. O `full` **declara o preço** (`size_estimate`) em
  vez de o recusar.

## 4. A medição (forma actual vs forma nova projectada)

Projecção construída sobre os **mesmos dados publicados** que o `prepare` já serve, com o módulo de
adjacência real (`a32ca44`): fusão da §1 (`id+name+description+verify+evidence`), cortes da §3
(`relations` fora, `citation_map` invertido em legenda+lista), adjacência da §2 sempre presente.

| caso (declarado) | reqs | ultrathin | minimal | standard | full ‖ | **lista** | **standard** | **full** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `auth`/L2 (base da avaliação externa) | 27 | 2 626 | 3 879 | 4 403 | 11 148 ‖ | **3 900** | **4 385** | **6 127** |
| `auth+validation`/L2 | 42 | 3 527 | 5 282 | 5 913 | 18 311 ‖ | 5 017 | 5 517 | 9 097 |
| upload/L2 (fixture2 do EPIC) | 42 | 3 753 | 5 738 | 6 374 | 18 787 ‖ | 5 427 | 5 912 | 9 493 |
| `auth+val+log`/L3 | 53 | 4 132 | 6 217 | 6 944 | 23 443 ‖ | 5 593 | 6 050 | 10 971 |
| API pública/L3 + activadores | 89 | — | — | — | 17 009 ‖ | 8 921 | 9 266 | 11 114 |

*(Na linha de 89 os níveis dietados actuais devolvem o bloqueio declarado da 0.19.4 — 89 > tecto 78.)*

**O resultado que decide a vaga:** na base da avaliação externa, o `minimal` de hoje custa **3 879 tk
e não tem descrição**; a `lista` de amanhã custa **3 900 tk e traz descrição, verificação e prova**.
Mesmo preço, conteúdo que serve. E o `full` cai **11 148 → 6 127 (−45%)** sem perder nada declarado.

Regressão sobre os extremos (27 → 89), a mesma técnica do 0.19.4:

| nível | base medida | custo/req |
|---|---:|---:|
| `lista` | 1 713 tk | 81,0 tk |
| `standard` | 2 259 tk | 78,7 tk |
| `full` | 3 955 tk | 80,4 tk *(não-linear — ver §3)* |

## 5. Os tectos, derivados da promessa com a mesma fórmula

`N = floor((envelope − base) / custo_por_requisito)`

| nível | envelope | base | custo/req | **tecto N** | custo em N | custo em N+1 |
|---|---:|---:|---:|---:|---:|---:|
| `lista` | 8 450 | 1 713 | 81,0 | **83** | 8 435 ✓ | 8 516 ✗ |
| `standard` | 9 200 | 2 259 | 78,7 | **88** | 9 187 ✓ | 9 266 ✗ |
| `full` | — | 3 955 | — | **sem tecto** | declara `size_estimate` | — |

**Hoje:** `minimal` 78 · `standard` 81 · `ultrathin` 86.
**Amanhã:** `lista` **83** · `standard` **88**.

O tecto **sobe** ao mesmo tempo que o conteúdo cresce, e não é paradoxo: o que saiu foi aparato —
as 49 `relations` que não apontam para fora do âmbito, o `citation_map` a repetir a mesma proveniência
56 vezes, e o bloco `evidence_patterns` que duplicava a chave do requisito para o modelo fazer o join
à mão. Pagava-se codificação; passa a pagar-se conteúdo, e cabe mais.

Acima do tecto continua a valer o que a 0.19.4 construiu: **needs_decomposition declarado** — o
limite, o porquê (projecção vs envelope) e a receita executável de divisão. Não muda o mecanismo,
mudam os números.

## 6. Limites declarados (o que este documento NÃO prova)

1. **Variância entre casos do mesmo tamanho: ±~400 tk.** Dois casos de 42 requisitos medem 5 017 e
   5 427 na `lista` (controlos, slices e ancoramento variam por caso). A recta é a média, não o
   pior caso — por isso **os gates das duas fixtures baseline continuam a ser o teste definitivo**,
   como no 0.19.4. O tecto é o contrato anunciado; a fixture é a prova.
2. **`lista` ↔ `standard` são finos: 485 tk (12%).** A única diferença é a adjacência detalhada
   (37 entradas ≈ 481 tk). O separador a sério entre níveis é o `manual_grounding` (1 733 tk no caso
   base) — e esse está **em aberto na §4 até o Mensor medir**. Se a medição do Mensor mandar o
   `manual_grounding` por referência em todos os níveis, `standard` e `full` colapsam e o eixo fica
   com **dois** níveis. Declaro-o; não o decido.
3. **É uma projecção, não o servidor.** Usa os dados reais e o módulo de adjacência real, mas a
   serialização exacta da §1 pode mover estes números alguns porcento. **Re-medem-se com o mesmo
   script quando a §1 aterrar**, e os tectos só se ligam nessa altura.
4. **A prova substituta do despacho aplica-se à §1/§3, não a este documento:** aqui não muda nenhum
   id. Quando a forma mudar, o conjunto de **ids citáveis** para o mesmo input tem de ser idêntico
   ao da 0.20.0 (invariante 3).

## 7. O que fica gated

Esta proposta **não liga nada**: `payload-ceilings.ts` continua com 78/81/86 a servir a forma actual,
porque uma constante que descreva uma forma que o servidor não tem é a mentira que esta casa não
comete. Com a ratificação do lead, a §1 entra e traz consigo:
`ultrathin` retirado do schema · os três níveis · `lista` 83 e `standard` 88 nas constantes ·
`full` a declarar `size_estimate` · re-medição pelo mesmo script, anexada ao commit da §1.
