# Brief: release 0.20.0-beta.4 (linha beta) — absorção de master `8ade07f` (#49) + pin formal KG `v1.6.1` (`mcp-stable`), publicação no dist-tag `beta`

**Date:** 2026-08-30
**De:** Pontifex
**Para:** programme lead (registo; autorizou commit directo + tag + publish `beta`) · Codex (as duas linhas em v1.6.1) · Orchestrator (fecho; follow-up Axis G)
**Natureza:** relatório de execução de release (linha beta, não citável; `latest` = 0.10.3 intocado)
**Espelho da estável:** `agentic/briefs/2026-08-30-pontifex-release-0-10-3-formal-kg-v1.6.1.md`

## TL;DR

`8ade07f` (#49: runner de aceitação, correcção dos filtros de `query_sbd_toe_entities`, limpeza Algolia) cherry-picked para `0.20-beta` — `src/index.ts` juntou limpo (só descrições do schema de `query_sbd_toe_entities`); SPARQL/`detail`/`concerns:["agents"]` e o elisor `requirementCategoryOf` intocados; só o CHANGELOG foi resolvido à mão. Trazidos também de master (#51) os 4 ficheiros que acompanham o bundle v1.6.1: `scripts/acceptance/scenarios.mjs` (critério TC-E-01/02 revisto, TC-F-08), `run-acceptance-scenarios.mjs` (`--stamp`), `requirement-id.test.ts`, `req-agn-serving.test.ts`. Re-pin `source: release` **v1.6.1** via `mcp-stable` (sha256 `df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b` verificado; contrato v1.12; Manual v1.7.1 `8e03454c`); pin idêntico a master `06f8bba`. **`eval:acceptance` gate PASS** (102 cenários; 59/20/0/23). `trace` determinístico 270/270/270. `prepare` 4 níveis com `agents` ✅. Orçamentos dentro dos limites (f2 `standard` 8.617 ≤ 8.700 ratificado). `npm run check` ✅, 708/708 ✅. Bump 0.20.0-beta.4, CHANGELOG, FREEZE-REGISTRY (linha estável sincronizada de master + beta.4), disclosure.

## Identificadores (verificados)

| Item | Valor |
|---|---|
| Origem (master) | `8ade07f1018d986816b8dadb8c5bc29be6c9fdf3` (#49) + ficheiros de acompanhamento de `06f8bba` (#51) |
| KG release formal | `v1.6.1` (`SbD-ToE/sbd-toe-knowledge-graph`), sha256 **`df6920cb…f547b`** = `.sha256` do release |
| Pin | `release_tag: v1.6.1`, `source: release`, contrato **v1.12** (§1.19 camada curada v2), Manual **v1.7.1** `8e03454c5137ded5a0a88ac2b91b1c4d6ee8fdac`, ontologia `84fe8bf6`, `pinned_at` 2026-08-30 |
| Dados | `requirement_control_links` 263 → **265**, gaps 0/0/0; requisitos 256/27; EP 256/256 |

## `eval:acceptance` (registo em `docs/acceptance-runs/2026-08-30-v0.20.0-beta.4-acceptance.{md,json}`)

102 cenários, 79 executados: **59 PASS · 20 PART · 0 FAIL · 23 SKIP** (21 ACs comerciais + 2 com LLM cliente); **gate Axis E PASS** (TC-E-01/02 PART: `mitigated_by` estrutural 15/15 e 159/159, `associated_controls` textual — owner `graph`); Axis F 7/7 (TC-F-08: 265 links, gaps 0/0/0, AUT-007/008 → identity, AUT-010 → monitoring). Ferramentas: **21/22** — `trace_sbd_toe_graph` (só desta linha) não é exercida pelo conjunto da estável → **follow-up:** cenário Axis G para a lente SPARQL (determinismo + paginação + anchor).

## Desta linha

- `trace_sbd_toe_graph`: 3 lentes × 2 chamadas byte-iguais; 270/270/270 (= beta.2/3).
- `prepare_sbd_toe_codegen_context` `concerns:["agents","auth"]` L3: REQ-AGN-001…004 em full/standard/minimal/ultrathin (11.760 / 4.998 / 4.467 / 2.899 tokens); heurística «AI agent … kill-switch … audit logging» L2 → AGN ×4 + OPS-015 nos 4 níveis.
- **Orçamentos:** f1 full 18.992 · standard **6.280**/6.500 · minimal **5.641**/5.800 · ultrathin **3.746**/3.870 (camada curada v2 acrescenta 1 controlo directo → 112 ids, re-baseline); f2 full 24.790 · standard **8.617**/8.700 ratificado (gate 8.500 mantido; −28 vs v1.6.0) · minimal **7.898**/8.000 · ultrathin **4.642**/4.840 · 151 ids.
- Testes data-driven re-baselined: projecção RDF 263 → 265; snapshots (8) regenerados; `citationIds` f1 111 → 112; EPIC.md + measure-script anotados.

## Ficheiros

Cherry-pick #49 (`scripts/acceptance/`, `run-acceptance-scenarios.mjs`, `structured-tools.*`, `plan-repo-governance.*`, `docs/acceptance-runs/` da 0.10.2, briefs #49) · 4 ficheiros #51 · `consumed-bundle.json` + 20 ficheiros de `data/` · `package.json`/lock (0.20.0-beta.4) · `CHANGELOG.md` · `FREEZE-REGISTRY.md` · `AI-USE-DISCLOSURE.md` (delta de master) · testes/snapshots/EPIC · registo de aceitação beta.4 · este brief + tracking.

## Pontos seguintes (após o push — ver update no em-curso)

Tag anotada `v0.20.0-beta.4` → run `Release` → `npm view` (`beta` = 0.20.0-beta.4; `latest` = 0.10.3 inalterado) → commit de fecho.
