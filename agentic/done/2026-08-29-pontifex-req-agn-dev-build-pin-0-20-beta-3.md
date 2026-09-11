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
- [x] Commit + push directo em `0.20-beta` aceite (sem protecção nesta branch; PR não necessário): **`6353557b76bf9a6b17f06d191802e7e2f2e93ac2`**
- [ ] Orchestrator/Codex: confirmar «+64 arestas / +32 EP» (medido +852 overlay / +4 EP)
- [ ] Os mesmos pendentes upstream da estável (KG formal + mcp-stable; citações legadas; control links)

## Update 2026-08-29 (pós-push)
- `origin/0.20-beta` = `6353557b76bf9a6b17f06d191802e7e2f2e93ac2`. Sem tag, sem npm. Nota do remoto: Dependabot reporta 10 vulnerabilidades no branch por omissão (1 critical, 4 high, 5 moderate) — triagem já adiada pelo operador (2026-07-05), fora deste despacho.

## Update 2026-08-29 (superseded)
- Pin v1.6.7 superseded no mesmo dia pelo re-pin v1.7.0 (`eac79e6`) — ver `agentic/em-curso/2026-08-29-pontifex-kg-v1.7.0-repin-0-20-beta.md`.
