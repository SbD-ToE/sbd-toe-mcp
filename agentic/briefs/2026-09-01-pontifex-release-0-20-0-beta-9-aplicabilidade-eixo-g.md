# Brief: release 0.20.0-beta.9 (linha beta) — absorção do 0.14.0 (aplicabilidade graduada) + Eixo G fechado (24/24 tools)

**Date:** 2026-09-01
**De:** Pontifex
**Para:** Orchestrator (Eixo G encaminhado — FECHADO; doc de governança actualizado na mesma alteração) · programme lead (registo) · Codex (sem impacto de dados)
**Autorização:** decisão do Author 2026-09-01 (verbatim no registo do lote formal) + encaminhamento do Eixo G (Orchestrator c/ lead)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (release KG v1.9.0)

## TL;DR

`1f199ccb` (0.14.0) cherry-picked com o padrão habitual (dieta/orçamentos/snapshots da beta mantidos; ficheiros partilhados byte-iguais a master; **nenhuma superfície só-beta lia a lista binária** — auditado: selection/prepare/trace, nada a matar). Eixo G: TC-G-01/02/03 no runner **e** no doc de governança na mesma alteração — **24/24 tools exercidas** (gap 24/23 da beta.8 fechado). Eval 124: **84/17/0/23, gate E PASS** (TC-E-10 full PASS; TC-A-06/07/12 graduados PASS); casos-ouro **10/10**; 727/727; orçamentos dentro dos gates harmonizados (9.105/8.379 ≤ 9.200/8.450). Bump 0.20.0-beta.9.

## Eixo G (novo)

- TC-G-01: determinismo + paginação G1 nas 3 lentes (270/270/270; `cursor` = offset da próxima linha, `null` no fim declarado; walk = total; sem IRIs).
- TC-G-02: vazio declarado (anchor `REQ-AGN-001` fora da projecção v1 → rows [], total 0, anchor ecoado, `provenance.note`; anchor inexistente idem).
- TC-G-03: `lens` inválida/em falta → erro JSON-RPC `-32602` que nomeia o campo; nunca sucesso vazio.
- Doc `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md`: placeholder do Eixo G preenchido (mesma alteração; regra de manutenção). Nota honesta: as duas primeiras execuções do TC-G-01 falharam por asserção minha errada sobre a semântica do `cursor` (assumi índice de página; é offset) — corrigido no próprio cenário; o serving nunca esteve errado.

## Verificação

| Item | Resultado |
|---|---|
| eval:acceptance (`2026-09-01-v0140-v0.20.0-beta.9-*`) | 124 cenários, 101 executados: **84/17/0/23**; gate E **PASS** (16/1/0); Eixo G 3/3; **24/24 tools** |
| Casos-ouro | **10/10** (selection intocada pelo 0.14.0) |
| Aplicabilidade graduada ao vivo | TC-A-06/07 (15 capítulos, 0 excluídos, demand graduada, obrigatórios L1 76 < L2 234), TC-A-12, TC-E-10 → PASS |
| Suite / check | 727/727 · ✅ |
| Orçamentos | f2 standard **9.105**/9.200 · minimal **8.379**/8.450 · ultrathin 4.833/4.840; f1 6.113/5.467/3.688; ids 104/152; snapshots intocados (+~4 tokens de metadados graduados) |

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.9` → run Release → `npm view` → commit de fecho (linha «beta.9 tag recorded» no registry).
