# Brief: release 0.20.0-beta.3 (linha beta) — pin formal KG `v1.6.0` (`mcp-stable`), publicação no dist-tag `beta`

**Date:** 2026-08-29
**De:** Pontifex
**Para:** programme lead (registo; autorizou commit directo + tag anotada + publish `beta`) · Codex (linha beta também no pin formal v1.6.0) · Orchestrator (fecho)
**Natureza:** relatório de execução de release (linha beta, não citável; `latest` intocado)
**Espelho da estável:** `agentic/briefs/2026-08-29-pontifex-release-0-10-2-formal-kg-v1.6.0.md` (0.10.2, gitHead `31aa22af`)

## TL;DR

Re-pin `source: release` a partir de `v1.6.0` via `mcp-stable` (`sync-bundle --from-release v1.6.0 --repo SbD-ToE/sbd-toe-knowledge-graph`; sha256 do asset `baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b` verificado contra o `.sha256` do GitHub Release). Conteúdo servido **idêntico** ao dev-build v1.7.0 já verificado nesta linha: diff de `data/` = só o bloco `release` do `run_manifest` (`channel: stable`, `version: v1.6.0`). Smoke ✅, `trace` determinístico ✅ (270/270/270 = beta.2), `prepare` 4 níveis com AGN + OPS-015 ✅, orçamentos ✅ com a tolerância ≤8.700 (f2 `standard`) **ratificada pelo programme lead**. `npm run check` ✅, 723/723 ✅. CHANGELOG beta.3 final, FREEZE-REGISTRY da linha (tabela de prereleases + anomalia `v0.2.5`), disclosure alinhada com master.

## Identificadores (verificados)

| Item | Valor |
|---|---|
| KG release formal | `v1.6.0` (`SbD-ToE/sbd-toe-knowledge-graph`), assets `…-bundle-v1.6.0.zip` + `.sha256`; sha256 **`baf5913b…1d93b`** |
| Pin | `consumed-bundle.json` idêntico a master `31aa22af`: `release_tag: v1.6.0`, `source: release`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`, contrato v1.11, Manual v1.7.0 `d5c2586a` (`SbD-ToE/sbd-toe-manual`), ontologia `84fe8bf6`; `run_manifest.release = {channel: stable, version: v1.6.0}` |
| `sbd://toe/version` | 0.20.0-beta.3 / KG v1.6.0 `baf5913b…` release / v1.11 / Manual v1.7.0 |
| Diff `data/` vs dev-build v1.7.0 (`eac79e6`) | 1 ficheiro, `data/reports/run_manifest.json`, 2 linhas |

## Smoke (servidor `dist/index.js`, stdio)

`consult` L3 **256/27**, `coverage_gaps.requirements_without_control_link = 0` (L1 120/26, L2 231/27 idem) · `resolve_entities` REQ-AGN-001…004 + OPS-015 5/5 · `concerns:["agents"]` → os 4 AGN, 1 controlo directo + 5 derivados · `EX-AUT-003` / `REQ-AUTH-001` → 0 · `REQ-010` → `citation_note` informativa · matriz 256/256 EP.

## Desta linha

- `trace_sbd_toe_graph`: 3 lentes × 2 chamadas byte-iguais; 270/270/270 (= beta.2; `relations.v1` inalterado).
- `prepare_sbd_toe_codegen_context`: «Add an AI agent worker with a kill-switch and audit logging» L2 → REQ-AGN-001…004 + OPS-015 em full/standard/minimal/ultrathin (24 req., 7 controlos; 11.622 / 6.118 / 5.058 / 2.791 tokens).
- **Orçamentos** (`JSON.length/4`): f1 full 18.903 · standard 6.227/6.500 · minimal 5.588/5.800 · ultrathin 3.696/3.870; f2 full 24.792 · standard **8.645 / tolerância 8.700 (ratificada; gate EPIC 8.500 mantido)** · minimal 7.926/8.000 · ultrathin 4.642/4.840. Ids citáveis 111 / 151.

## Nota de higiene — tag `v0.2.5`

`origin` → `8a479c81` (lightweight, «ci: remove NODE_AUTH_TOKEN…», 2026-03-27 18:07:05Z; GitHub Release `v0.2.5` criada nesse instante sobre esse commit). Clone local `sbd-toe-mcp-poc` (estável) → `318b8ee7` («chore: bump to 0.2.5», 18:07:36Z). Commits irmãos (nenhum é antepassado do outro; ambos alcançáveis de master); npm nunca publicou 0.2.5. **Canónica = origin `8a479c81`** (estado publicado). Nada re-apontado; registado no FREEZE-REGISTRY (§Violations / anomalies). Este clone (`_0.20.0`) já está alinhado com origin.

## Ficheiros

`consumed-bundle.json` · `data/reports/run_manifest.json` · `CHANGELOG.md` (beta.3 final: pin formal + linhagem v1.6.7 → v1.7.0 → v1.6.0; entrada 0.10.2 final de master) · `FREEZE-REGISTRY.md` (cópia da linha beta: base master `e0f17c0` + tabela de prereleases + estado da linha + anomalia `v0.2.5`) · `AI-USE-DISCLOSURE.md` (alinhada com master) · `prepare-codegen-context.budget.test.ts` + `EPIC.md` (tolerância ratificada) · este brief + tracking.

## Pontos seguintes (executados após o push — ver update no em-curso)

Tag anotada `v0.20.0-beta.3` no commit em `origin/0.20-beta` → run `Release` (`release.yml`: prerelease → GitHub pre-release + `npm publish --tag beta`) → `npm view @shiftleftpt/sbd-toe-mcp dist-tags gitHead` (`beta` = 0.20.0-beta.3; `latest` = 0.10.2 inalterado) → commit de fecho no registo.
