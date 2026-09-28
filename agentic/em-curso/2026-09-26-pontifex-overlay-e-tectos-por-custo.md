# Em curso (Pontifex) — 0.21.1 (fix do overlay) e 0.21.2 (tectos por custo projectado) — 2026-09-26

**Decisões do lead (2026-09-26, via Orchestrator):**
1. **0.21.1 só com o fix do overlay** (`fix/overlay-scope`). PR para `master` com bump 0.21.1, CHANGELOG em rascunho e a linha do
   FREEZE-REGISTRY que segue a tag. Merge, tag, publicação em `next` e o move de `latest` são actos do lead. Nota no PR: a 0.21.1 é
   a candidata natural para sair da 0.19.4 em `latest`.
2. **Tectos por custo projectado** (lista e standard; overlay e variância por requisito incluídos; acima do envelope →
   `needs_decomposition` com lotes) numa release **seguinte (0.21.2)**. Promessa primeiro, código depois, branch próprio a partir da 0.21.1.
3. Commit dos briefs e notas em `agentic/` (vão no PR da 0.21.1, só `agentic/`).

Brief do fix: `agentic/briefs/2026-09-26-pontifex-overlay-scope-fix.md`. Auditoria dos docs: `agentic/briefs/2026-09-26-pontifex-auditoria-docs-mcp-manual.md`.

## 0.21.2 — implementada (2026-09-26)

Lead: SIM ao irredutível pronto e declarado; decomposição só com ≥2 categorias; promessa 0004 fechada. Implementada no branch
`0.21.2-cost-ceilings` (a partir de `ca70b90`). Sem PR de merge até ordem do lead — vai provavelmente com o re-pino do KG
(papéis v1.28 + ids de secção v1.27). Registo: decisão 0004 §8; CHANGELOG 0.21.2 RASCUNHO; matriz
`docs/acceptance-runs/2026-09-26-v0.21.2-cost-ceiling-matrix.md` (87/6/22/1, 0 violações, full 58/58 byte-idêntico);
acceptance `acceptance-reports/2026-09-26-v0.21.2-dev-cost-ceilings-acceptance.md` (141/16/0/23 PASS); Eixo H 10/10; vitest 838/838.

## 0.21.2 — textos servidos + decisão 0005 (2026-09-26)
- **Textos servidos:** guia de codegen, codegen-instructions, `coverage_gaps` e README corrigidos no commit `8c43178`.
- **Decisão 0005** (lotes com os activadores do pedido, `slice_families` só de contexto): implementada. Matriz de 120 casos com
  0 lotes únicos, cobertura G2 1,00 e 0 violações.
- **Achado aberto para o lead:** `exposure` e `data_sensitivity` não produzem fatias.


## Decisão 0006 — promessa escrita (2026-09-26)
- **Estado:** promessa no commit `89fa703`, sem código. `exposure` e `data_sensitivity` passam a trazer contexto, e as fatias
  vêm da cadeia do dado REQ→CTRL→ACO.
- **Decisões do lead pendentes:** A (dado) ou B (regra); pedido ao KG; re-baselinagem de um caso do oráculo da invariante 3.
- **Ciclo:** sem release nem PR até o Manual fechar. Depois vem o ciclo completo Manual → KG (v1.27 + v1.28) → ontologia v2.11
  → MCP, e o branch será re-verificado contra o bundle novo.

## Decisão 0006 — implementada (2026-09-26)
- **Opção A:** as fatias dos activadores largos vêm só do dado, pela cadeia REQ→CTRL→ACO. Matriz com G2 zero 46 → 0, 0
  violações, e a união dos lotes exacta.
- **SEGUIMENTO KG v2.12:** a relação precisa «valor de contexto → fatias» (e «concern → família») como dado. O Archon modela em
  `ApplicationContext`, o Codex materializa, e o lead ratifica. Não é deste ciclo.
- **SEGUIMENTO no ciclo completo:** re-baselinar o caso do oráculo «API pública/L3 + activadores», mostrando ao lead o conjunto
  citável antes/depois contra o KG novo. Re-medir as duas matrizes.

