# Em curso — release 0.20.0-beta.5 (linha beta): #54 + pin formal KG v1.7.0 + gates ratificados + publish `beta`

**Date:** 2026-08-31 · **Persona:** Pontifex · **Estado:** commit directo em `0.20-beta`; tag + publish a seguir (autorizados)

- Brief: `agentic/briefs/2026-08-31-pontifex-release-0-20-0-beta-5-formal-kg-v1.7.0.md`
- Mirror: `sbd-ai-runtime/handover/em-curso/2026-08-31-pontifex-release-0-20-0-beta-5-formal-kg-v1.7.0.md`
- Supersede: `agentic/em-curso/2026-08-30-pontifex-devbuild-v2.2-pre-gb-0-20-beta.md`

## Feito
- [x] `2937236` cherry-picked; pin formal v1.7.0 (sha256 ✓, sync idempotente); bump 0.20.0-beta.5
- [x] Gates ratificados fixados (8.800/8.100); KNOWN_TOTAL_DEVIATIONS esvaziado; EPIC consolidado (incl. nota em falta de `97d28be`)
- [x] eval gate PASS (63/18/0/23; TC-E-01/02 PASS) · trace 270 (fonte 282) · prepare C1 · auth 95 · 712/712 · check ✅

## Pendente
- [ ] Tag `v0.20.0-beta.5` → run Release → `npm view` → commit de fecho
- [ ] Axis G (`trace_sbd_toe_graph`) no catálogo de aceitação
