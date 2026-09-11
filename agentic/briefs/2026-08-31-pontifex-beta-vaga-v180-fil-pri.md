# Brief: linha beta — vaga v1.8.0 (FIL/PRI, contrato v1.15) absorvida de master `17f158e7` (#61); casos-ouro 10/10 com 4 transições lacuna→coberto; tectos f2 propostos 9.200/8.450

**Date:** 2026-08-31
**De:** Pontifex
**Para:** programme lead (**ask: ratificar tectos f2 standard ≤9.200 / minimal ≤8.450**, = estável) · Orchestrator (registo: beta.6 publicada após o lado-a-lado; Axis G segue aberto) · Codex (visibilidade)
**Espelho da estável:** `agentic/briefs/2026-08-31-pontifex-v180-fil-pri-servidos.md`
**Natureza:** relatório de execução (linha beta; **sem tag, sem npm** — lote formal decide-se depois)

## TL;DR

`17f158e` cherry-picked (conflitos: consumed-bundle → master; CHANGELOG/FREEZE/budget → beta, com absorção manual dos re-baselines; `src/index.ts` não tocado pelo #61). Pin dev-build `kg-v1-manual-v1.8.0-aligned-2026-08-31` (sha256 `ad0fc96c…4dbf` verificado; **v1.15**; 273 req/29 cat; 305 links) **idêntico à estável**; `sync-bundle` idempotente. Sinais FIL/PRI, R-image, SES-008-por-tecnologia e cenários TC-F-14/15 absorvidos; dieta/orçamentos/snapshots/heurísticas agents da beta mantidos. **Casos-ouro 10/10** com as 4 transições lacuna→coberto; eval 119: 78/18/**0**/23, gate E sem regressão; 727/727; check ✅. **Orçamentos f2 excedem os ratificados → proposta 9.200/8.450** (medições = estável). Nota: entretanto a beta.6 foi publicada (tag `322c38f4`, npm `beta`) após o lado-a-lado — esta vaga fica Unreleased sobre ela.

## Casos-ouro da beta (`docs/acceptance-runs/2026-08-31-v180-axis-h-selection-v0.20.0-beta.6.{md,json}`)

**10 PASS / 0 / 0** — cobertura 100%, precisão-estrita 100%, oráculo intocado. Transições lacuna→coberto: **GC-01 → FIL** (29/29), **GC-06 → PRI** (16/16), **GC-08 → SES-008 por regra nomeada** (35/35, levelGuard exemption declarada no runner), **GC-10 → INT-009…012** (10/10). Ao vivo: FIL ×8 e PRI ×5 nos 4 níveis de `detail`; R-image: docker → CNT ×11/FIL 0, photo → FIL ×8/CNT 0.

## `eval:acceptance` (`…-v180-v0.20.0-beta.6-acceptance`)

119 cenários, 96 executados: **78/18/0/23**; gate E PASS (15/2/0, sem regressão); TC-F-14/15 PASS; Axis F 15 (14/1); Axis H 10/10. 22/23 tools (Axis G para `trace_sbd_toe_graph` segue aberto). `trace` determinístico; fonte da projecção 282→**305** (141 regra + 148 recalc + 16 curados; re-baseline documentado no teste).

## Orçamentos — **pedido de ratificação**

| | full | standard | minimal | ultrathin | ids |
|---|---|---|---|---|---|
| f1 (inalterada) | 18.746 | 6.110/6.500 | 5.463/5.800 | 3.685/3.870 | 104 |
| f2 (endpoint de upload — FIL aplica-se de facto) | 25.165 | **9.102** > 8.800 ratificado | **8.375** > 8.100 ratificado | 4.829/4.840 | 152 |

Medições **iguais às da estável** (que re-baselinou os gates para 9.200/8.450). Na beta: gates ratificados 8.800/8.100 mantidos no registo; **tectos propostos 9.200/8.450** em `KNOWN_TOTAL_DEVIATIONS` com causa (FIL ×8 + controlo directo na fixture; citations 143→152) — **ratificação do programme lead pendente**. Secções re-baselined (= estável): rest-full 1.600, activated_scope 5.500/5.500/2.500. Snapshots: os de master verificados byte-iguais ao output desta linha (`-u` sem alterações); diff = FIL + proveniência (`manual_commit_sha` → `f78dfe73`).

## Diferenças face à estável

1. Beta mantém dieta/orçamentos próprios: gates ratificados + desvios propostos vs gates re-fixados directamente na estável (8.900→9.200 / 8.200→8.450) — medições idênticas; harmonização continua em aberto (já sinalizada no ciclo MP1).
2. `src/index.ts` intacto (o #61 não o toca); SPARQL/`trace_sbd_toe_graph` e `concerns:["agents"]` como estavam.
3. Suites: beta 727/727 (44 ficheiros) vs estável 689/689; ambos com os mesmos re-baselines de contagens (273/29, 305, 152).
4. Registo do facto consumado: tags `v0.11.0` (`102b8166`) e `v0.20.0-beta.6` (`322c38f4`) cortadas após o lado-a-lado; npm `latest = 0.11.0`, `beta = 0.20.0-beta.6` (ainda serve v1.7.0 formal — esta vaga é Unreleased).

## Pendente

1. **Programme lead:** ratificar 9.200/8.450 (ou harmonizar de vez os tectos entre linhas).
2. Lote formal: KG v1.9.0 → 0.12.0 / próxima beta (lead).
3. Axis G (`trace_sbd_toe_graph`).
