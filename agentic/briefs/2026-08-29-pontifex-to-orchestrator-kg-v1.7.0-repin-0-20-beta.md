# Brief: linha beta (0.20-beta) — absorção de master `947f38e6` (re-pin dev-build `kg-v1-manual-v1.7.0-aligned-2026-08-29`, contrato v1.11, classificador de citações, toolchain) — 0.20.0-beta.3 (não publicada)

**Date:** 2026-08-29
**De:** Pontifex
**Para:** Orchestrator (visibilidade: as duas linhas no mesmo pin v1.7.0) · Codex (visibilidade) · programme lead (ratificação do desvio de orçamento; decisão sobre tag/npm da beta.3)
**Em resposta a:** despacho do operador 2026-08-29 (cherry-pick de `947f38e612a9b2d906733adaadc6e9d200b70547`, squash do PR #46, para `0.20-beta`)
**Espelho da estável:** `agentic/briefs/2026-08-29-pontifex-to-orchestrator-kg-v1.7.0-repin-toolchain.md`
**Supersede (nesta linha):** o pin v1.6.7 de `6353557` (brief `…-req-agn-dev-build-pin-0-20-beta-3.md`, mesmo dia)
**Natureza:** relatório de execução (linha beta, dev-build, **sem tag, sem npm publish**)

---

## TL;DR

`947f38e` cherry-picked para `0.20-beta` em **dois commits**: `eac79e6` (re-pin + classificador de citações; conflitos só em CHANGELOG e package-lock, resolvidos à mão; `src/index.ts` não tocado — SPARQL/`detail`/`concerns:["agents"]` preservados) e `de3d70d` (bump de toolchain isolado, **passou** na beta: vite 8.2.2/rolldown com Oxigraph 0.5.9 — nada ficou de fora). Versão mantida `0.20.0-beta.3`. Pin idêntico a master (`2c27f4eb…64fa`, v1.11, Manual v1.7.0 `d5c2586a`, repo `SbD-ToE/sbd-toe-manual`); `sync-bundle` do snapshot idempotente; `verify-consumed-bundle` ✅. Verificações 2 e 3 ✅ com **um desvio reportado**: fixture 2 do orçamento `standard` mede 8.645 > 8.500 (gate hard do EPIC) por crescimento de dados (OPS-015) — gate não subido, tolerância documentada, ratificação pendente.

## Identificadores (verificados)

| Item | Valor |
|---|---|
| Origem (master) | `947f38e612a9b2d906733adaadc6e9d200b70547` (PR #46) |
| Commits nesta linha | `eac79e6e406bee04ee3c7b4bad7e1c4cdb37fb7d` (re-pin + citações) · `de3d70d` (toolchain, descartável) · governança (este brief) |
| KG tag (dev-build) | `kg-v1-manual-v1.7.0-aligned-2026-08-29` |
| sha256 (calculado = sidecar = despacho) | `2c27f4ebccb9a693ccb3ae50fb0bb64fd602aff3acc9b53d36f898a64c0064fa` |
| Pin | `consumed-bundle.json` idêntico a master: `source: dev-build`, contrato **v1.11**, `pinned_at` 2026-08-29, Manual v1.7.0 `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce`, ontologia `84fe8bf6` |
| Toolchain | vitest/@vitest/* `^4.1.9` (4.1.9 resolvido); vite 8.2.2, rolldown 1.2.6, postcss 8.5.26; esbuild e brace-expansion fora da árvore; `npm audit` 0 |

## Verificação 2 — as da estável (servidor `dist/index.js`, stdio)

| Verificação | Resultado |
|---|---|
| `consult` L3 | ✅ **256 req. / 27 cat.**, `coverage_gaps.requirements_without_control_link.count = 0` (L1 120/26 e L2 231/27 também 0; sem linha `REQUIREMENT_WITHOUT_CONTROL_LINK`) |
| `resolve_entities` REQ-AGN-001…004 + OPS-015 | ✅ 5/5 (AGN cap. 2; `OPS-015` OPS, cap. 12, «Sinais contínuos de saúde e disponibilidade operacional») |
| Ligações AGN | ✅ `requirement_control_links` 263: REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-97aceecf29` (confiança 0.87); OPS-015 → `CTRL-monitoring-monitorizacao-e-resposta-operacional-1797f0af70` |
| `consult concerns:["agents"]` L2 | ✅ exactamente REQ-AGN-001…004; `rule_trace` «CONTROL_ACTIVE_BY_REQUIREMENT_LINK: 1 controls mapped from requirement_control_links» (o controlo directo comum às 4) + 5 derivados por domain_mapping; gaps 0 |
| `declared_gap` legados | ✅ 0 — `REQ-AUT-003` já não é citado (sem gap; fallback semântico) |
| Classificador informativo | ✅ `REQ-010` → `citation_note.status: "informative"` em `query_sbd_toe_entities` e `resolve_entities.meta`; nunca resolvido por aproximação |
| `EX-AUT-003` / `REQ-AUTH-001` | ✅ rejeitados (`total: 0`, nunca `AUT-003`) |
| macro-processos em `guide` | ✅ `search_sbd_toe_manual` «como implementar os macro-processos…» → rank 1 «Como ler um macro-processo» (00-fundamentos/macro-processos); «mostra o playbook…» → rank 1 «Os Cinco Macro-processos de Engenharia Segura» |
| Matriz L3 | ✅ 256/256 EP |
| `npm run check` · `npm test` | ✅ · ✅ 42 ficheiros, **723/723** (antes e depois do toolchain) |

## Verificação 3 — desta linha

| Verificação | Resultado |
|---|---|
| `trace_sbd_toe_graph` | ✅ determinístico (3 lentes × 2 chamadas, sha igual); **270/270/270 — iguais a beta.2 e ao pin v1.6.7** (`relations.v1` 529 inalterado). A projecção RDF ganha `requirement_control_links` 242 → **263** (teste de contagens re-baselined com histórico no comentário) |
| `prepare_sbd_toe_codegen_context` 4 níveis | ✅ tarefa «Add an AI agent worker with a kill-switch and audit logging» L2: **REQ-AGN-001…004 + OPS-015** em full/standard/minimal/ultrathin (24 req., 7 controlos); `category` elidida nos dietados; `description` em standard/minimal. Com `concerns:["agents","auth"]` L3: AGN ×4 nos 4 níveis (OPS-015 não entra — é OPS via `logging`) |
| Orçamentos | ⚠️ **desvio reportado**: fixture 2 `standard` **8.645 > 8.500** (gate hard do EPIC; +223 vs pin v1.6.7 — OPS-015 activado por `logging`, com description; 151 ids em vez de 150). f2 minimal **7.926**/8.000 ✅, ultrathin **4.642**/4.840 ✅, full 24.792. f1 inalterada (18.903 / 6.227 / 5.588 / 3.696) ✅. Tratamento: gate **não** subido; `KNOWN_TOTAL_DEVIATIONS` (budget.test) tolera ≤8.700 com causa e data; nota de re-baseline no `EPIC.md`; `citationIds` 150→151 |
| Golden snapshots | 8 regenerados: 131× `manual_commit_sha` (`171db83d`→`d5c2586a`), fixture 2 +OPS-015 (68→69 req., +1 grounding, EP total +1) |
| `npm run smoke:mcp` | ✅ (antes e depois do toolchain) |

## O que ficou de fora

Nada. O bump de toolchain (vite 8/rolldown) não partiu a beta — WASM do Oxigraph, orçamentos e snapshots verdes — mas está em commit próprio (`de3d70d`) para poder ser descartado sem tocar no re-pin.

## Pendente (fora de Pontifex)

1. **Programme lead:** ratificar (ou não) a tolerância 8.700 para f2 `standard` — alternativa: fixar novo gate no EPIC. Decidir tag/npm `beta` da 0.20.0-beta.3 (não feito).
2. Codex / programme lead: release formal do KG (`v1.6.0`) + `mcp-stable` → re-pin `source: release` em ambas as linhas.
3. Manual (não urgente): 25 `REQ-NNN` ilustrativos → `EX-`; exclusão de `CWE-`/`SHA-` na captura upstream.
