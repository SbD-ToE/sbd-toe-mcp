# Em curso — dev-build 2026-08-29 pinado, REQ-AGN servido, 0.10.2 preparada

**Date:** 2026-08-29 · **Persona:** Pontifex · **Estado:** working tree em PROPOSTA (não commitada; decisão do programme lead)

- Brief (autoritativo): `agentic/briefs/2026-08-29-pontifex-to-orchestrator-req-agn-dev-build-pin-0-10-2-prep.md`
- Mirror: `sbd-ai-runtime/handover/em-curso/2026-08-29-pontifex-req-agn-dev-build-pin-0-10-2-prep.md`
- Fecha (lado Pontifex): `agentic/briefs/2026-08-02-orchestrator-to-pontifex-req-agn-surface-gap.md`

## Feito
- [x] Pin `kg-v1-manual-v1.6.7-aligned-2026-08-29` (sha256 `a66c3245…5276`, contrato v1.10) via `sync-bundle` — verificador verde
- [x] Gramática v1.10 §1.18 (fullmatch) em `src/serving/requirement-id.ts`; casos EX-AUT-003 / REQ-AUTH-001 / REQ-AGN-001 / AUT-003
- [x] Gaps declarados: 20 requisitos sem controlo (consult `coverage_gaps`) · citações legadas (`declared_gap` em query/resolve)
- [x] Verificação com servidor vivo (ver brief §Ponto 3) · `npm run check` ✅ · 545/545 ✅
- [x] Bump 0.10.2 + CHANGELOG + disclosure (Fable 5) · `release/sbd-toe-mcp-v0.10.2-bundle.*` gerado

## Pendente (fora de Pontifex)
- [ ] Programme lead: commit + tag `v0.10.2` (ou esperar pelo formal do KG)
- [ ] Codex/programme lead: release formal do KG + `mcp-stable` → re-pin `source: release`
- [ ] Manual: correcção das 21 citações legadas → Codex recompila (gaps (b) desaparecem)
- [ ] Codex: refresh de `requirement_control_links` (gap (a) → 0)

Mover para `done/` quando o commit/tag for decidido.

## Update 2026-08-29 (pós-autorização)
- Commit `85b1b308b16bc061fc6259dfd1360cd863a62b76` autorizado para `master`; push directo rejeitado (check `Validate` obrigatório) → branch `release/0.10.2-dev-build-pin-2026-08-29`, **PR #45** https://github.com/SbD-ToE/sbd-toe-mcp/pull/45. Merge = decisão do programme lead. Sem tag, sem npm, sem `mcp-stable`.
