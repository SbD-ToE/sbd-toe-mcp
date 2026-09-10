# Em curso — Eixo H: selecção vs casos-ouro (medição; fora do gate)

**Date:** 2026-08-31 · **Dispatcher:** `2026-08-31-orchestrator-avaliacao-seleccao-casos-ouro-eixo-h.md` · **Oráculo:** `golden-selection-cases.md` v1 (do lead; lido, nunca editado — transcrito para execução em `scripts/acceptance/axis-h.mjs` com versão registada)

- [x] TC-H-01..10 no `eval:acceptance` (eixo H, nunca gate) + runner dedicado `npm run eval:axis-h`
- [x] Expansão do oráculo (wildcards/gamas pelo catálogo ao nível; concretos como estão; «Discutíveis» neutras; GC-08 com level-guard; GC-09 negativo)
- [x] Relatório `docs/acceptance-runs/2026-08-31-axis-h-selection-v0.10.4.{md,json}`: **1 PASS · 3 PART · 6 FAIL** — scope gate trava 4 tarefas legítimas (GC-02/05/10 + GC-09 desejado); GC-07 AGN não activa (0/18); GC-06 ENC/VAL não activa (2/16); GC-01 quantifica o achado do lead (55 %, 15 excesso); nível OK (GC-08 0 violações); 0 causas `manual`/`oracle?` automáticas
- [ ] PR → merge (lead) · leitura do lead / decisão Fase 3 · Author: lacunas qualitativas (ficheiros, API keys, dados pessoais, mensageria, SES-008-L1) · Orchestrator: Eixo H no doc de governança
