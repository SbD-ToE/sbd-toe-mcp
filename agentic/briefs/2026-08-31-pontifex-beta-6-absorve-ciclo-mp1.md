# Brief: linha beta absorve o ciclo MP1 completo (P2+P3+R3 + base Axis H) — 0.20.0-beta.6 preparada; tag só após verificação lado-a-lado do Orchestrator

**Date:** 2026-08-31
**De:** Pontifex
**Para:** Orchestrator (**ask: verificação lado-a-lado 0.11.0 ↔ 0.20.0-beta.6** — depois disso as duas tags) · programme lead (registo; nota sobre gates) · Codex (sem impacto de dados)
**Natureza:** relatório de execução (linha beta; **sem tag, sem npm**)

## TL;DR

Três squashes absorvidos por ordem (`ef52089`, `7368dcb`, `102b816`) + a base do Eixo H (#56, `axis-h.mjs`/`run-axis-h-selection.mjs`/`eval:axis-h`) que os squashes assumem e não estava nos três. Regras de conflito cumpridas: dieta = versão beta (orçamentos ratificados 8.800/8.100, snapshots, `requirementCategoryOf`, descrições do schema); motor manda nos `agents` sem duplicação (R1 nomeada em `selection_trace`; `concerns:["agents"]` e heurísticas preservadas como fonte de sinal); `index.ts` à mão com SPARQL/`trace_sbd_toe_graph` intactos. **Eixo H 10/10**; eval 117 cenários 76/18/**0**/23, gate E PASS sem regressão; TC-F-13 PASS. Orçamentos: **totais da beta = medições da estável** (8.446/5.463/7.720); único re-baseline = secção `rest` (sumário `selection` do motor) 980/985/1055 (= estável). **Sem pedido de ratificação.** 727/727. Bump 0.20.0-beta.6 «prepared».

## Eixo H (beta) — `docs/acceptance-runs/2026-08-31-axis-h-selection-v0.20.0-beta.6.{md,json}`

**10 PASS / 0 PART / 0 FAIL** — cobertura 100%, precisão-estrita 100%, oráculo intocado (GC-09 negativo segurado pelo scope gate; GC-10 100%/100%). Igual ao P3/R3 da estável.

## `eval:acceptance` — `…/2026-08-31-v0.20.0-beta.6-acceptance.{md,json}`

| Axis | Total | PASS | PART | FAIL | SKIP |
|---|---|---|---|---|---|
| A / B | 16+16 | 13+13 | 3+3 | 0 | 0 |
| C | 28 | 2 | 5 | 0 | 21 |
| D | 17 | 11 | 4 | 0 | 2 |
| E (gate) | 17 | 15 | 2 | 0 | 0 |
| F | 13 | 12 | 1 | 0 | 0 |
| **H** | **10** | **10** | 0 | 0 | 0 |
| **Total** | **117** | **76** | **18** | **0** | **23** |

Gate E sem regressão; TC-F-11 (walk CNT/DPL, AUT narrowed com razão), TC-F-12 (AGN ×4 + overlay extend), **TC-F-13 (caminho ensinado: SES narrowed → recuperado com o sinal de sessão; next[] → prepare+consult)** PASS. **22/23 tools** — `trace_sbd_toe_graph` (só desta linha) sem cenário (Axis G).

## Orçamentos medidos (4 níveis; método `JSON.length/4`)

| | full | standard | minimal | ultrathin | ids |
|---|---|---|---|---|---|
| f1 | 18.745 | **6.109**/6.500 | **5.463**/5.800 | **3.684**/3.870 | 104 |
| f2 | 24.544 | **8.446**/8.800 | **7.720**/8.100 | **4.581**/4.840 | 143 |

= medições da estável, exactamente. **Não pedem ratificação** (dentro dos tectos ratificados e até dos gates originais 8.500/8.000 — repor os originais é decisão do lead, sinalizada, não tomada). Único re-baseline: secção `rest` nos níveis dietados (sumário `selection` do MP1 vive aí): 850→**980**, 853→**985**, 935→**1.055** — valores exactos da estável, causa documentada no teste. Snapshots regenerados: −8 SES por fixture (R2) + bloco `selection` — diff puro, igual à estável.

## Diferenças face à estável (nesta absorção)

1. **Dieta:** a beta mantém a sua versão (a estável portou a nossa); as descrições `detail`/`include_relations` da beta ficam (a nota da estável sobre o `trace` não se aplica — a tool existe aqui). Gates: beta 8.800/8.100 ratificados vs estável 8.900/5.950/8.200 fixados por medição — **as linhas têm tectos formalmente diferentes com as mesmas medições**; a harmonizar pelo lead se quiser (sinalizado).
2. **`agents`:** beta preserva `concerns:["agents"]` no `prepare` (a estável ganhou-o via D3); motor único, sem duplicação de heurísticas (verificado: entradas únicas no léxico).
3. Resolução extra declarada: `scenarios.mjs`/runners tomados de master (o nosso lado não tinha nada beta-específico); a base #56 veio de master por `checkout` dentro da mesma absorção (os três squashes não a continham).
4. Sem alterações no served bundle (v1.7.0 intacto; `trace` 270/270/270 = beta.2).

## Pendente

1. **Orchestrator:** verificação lado-a-lado 0.11.0 ↔ 0.20.0-beta.6 → autoriza as duas tags (v0.11.0 e v0.20.0-beta.6).
2. Axis G (`trace_sbd_toe_graph`) no catálogo — segue por criar.
3. Lead (opcional): harmonizar tectos entre linhas / repor gates originais.
