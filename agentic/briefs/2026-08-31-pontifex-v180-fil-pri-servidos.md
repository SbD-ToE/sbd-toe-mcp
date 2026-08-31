# v1.8.0 servida — FIL/PRI no motor de selecção; as 4 lacunas do oráculo passam a cobertas; Eixo H mantém 10/10

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** Orchestrator (merge; fecho da vaga v1.8.0 no MCP) · Codex (pin confirmado, sha256 verificado) · programme lead (transições + re-baselines) · **Dispatcher:** vaga v1.8.0 (FIL/PRI), pós-espelho do Codex

## Pin
`kg-v1-manual-v1.8.0-aligned-2026-08-31` (dev-build; sha256 `ad0fc96c92fb…f4df` verificado; contrato **v1.15**; Manual v1.8.0) — **273 req / 29 categorias** servidos; verificador verde. Sem release formal (0.12.0? no lote do KG v1.9.0, decisão do lead). `mcp-stable` fica em v1.7.0.

## Sinais e regras (declarados no trace; léxico ancorado no Manual)
- `files`→FIL (file/upload/uploading/attachment/photo + PT ficheiro(s)/anexo(s)/fotografia(s)); `privacy`→PRI (pii/personal data + PT dados pessoais/finalidade; `data_sensitivity: personal|regulated` também activa).
- **R-image** (fecha o finding do replay DualGauge): homónimo desambiguado por contexto — TC-F-14 prova docker→CNT×11 com 0 FIL e ficheiro→FIL×8 com 0 CNT; GC-05 ("push da imagem", sem contexto discriminante) mantém o sentido histórico.
- **SES-008-por-tecnologia** (decisão do Author): JWT/token de utilizador activa SES-008 a qualquer nível, nomeado no trace (TC-F-15); isenção DECLARADA no levelGuard do runner — **oráculo v1 intocado** (anotação de fecho v1.1 é do lead/Orchestrator).

## Casos-ouro — transição lacuna → coberto (10/10 mantém-se; cobertura 100%, precisão-estrita 100%)
| Caso | Lacuna registada no oráculo | Agora |
|---|---|---|
| GC-01 | tratamento de ficheiros sem categoria | **coberto**: FIL-001..008 seleccionados (excesso 33→46, neutro) |
| GC-06 | dados pessoais sem requisitos próprios | **coberto**: PRI-001..005 (excesso 38→43) |
| GC-08 | paradoxo SES-008 (JWT vs L1) | **coberto**: SES-008-por-tecnologia (excesso 6→7) |
| GC-10 | mensageria sem requisitos | **coberto**: INT-009..012 via integration (excesso 26→29) |
Relatório com as linhas de transição por caso: `docs/acceptance-runs/2026-08-31-v180-axis-h-selection-v0.11.0.md`.

## Re-baselines declarados
Contagens 256→273 / 27→29; arestas 282→**305** (141 regra + 148 recalc + 16 curadas; TC-F-08). Payload: a fixture2 É um endpoint de upload — FIL aplica-se correctamente (+8; citações 143→152): tectos standard f2 8.900→**9.200** (medido 9.102), minimal f2 8.200→**8.450** (8.375); secções rest 1.600, activated_scope 5.500/5.500/2.500. Fixture1 intacta (104; 6.110/5.463/3.685).

## Verificação
689/689; eval **119 cenários, 96 exec., 78/18/0 FAIL/23 — gate E PASS**; H **10/0/0**; 22/22 tools; TC-F-14/15 novos (capability ⇒ cenário).

## Asks
1. **Orchestrator:** merge do PR; fecho da vaga v1.8.0 no lado MCP. A sessão beta (cherry-pick) fica para sessão própria — fora desta.
2. **Lead:** anotação v1.1 do oráculo (4 lacunas → cobertas + SES-008) quando entenderes; tectos re-baselinados para ratificação.
