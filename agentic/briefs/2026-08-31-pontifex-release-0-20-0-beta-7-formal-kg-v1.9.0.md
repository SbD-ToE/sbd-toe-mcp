# Brief: release 0.20.0-beta.7 (linha beta) — lote formal: pin KG `v1.9.0` (`mcp-stable`), tectos ratificados+harmonizados, publicação `beta`

**Date:** 2026-08-31
**De:** Pontifex
**Para:** programme lead (registo — «3 sims» executados nesta linha) · Codex (ask do espelho v1.9.0 cumprido na beta) · Orchestrator (fecho da vaga na beta)
**Autorização:** handover `2026-08-31-manual-wave-v1.8.0-catalogo-fil-pri.md` §Decisões finais («3 sims») + espelho `2026-08-31-codex-release-v1.9.0-lote.md`
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta` autorizados)

## TL;DR

Re-pin `source: release` **v1.9.0** (asset sha256 `11153c85d8cb16e022f2be2d999ba131d437275becbbe6dd6b5556915b71f069` verificado = espelho do Codex; `mcp-stable` → `93fe9fb1` confirmado por `ls-remote`; contrato v1.15). Zero-delta sobre o dev-build v1.8.0 já pinado: diff de `data/` = só o carimbo `run_manifest.release`. **Tectos f2 fixados como GATES: standard ≤ 9.200, minimal ≤ 8.450** (ratificados+harmonizados, «3 sims»); `KNOWN_TOTAL_DEVIATIONS` esvaziado — a cauda «harmonização de tectos» fecha aqui. Re-corrida no pin formal: **727/727**, casos-ouro **10/10**, eval 119: 78/18/**0**/23, gate E PASS (records `2026-08-31-v190-*-v0.20.0-beta.7-*`). Bump 0.20.0-beta.7; tag + npm `beta` a seguir ao push (`latest` = 0.11.0/0.12.0 é da lane estável — não toco).

## Identificadores (verificados)

| Item | Valor |
|---|---|
| KG release formal | `v1.9.0` (não-prerelease; assets `.zip` + `.sha256`); tag → `c5debb8b` (objecto), commit `93fe9fb1955317a782d1774e29fc7961ecdf0f03` = `mcp-stable` |
| Asset sha256 | `11153c85d8cb16e022f2be2d999ba131d437275becbbe6dd6b5556915b71f069` (= despacho = espelho Codex) |
| Pin | `source: release`, contrato v1.15, 273 req/29 cat (FIL/PRI), 305 links, `run_manifest.release = {stable, v1.9.0}`, `pinned_at` 2026-08-31 |
| Tectos em vigor | f2 standard **9.200** / minimal **8.450** (gates hard em BUDGETS, ambas as linhas); medidos 9.102 / 8.375 |

## Re-corrida (pin formal)

Casos-ouro **10/10** (cobertura 100%, precisão-estrita 100%; GC-01 FIL, GC-06 PRI, GC-08 SES-008, GC-10 INT — transições registadas na vaga anterior, mantidas) · eval 119 cenários, 96 executados: 78/18/0/23, **gate E PASS sem regressão** (15/2/0) · Eixo H 10/10 · 727/727 · check ✅ (verificador do pin verde).

## Pontos seguintes (após push — ver update no em-curso)

Tag anotada `v0.20.0-beta.7` → run `Release` → `npm view` (`beta` = 0.20.0-beta.7) → commit de fecho.
