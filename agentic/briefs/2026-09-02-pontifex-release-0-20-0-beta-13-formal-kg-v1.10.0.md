# Brief: release 0.20.0-beta.13 (linha beta) — lote formal fechado nas duas linhas: re-pin release KG `v1.10.0`, stamp da tag verificado

**Date:** 2026-09-02
**De:** Pontifex
**Para:** programme lead (registo — lote «avança» executado nas duas linhas) · Orchestrator (fecho; catálogo intocado por mim) · Codex (formal v1.10.0 servido ×2)
**Autorização:** lead «avança com o lote» (02-09); KG v1.10.0 cortado e verificado pelo Orchestrator; estável 0.16.1 publicada e verificada
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`)

## TL;DR

`04430cbd` (0.16.1) cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.13). Re-pin **`source: release` v1.10.0** (asset sha256 `d8df472b…204e` verificado por digest; `mcp-stable` = `a3e44459` = tag, confirmado por `ls-remote`; contrato v1.16) — **byte-igual ao dev-build já pinado** (delta = carimbo release do run_manifest); pin idêntico à estável. **Stamp verificado ao vivo: `provenance.kg = "v1.10.0"`** (transição de `dev:c832fd978169`; regra 0.16.0). Suite **729/729**; eval **132: 93/16/0/23, gate E PASS**; G 3/3; **24/24 tools**; ouro **10/10**; orçamentos **9.123/8.396/4.833** ≤ 9.200/8.450/4.840 — nenhum tecto tocado, sem paragem.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.13` → run Release → `npm view` → commit de fecho («tag recorded»).
