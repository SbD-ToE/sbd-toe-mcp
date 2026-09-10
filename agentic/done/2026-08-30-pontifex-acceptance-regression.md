# Em curso — regressão de aceitação (94+7) sobre 0.10.2

**Date:** 2026-08-30 · Brief: `agentic/briefs/2026-08-30-pontifex-acceptance-regression-run-0-10-2.md` · Registo: `docs/acceptance-runs/`

- [x] Runner `npm run eval:acceptance` (Eixos A–E + F), relatório com cobertura
- [x] Fix `query_sbd_toe_entities` filtros; remoção dos ramos `SnapshotCache`; testes legados substituídos
- [ ] Decisão lead: TC-E-01/02 (`associated_controls`) → Codex ou critério
- [ ] Orchestrator: Eixo F no documento de governança
- [ ] PART priorizados (G1 nos 3 tools sem paginação; `not_found` explícito; índice de US)

## Fecho — 2026-08-30
- **PR #49 merged** pelo Orchestrator (squash **`8ade07f`**, 4 checks verdes; alerta CodeQL #18 corrigido em `6e0ee96` antes do merge).
- Entregue em `master`: runner `npm run eval:acceptance` (Eixos A–E + F), registo `docs/acceptance-runs/2026-08-29-v0.10.2-acceptance.{md,json}`, fix dos filtros de `query_sbd_toe_entities`, remoção dos ramos `SnapshotCache` + testes legados (suite 532).
- Ainda em aberto (fora deste item, seguem no brief/hub): decisão do lead sobre TC-E-01/02 (`associated_controls`); Eixo F no documento de governança (Orchestrator); PART priorizados.
- **Próximo:** ver `agentic/planeado/2026-08-30-repin-kg-v1.6.1-two-lines.md`.
