# Em curso — release 0.20.0-beta.4 (linha beta): #49 + pin formal KG v1.6.1 + publish `beta`

**Date:** 2026-08-30 · **Persona:** Pontifex · **Estado:** commit directo em `0.20-beta`; tag + publish a seguir (autorizados)

- Brief: `agentic/briefs/2026-08-30-pontifex-release-0-20-0-beta-4-formal-kg-v1.6.1.md`
- Mirror: `sbd-ai-runtime/handover/em-curso/2026-08-30-pontifex-release-0-20-0-beta-4-formal-kg-v1.6.1.md`

## Feito
- [x] `8ade07f` cherry-picked (index.ts limpo; CHANGELOG à mão); 4 ficheiros #51 (scenarios/runner/testes v1.6.1)
- [x] Re-pin v1.6.1 via `mcp-stable` (sha256 `df6920cb…` verificado); bump 0.20.0-beta.4
- [x] `eval:acceptance` gate PASS (59/20/0/23) · trace 270/270/270 · prepare 4 níveis `agents` · orçamentos ✅ · check ✅ · 708/708 ✅
- [x] CHANGELOG · FREEZE-REGISTRY · disclosure

## Pendente
- [ ] Tag `v0.20.0-beta.4` → run Release → `npm view` → commit de fecho
- [ ] Follow-up: cenário Axis G (`trace_sbd_toe_graph`) no runner de aceitação — a propor ao Orchestrator/DevelopmentGovernance
