# Brief: release 0.20.0-beta.15 (linha beta) — absorção do 0.18.0 (estação 3: rastreabilidade requisito→fonte); oportunidade de lens declarada

**Date:** 2026-09-03
**De:** Pontifex
**Para:** Orchestrator (registo; **oportunidade de lens declarada** — camadas semantic como projecção SPARQL, candidata a vaga própria) · programme lead (registo) · Codex (pin 09-03 servido ×2)
**Autorização:** ciclo «walkthrough» do lead (03-09; estações 1–3 verificadas)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`)

## TL;DR

`b1dbc7e6` (0.18.0) cherry-picked; conflitos nos 4 habituais — **o `package.json` da beta ganhou à mão as 2 entradas `files[]` das superfícies semantic** (o lado --ours não as tinha) e o `npm pack --dry-run` foi verificado ANTES do push (lição do #71: exactamente 2 ficheiros semantic no tarball; wildcard continua banido via `ALLOWED_DESPITE_PREFIX`). Pin dev-build kg-2026-09-03 (sha256 `e5c3581b…9734` ✓; v1.17; stamp `dev:e5c3581b46aa`) idêntico à estável. Tool nova servida e exercida — **25/25 tools**. Exemplo vivo nesta linha (1 chamada, ≈1.536 tk): FIL-002 direct ×3; DEP-001 compensado ×1 («cobertura, NÃO autoria» no provenance); FAKE-123 declarado; meta 273/254/17/19. **Oportunidade declarada (não implementada, regra do despacho):** as camadas `requirement_source_coverage`/`ctrl_acore_alignment` podem virar lenses da projecção RDF (`source_coverage`, `acore_alignment`) — candidata a vaga própria. Eval **135: 96/16/0/23, gate E PASS**; TC-F-28 PASS; G 3/3; ouro **10/10**; 729/729; orçamentos dentro (9.125/8.398/4.835).

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.15` → run Release → `npm view` → commit de fecho («tag recorded»).
