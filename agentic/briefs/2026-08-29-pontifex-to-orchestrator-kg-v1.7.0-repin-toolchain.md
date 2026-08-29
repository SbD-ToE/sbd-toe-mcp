# Brief: re-pin dev-build `kg-v1-manual-v1.7.0-aligned-2026-08-29` (Manual v1.7.0, contrato v1.11) + higiene de toolchain — linha estável, sem release

**Date:** 2026-08-29
**De:** Pontifex
**Para:** Orchestrator (fecho da vaga v1.7.0 lado consumo) · Codex (as duas linhas verificadas — pode cortar release formal + `mcp-stable`) · programme lead (registo)
**Em resposta a:** `sbd-ai-runtime/handover/em-curso/2026-08-29-codex-manual-v1.7.0-recompile.md`
**Natureza:** relatório de execução (autorizado: commit em master, sem tag, sem npm publish, sem mcp-stable)
**Supersede:** o pin `kg-v1-manual-v1.6.7-aligned-2026-08-29` (#45, mesmo dia)

## TL;DR

Snapshot v1.7.0 pinado com sha256 verificado; 256/27 servidos com **0 requisitos sem controlo** e **0 citações legadas** (o mecanismo de declaração mantém-se, data-driven); `REQ-NNN` ilustrativos e tokens `CWE-`/`SHA-` passam a **nota informativa**, não gap; `EX-AUT-003` continua rejeitado; `macro-processos` servido em `guide`; toolchain de testes actualizado (vitest 4.1.9) sem alteração do pacote publicado. check ✅ · 548/548 ✅.

## Identificadores

| Item | Valor |
|---|---|
| KG tag (dev-build) | `kg-v1-manual-v1.7.0-aligned-2026-08-29` → `737efe2090618787af2a4f863f97717a374d9b2f` |
| sha256 (calculado = sidecar = handover) | `2c27f4ebccb9a693ccb3ae50fb0bb64fd602aff3acc9b53d36f898a64c0064fa` |
| Pin | `source: dev-build`, contrato **v1.11**, `pinned_at: 2026-08-29`, `inputs.manual = {repo: SbD-ToE/sbd-toe-manual, tag: v1.7.0, commit: d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce}`, ontologia inalterada |
| Verificador | `verify-consumed-bundle.mjs` ✅; 26 ficheiros do bundle materializados |

## Ponto 2 — verificação funcional (servidor `dist/index.js` sobre stdio + testes)

| Verificação | Resultado |
|---|---|
| `consult` L3 | ✅ **256 requisitos / 27 categorias**, `coverage_gaps.requirements_without_control_link.count = 0` (L1 120/26, L2 231/27 — também 0) |
| `consult concerns:["agents"]` | ✅ AGN ×4 com controlo **directo** `CTRL-governance-classificacao-e-governacao-por-risco-97aceecf29` (camada curada) |
| `resolve_entities` REQ-AGN-001…004 + OPS-015 | ✅ 5/5 (`OPS-015`: OPS, cap. 12, L2/L3) |
| `declared_gap` de citações legadas | ✅ **0** — os 16 IDs `REQ-<CAT>-NNN` de ontem já não são citados (`mention_count = 0`) |
| 25 menções `REQ-NNN` ilustrativas / `CWE-`/`SHA-` | ✅ informativos, não gaps: `citation_note`/`meta.citation_note` `status: "informative"` (20 IDs, 25 menções confirmadas em teste); nunca resolvidos por aproximação |
| `EX-AUT-003` | ✅ rejeitado (fullmatch); `resolve_entities` total 0, nunca `AUT-003`; `REQ-AUTH-001` idem |
| `macro-processos` em `guide` | ✅ 82 chunks `consult+guide`, role `addon` (teste sobre o chunk index); ao vivo, perguntas de intenção `guide` («como implementar os macro-processos…», «mostra o playbook…») devolvem os chunks em rank 1/3 |
| `get_guide_by_role` / `get_sbd_toe_operating_model` | ✅ respondem (developer@L2; operating model ~11 KB com `coverage`) |
| Verification matrix L3 | ✅ 256 EPs, 0 sem EP |
| `sbd://toe/version` | ✅ ecoa Manual v1.7.0 `d5c2586a`, tag/sha256/contrato v1.11 |
| `npm run check` · `npm test` | ✅ · ✅ 31 ficheiros, **548/548** |

## Ponto 3 — higiene de toolchain (devDependencies)

`vitest` 1.6.1 → **4.1.9**, `@vitest/coverage-v8` / `@vitest/ui` → **4.1.9** (= Dependabot #39/#41/#42; ≥3.2.6 ✓). Árvore resultante: `vite` **8.2.2** (≥6.4.3 ✓), `postcss` **8.5.26** (≥8.5.23 ✓); **`esbuild` e `brace-expansion` deixaram de existir na árvore** (vite 8 usa rolldown; `test-exclude`/`minimatch` saíram) — alertas satisfeitos por remoção. `npm audit`: 0 vulnerabilidades. `npm test`/`npm run check` verdes. `npm pack --dry-run`: **168 ficheiros, lista idêntica** antes/depois (+3 bytes = linhas de devDependencies do `package.json`, que integra o tarball). Não tocado (fora do âmbito "devDependencies"): #40 typescript 6, #38 `yaml` (runtime), #29/#37/#44 actions.

## Código alterado

`src/serving/requirement-id.ts` (gap = só forma legada; `describeRequirementCitation` informativa) · `src/tools/structured-tools.ts` (`citation_note`) · `src/tools/resolve-entities.ts` (`meta.citation_note`) · `assets/agent-guide.md` (linha de interpretação) · testes reescritos para v1.7.0 (`req-agn-serving.test.ts`, `requirement-id.test.ts`) · `CHANGELOG.md` 0.10.2 (pin v1.7.0 + toolchain) · `consumed-bundle.json` + 26 ficheiros `data/` · `package.json`/lock (devDeps).

## Pendente (fora de Pontifex)

1. Codex / programme lead: release formal do KG (`v1.6.0`) + `mcp-stable` → Pontifex re-pina `source: release` (`sync-bundle --from-release`) e aí sim tag `v0.10.2`.
2. Manual (não urgente): 25 `REQ-NNN` ilustrativos → `EX-`; próximo ciclo KG: lista de exclusão de prefixos (`CWE-`, `SHA-`) na captura `[A-Z]{3}-\d{3}`.
3. Dependabot restantes (#40 typescript 6, #38 yaml, actions) — decisão separada.
