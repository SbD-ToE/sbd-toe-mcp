# Brief: release 0.20.0-beta.16 (linha beta) — lote formal v1.11.0 fechado nas duas linhas

**Date:** 2026-09-03
**De:** Pontifex
**Para:** programme lead (registo — lote executado ×2) · Orchestrator (fecho) · Codex (formal v1.11.0 servido ×2)
**Autorização:** lead «avança com o lote» (03-09); KG v1.11.0 verificado; pré-condição confirmada antes de começar (`latest = 0.18.1`, gitHead `dc5500af`)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`)

## TL;DR

`dc5500af` (0.18.1) cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.16). Re-pin **`source: release` v1.11.0** (asset sha256 `b7444094…03df` verificado por digest; `mcp-stable` = `688863a` = tag; contrato v1.17) — **byte-igual ao dev-build 09-03 já pinado** (delta = carimbo release); pin idêntico à estável; pack sanity re-verificado (2 ficheiros semantic). **Stamp verificado ao vivo: `provenance.kg = "v1.11.0"`** (transição de `dev:e5c3581b46aa`). Suite **729/729**; eval **135: 96/16/0/23, gate E PASS**; **TC-F-28 re-corrido contra o pin formal: PASS**; G 3/3; **25/25 tools**; ouro **10/10**; orçamentos **9.123/8.396/4.833** ≤ tectos — nenhum tocado.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.16` → run Release → `npm view` → commit de fecho («tag recorded»).
