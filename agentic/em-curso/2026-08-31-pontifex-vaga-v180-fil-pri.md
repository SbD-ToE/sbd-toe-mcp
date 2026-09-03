# Em curso — vaga v1.8.0 (FIL/PRI) no serving

- [x] Pin dev-build `kg-v1-manual-v1.8.0-aligned-2026-08-31` (sha256 verificado; v1.15; 273/29)
- [x] Sinais files/privacy + R-image + SES-008-por-tecnologia; TC-F-14/15
- [x] Casos-ouro 10/10 mantidos; 4 lacunas → cobertas (transições no relatório v180)
- [x] Re-baselines: 273/29, 305 arestas, tectos f2 9.200/8.450 documentados
- [ ] PR → merge (Orchestrator) → fecho da vaga; beta em sessão própria (fora desta)
- [ ] Formal: KG v1.9.0 em lote → MCP 0.12.0 (decisão do lead)

## Update — lote formal (2026-08-31)
- [x] Re-pin release v1.9.0 (sha ✓; zero-delta); tectos ratificados 9.200/8.450; re-corrida: 10/10 sem divergência, gate E PASS, 689/689
- [ ] PR → merge → tag `v0.12.0` → npm `latest` → verificação e report final

## Update — serving batch 0.13.0 (2026-09-01)
- [x] read_sbd_toe_resource + stamp provenance.kg + inspect pin + varrimento + release_ref + ensino; eval 121 cenários 0 FAIL, ouro 10/10, 23/23 tools; tectos intactos
- [ ] PR → merge → tag v0.13.0 → npm latest → report

## Update — ciclo 0.14.0 (2026-09-01)
- [x] Aplicabilidade graduada: listas binárias/minLevel mortos; derivação assignments+matriz cap. 01; 689/689; eval 0 FAIL gate E PASS; ouro 10/10; map ≈1.470 tk
- [ ] PR → merge → tag v0.14.0 → npm latest → report

## Update — ciclo 0.15.0 (2026-09-01)
- [x] Auditoria Desktop P0 completo + paginação + excluded_by_level; eval 126 cenários 0 FAIL; ouro 10/10; tectos intactos (ultrathin por dieta)
- [ ] PR → merge → tag v0.15.0 → npm latest; 0.15.1 = assess (deferido)

## Update — ciclo 0.15.1 (2026-09-02)
- [x] Reverificação fechada 7/7 (placeholder tool_prefix; orgScope erro; assess completo; maxItems 5 medido); eval 128 cenários 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.15.1 → npm latest

## Update — ciclo 0.16.0 (2026-09-02)
- [x] Re-pin dev-build 2026-09-02 (v1.16) + joins expostos (artifacts 25/25, names 95/95, totais 45/469); stamp dev:<sha12>; eval 129 cenários 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.16.0 → npm latest

## Update — lote formal 0.16.1 (2026-09-02)
- [x] Re-pin release v1.10.0 (sha ✓, byte-igual); stamp v1.10.0 verificado; tectos intactos; eval 129 cenários 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.16.1 → npm latest; depois beta.13 (dispatch próprio) fecha o lote

## Update — ciclo 0.17.0 (2026-09-02)
- [x] Ronda 2: resolve never-silent (valid_fields derivados; caso do lead) + matrix requirement_ids + next select→matrix; eval 131 cenários 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.17.0 → npm latest; achado 1 (classificação) aguarda ratificação de desenho

## Update — estação 3 / 0.18.0 (2026-09-03)
- [x] Pin kg-2026-09-03 (v1.17) + trace_sbd_toe_requirement_sources (directas vs compensadas; 19 declarados); TC-F-28; eval 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.18.0 → npm latest

## Update — lote formal 0.18.1 (2026-09-03)
- [x] Re-pin release v1.11.0 (sha ✓, byte-igual); stamp v1.11.0; TC-F-28 re-corrido PASS; eval 0 FAIL; ouro 10/10
- [ ] PR → merge → tag v0.18.1 → npm latest
