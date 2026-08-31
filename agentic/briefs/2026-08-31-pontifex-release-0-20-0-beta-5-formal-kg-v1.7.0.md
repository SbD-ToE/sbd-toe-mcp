# Brief: release 0.20.0-beta.5 (linha beta) — absorção de master `2937236d` (#54: pin formal KG v1.7.0, routing G-b, ids estruturais de controlo em threats) + gates ratificados — publicação no dist-tag `beta`

**Date:** 2026-08-31
**De:** Pontifex
**Para:** programme lead (registo; autorizou tag/publish e ratificou os gates 8.800/8.100) · Codex (as duas linhas no formal v1.7.0) · Orchestrator (fecho; Axis G segue aberto)
**Espelho da estável:** `agentic/briefs/2026-08-30-pontifex-release-0-10-4-formal-kg-v1.7.0.md` (0.10.4)
**Natureza:** relatório de execução de release (linha beta, não citável; `latest` = 0.10.4 intocado)

## TL;DR

`2937236` cherry-picked para `0.20-beta` (conflitos: CHANGELOG, FREEZE-REGISTRY, package*.json — resolvidos à mão; `src/index.ts` e `consumed-bundle.json` limpos; SPARQL/`detail`/`agents`/`requirementCategoryOf` intactos). Pin **formal `v1.7.0`** via `mcp-stable` (asset sha256 `29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a` verificado; contrato **v1.14** §1.21; ontologia `sbdtoe-ontology-v2.2`; curated links **282**, 12+4); `sync-bundle --from-release` idempotente. Routing G-b verificado ao vivo (auth **95**; no-concern 233). **Gates de payload re-fixados nos tectos ratificados** (f2 standard ≤8.800; minimal ≤8.100) e `KNOWN_TOTAL_DEVIATIONS` esvaziado. `eval:acceptance` gate **PASS com TC-E-01/02 promovidos** (104: 63/18/0/23 = rollup da estável). 712/712 ✅. Bump 0.20.0-beta.5.

## Identificadores

| Item | Valor |
|---|---|
| Origem (master) | `2937236d7521d72be140dbc4d9111dae211eb14b` (#54, squash) |
| KG release formal | `v1.7.0` → commit `894af32a` = `mcp-stable`; asset sha256 `29156b86…fb9a` |
| Pin | idêntico a master: contrato v1.14, ontologia `sbdtoe-ontology-v2.2`, Manual v1.7.1 `8e03454c`, `run_manifest.release = {stable, v1.7.0}` |
| Dados | curated links 281 → **282**; threats 233/233 com `associated_control_ids` |

## `eval:acceptance` (registo `docs/acceptance-runs/2026-08-31-v0.20.0-beta.5-acceptance.{md,json}`)

| Axis | Total | PASS | PART | FAIL | SKIP |
|---|---|---|---|---|---|
| A | 16 | 13 | 3 | 0 | 0 |
| B | 16 | 13 | 3 | 0 | 0 |
| C | 28 | 2 | 5 | 0 | 21 |
| D | 17 | 11 | 4 | 0 | 2 |
| E (gate) | 17 | **15** | 2 | 0 | 0 |
| F | 10 | 9 | 1 | 0 | 0 |
| **Total** | **104** | **63** | **18** | **0** | **23** |

Gate **PASS**; TC-E-01/02 **PASS** sob o critério #54. 21/22 tools (Axis G para `trace_sbd_toe_graph` segue pendente).

## Verificações desta linha

- `trace_sbd_toe_graph`: determinístico, 270/270/270 byte-igual a beta.2 (fonte `requirement_control_links` 281→282, teste re-baselined).
- `prepare` 4 níveis (`agents+auth` L3 e kill-switch L2): AGN ×4 (+OPS-015); **controlos directos incluem C1 identity**; payloads 12.115/5.142/4.603/3.013 e 11.921/6.379/5.307/2.903.
- **Orçamentos dentro dos tectos ratificados:** f1 6.409/5.763/3.775 (gates 6.500/5.800/3.870); f2 **8.746/8.800** · **8.019/8.100** · 4.671/4.840; ids 112/151.
- `threat_landscape` L2: auth **95**, logging 15, no-concern **233** (= estável pós-routing).
- Suite **712/712**; divergência beta declarada: timeout 20s no teste de citações legadas do `req-agn-serving` (3 retrievals semânticos ≈5,1s sob a suite v2 de 42 ficheiros; correcto em isolamento).
- Correcção declarada: a nota de re-baseline do EPIC alegada pelo commit `97d28be` (dev-build v2.2) estava em falta (falha do meu script); reposta e consolidada com a ratificação.

## Pontos seguintes (após o push — ver update no em-curso)

Tag anotada `v0.20.0-beta.5` → run `Release` → `npm view` (`beta` = 0.20.0-beta.5; `latest` = 0.10.4) → commit de fecho (SHA no registo, em-curso → done).
