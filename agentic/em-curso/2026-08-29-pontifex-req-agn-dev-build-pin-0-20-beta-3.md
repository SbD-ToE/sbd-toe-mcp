# Em curso — linha beta: absorção de master `bc8c9189` → 0.20.0-beta.3

**Date:** 2026-08-29 · **Persona:** Pontifex · **Estado:** commit em `0.20-beta` autorizado pelo operador; push/PR conforme protecção de branch; sem tag, sem npm

- Brief (autoritativo): `agentic/briefs/2026-08-29-pontifex-to-orchestrator-req-agn-dev-build-pin-0-20-beta-3.md`
- Mirror: `sbd-ai-runtime/handover/em-curso/2026-08-29-pontifex-req-agn-dev-build-pin-0-20-beta-3.md`
- Estável correspondente: `agentic/em-curso/2026-08-29-pontifex-req-agn-dev-build-pin-0-10-2-prep.md` (PR #45 → `bc8c918`)

## Feito
- [x] `git cherry-pick --no-commit bc8c918`; `src/index.ts` merge automático verificado (enum `agents`; `trace_sbd_toe_graph`/`detail` preservados); conflitos resolvidos em package*.json (→ 0.20.0-beta.3), CHANGELOG (secção beta), AI-USE-DISCLOSURE (lado desta linha)
- [x] `requirement-id.ts` + 2 testes novos presentes; `consumed-bundle.json` idêntico a master; `sync-bundle` do snapshot idempotente (`+0 ~0 -0 =49`, sha256 verificado)
- [x] Verificação 2 (estável) ✅ · Verificação 3 (beta) ✅ — ver brief; `npm run check` ✅ · 720/720 ✅ · smoke ✅
- [x] Alinhamento v1.10 no `prepare` (category segment) + `concerns:["agents"]` no `prepare` (diferenças 1–2 do brief); snapshots regenerados (data-driven)

## Pendente
- [ ] Commit + push em `0.20-beta` (PR se rejeitado) — SHA/PR anotado abaixo
- [ ] Orchestrator/Codex: confirmar «+64 arestas / +32 EP» (medido +852 overlay / +4 EP)
- [ ] Os mesmos pendentes upstream da estável (KG formal + mcp-stable; citações legadas; control links)
