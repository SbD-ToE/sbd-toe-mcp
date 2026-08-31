# Em curso — ciclo MP1 (operação de selecção), fase P1

**Date:** 2026-08-31 · Dispatcher: `2026-08-31-orchestrator-to-pontifex-ciclo-mp1-operacao-seleccao.md`
- [x] P1: proposta de desenho em `agentic/briefs/2026-08-31-pontifex-p1-desenho-operacao-seleccao.md` (O2 ★ motor único + tool `select_sbd_toe_requirements`; narrowing em 2 bandas declaradas; gate por âmbito+payload; consult `mode: index` opt-in; tensão 0.10.5 vs 0.11.0 assinalada) + espelho no hub
- [ ] **G-mp1a — decisão do lead** (onde vive; gate; consult; número de versão)
- [ ] P2 implementação (estável → beta por cherry-pick) · P3 prova Eixo H 10/10 · release formal

## Update — P2 executada (2026-08-31)
- [x] P2 na estável: ver `agentic/briefs/2026-08-31-pontifex-p2-mp1-selection-implemented.md` — Eixo H 1/3/6 → **6/4/0**, eval 0 FAIL gate E PASS, 684/684; tectos medidos (8.900/5.950/8.200)
- [ ] Merge (Orchestrator) → beta.6 absorve (sessão própria) → verificação das duas linhas → tag `v0.11.0` + npm
- [ ] P3 (10/10): depende das decisões do lead (GC-07 regra do principal; concernsMap auth→SES; DST-006/CFG-006/LOG-001)

## Update — P3 executada (2026-08-31)
- [x] P3: R1/R2 nomeadas + sinais DST/CFG/LOG + gate um-sinal-uma-superfície → **Eixo H 10/10 PASS** (100% cobertura, 100% precisão-estrita); 689/689; eval 0 FAIL gate E PASS; tectos com folga (8.446/5.463/7.720)
- [ ] Merge (Orchestrator) → beta.6 absorve P2+P3 → verificação das duas linhas → tag `v0.11.0` + npm

## Update — R3 executada (2026-08-31)
- [x] R3 camada de ensino: guide (3 superfícies + 2 bandas + recuperação por sinal + mode index), skills/subagents (routing por intenção), next[] (map_applicability/consult/list_chapters → select), TC-F-13 PASS; eval 117 cenários 0 FAIL gate E PASS; Eixo H 10/10 sem regressão
- [ ] Merge (Orchestrator) → beta.6 absorve P2+P3+R3 → duas linhas verificadas → tag `v0.11.0` + npm
