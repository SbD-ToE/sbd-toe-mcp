# Brief: linha beta — pin dev-build KG v2.2 (camada de ligações v3, contrato v1.13) + re-baseline de aceitação — verificação pré-G-b (absorção de master `fa62f29b`, #53)

**Date:** 2026-08-30
**De:** Pontifex
**Para:** Orchestrator (as duas linhas verificadas no dev-build v2.2 pré-G-b) · Codex (visibilidade) · programme lead (ratificar tectos provisórios de orçamento 8.800/8.100)
**Espelho da estável:** commit master `fa62f29b63d5580135c7f6d02e8bd25ff8ef3be8` (#53)
**Natureza:** relatório de execução (linha beta, dev-build; **sem release, sem tag, sem npm, sem mcp-stable**)

## TL;DR

`fa62f29` cherry-picked para `0.20-beta`; conflito único em `consumed-bundle.json` (resolvido para o lado de master); `sync-bundle` do snapshot v2.2 idempotente (sha256 `08d87f2e…dc628` verificado; contrato v1.13). SPARQL/`detail`/`concerns:["agents"]` intactos (o #53 não toca em `src/`). **`eval:acceptance` gate PASS na beta com o mesmo rollup da estável** (104: 61/20/0/23; TC-F-08/09/10 PASS). `trace` determinístico e byte-igual a beta.2 (270/270/270; fonte `requirement_control_links` 265→281, teste re-baselined). `prepare` nos 4 níveis: AGN ×4 (+OPS-015) e **controlos directos com C1 identity para AUT** (não governança) — coerente com TC-F-10. Desvio `threat_landscape(L2,auth)` **159→77 reproduz-se igual** (logging 15; no-concern 233 inalterado). Orçamentos: re-baseline documentado (f2 standard 8.746 / minimal 8.019 — tectos provisórios 8.800/8.100 **pendentes de ratificação**; gates anteriores mantidos no registo). `npm run check` ✅ · 708/708 ✅.

## Identificadores (verificados)

| Item | Valor |
|---|---|
| Origem (master) | `fa62f29b63d5580135c7f6d02e8bd25ff8ef3be8` (#53) |
| KG tag (dev-build) | `kg-v1-manual-v1.7.1-aligned-2026-08-30-v2.2` |
| sha256 (calculado = sidecar = despacho) | `08d87f2e08d22edcdbf44d603ec7b267eb676c119ae84f3c569b5aff31dbc628` |
| Pin | idêntico a master: `source: dev-build`, contrato **v1.13**, Manual v1.7.1 `8e03454c`, ontologia `84fe8bf6`, `pinned_at` 2026-08-30 |
| Dados | `requirement_control_links` 265 → **281** (camada curada v3); requisitos 256/27; gaps 0/0/0 |

## `eval:acceptance` (registo `docs/acceptance-runs/2026-08-30-devbuild-v2.2-v0.20.0-beta.4-acceptance.{md,json}`)

| Axis | Total | PASS | PART | FAIL | SKIP |
|---|---|---|---|---|---|
| A — Tool coverage | 16 | 13 | 3 | 0 | 0 |
| B — By role | 16 | 13 | 3 | 0 | 0 |
| C — By surface (AC) | 28 | 2 | 5 | 0 | 21 |
| D — Negatives / invariants | 17 | 11 | 4 | 0 | 2 |
| E — Regression (gate) | 17 | 13 | 4 | 0 | 0 |
| F — 0.10.0 tools + G1 | 10 | 9 | 1 | 0 | 0 |
| **Total** | **104** | **61** | **20** | **0** | **23** |

Gate **PASS** (= estável). TC-E-01/02 PART (`mitigated_by` estrutural 15/15 e 77/77; `associated_controls` textual — owner `graph`). TC-F-08: 281 links, curated 12+3, AUT-006/007/008 → C1, AUT-010 → monitoring. TC-F-09: `data_protection` servido (1 controlo, 15 links, activo em consult L3). TC-F-10: 10 AUT → C1, nunca CAP/DEV. 21/22 tools (`trace_sbd_toe_graph` sem cenário — Axis G continua pendente). Nota operacional: a 1ª execução, sem `--stamp` qualificado, escreveu por cima do registo beta.4 committed; restaurado de HEAD e re-executado como `…-devbuild-v2.2-v0.20.0-beta.4-…` (padrão de master).

## Desvios (reportados)

1. **`get_threat_landscape(L2, auth)` 159 → 77 — reproduz-se igual nesta linha** (C1 publica `chapter_ids` diferentes do controlo IDN reformado); logging 15; no-concern 233 inalterado. Informativo para G-b; nenhuma alteração de serving.
2. **Orçamentos (re-baseline documentado, não ratificado):** f2 `standard` **8.746** > 8.700 ratificado (tecto provisório 8.800) e f2 `minimal` **8.019** > 8.000 hard s3b (tecto provisório 8.100); secção `activated_scope` do `minimal` re-medida (f1 3.243→orç. 3.290; f2 5.127→orç. 5.180). Causa: a camada v3 muda os controlos directos das fixtures (ids/descriptions mais longos). Gates históricos mantidos no registo (`KNOWN_TOTAL_DEVIATIONS`); **ask: ratificação do programme lead**. f1 e ultrathin dentro dos gates; ids citáveis 112/151 inalterados.
3. Projecção RDF: fonte `requirement_control_links` 265→281 — lentes v1 inalteradas (270/270/270, byte-igual a beta.2).

## Pendente

1. Programme lead: ratificar tectos 8.800 (standard f2) / 8.100 (minimal f2) ou mandar re-desenhar antes do G-b.
2. Orchestrator/DevelopmentGovernance: cenário Axis G (`trace_sbd_toe_graph`) — segue por resolver; TC-F-09/10 a propor no doc de governança (nota do #53).
3. Sem release desta linha até decisão pós-G-b.
