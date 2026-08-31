# P2 — operação de selecção MP1 implementada na estável (0.11.0 preparada; tag após beta.6)

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** Orchestrator (merge; fecho P2 estável) · programme lead (números; 2 candidatos a regra para os PART restantes) · **Dispatcher:** ciclo MP1, G-mp1a decidido

## Eixo H — antes/depois (oráculo v1 intocado)
| Caso | 0.10.4 | 0.11.0 |
|---|---|---|
| GC-01 | PART 55% | **PASS 100%** |
| GC-02 | FAIL 0% (gate) | PART 100%/91% (SES ×8 via concernsMap `auth→[AUT,ACC,SES]` do loader — acoplamento de dados) |
| GC-03 | PART 95% | PART 95% (DST-006 sem sinal) |
| GC-04 | PART 100%/76% | **PASS 100%/100%** |
| GC-05 | FAIL 0% (gate) | **PASS 100%** |
| GC-06 | FAIL 13% | **PASS 100%** (overlay AI Act ✓) |
| GC-07 | FAIL 0% | PART 72% (higiene do principal AUT-006/ACC-002/ENC-006 + DEP-013/014 sem sinal declarado — candidato a regra ratificada) |
| GC-08 | FAIL 49% | **PASS 100%** (filtro de nível intacto: 0 violações L2+) |
| GC-09 | PASS | **PASS** (`needs_clarification`, 0 reqs) |
| GC-10 | FAIL 0% (gate) | PART 80% (CFG-006, LOG-001 sem sinal) |
**1/3/6 → 6 PASS / 4 PART / 0 FAIL; cobertura média do prepare 41% → ≈96%.** Registos: `docs/acceptance-runs/2026-08-31-axis-h-selection-v0.11.0.{md,json}` (+ eval completo `2026-08-31-v0.11.0-acceptance.*`: 116 cenários, 0 FAIL, **gate E PASS**, 22/22 tools).

## O que aterrou (D1–D4)
Motor único `src/serving/selection.ts` (elegibilidade lida do `requirement_selection_model` publicado; narrowing em 2 bandas declaradas) · tool **`select_sbd_toe_requirements`** (L3/OSS, paginada, com cenários TC-F-11/12 no mesmo change) · `prepare` consome o motor (`completeness_report.selection` + ref executável) · gate novo (morre o «máx. 50»; sem-sinal → `needs_clarification`; GC-09 segura) · activadores declarados `exposure`/`data_sensitivity` + `agents` na estável + sinais PT/EN novos auditados · `consult` `mode:"index"` opt-in · **dieta `detail` da beta portada byte-idêntica** (snapshots golden verificados na estável; `relations_ref` referencia `trace_sbd_toe_graph` da linha 0.20 — documentado no schema; recuperação `include_relations:true`).

## Tectos de payload da estável (medidos nesta P2 — proposta ao lead)
O sumário `selection` acrescenta ≈+50 tokens ao completeness → totais: `standard` f2 8.800 → **8.900** (medido 8.833); `minimal` f1 5.800 → **5.950** (5.850); `minimal` f2 8.100 → **8.200** (8.107); `standard` f1 mantém ≤6.500; ultrathin mantém (3.870/4.840); secções `rest` 980/985/1055. A beta re-ratifica ao absorver.

## Asks
1. **Orchestrator:** merge do PR; P3 = a beta absorve (beta.6) e re-corre; só depois tag `v0.11.0` + npm (duas linhas verificadas).
2. **Lead:** os 2 candidatos a regra declarada para fechar GC-07 (higiene do principal do agente) e o acoplamento `auth→SES` do concernsMap (dados/loader) — decidir antes de forçar 10/10; GC-03/10 restantes idem (DST-006/CFG-006/LOG-001).
3. Contrato do KG **intocado** (confirmado — o motor só consome o publicado).
