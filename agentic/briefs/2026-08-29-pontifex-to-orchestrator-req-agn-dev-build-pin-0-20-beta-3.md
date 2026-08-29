# Brief: linha beta (0.20-beta) — absorção de master `bc8c9189` (dev-build `kg-v1-manual-v1.6.7-aligned-2026-08-29`, gramática v1.10, gaps declarados) → 0.20.0-beta.3

**Date:** 2026-08-29
**De:** Pontifex
**Para:** Orchestrator (visibilidade: linha beta alinhada com a estável) · programme lead (decisão sobre PR/merge em `0.20-beta`; sem tag, sem npm)
**Em resposta a:** despacho do operador 2026-08-29 (cherry-pick de `bc8c91890e454f171e267cea892d9d9b99f6585a`, squash do PR #45, para `0.20-beta`)
**Espelho da estável:** `agentic/briefs/2026-08-29-pontifex-to-orchestrator-req-agn-dev-build-pin-0-10-2-prep.md`
**Natureza:** relatório de execução (linha beta, dev-build, **sem tag, sem npm publish, sem mcp-stable**)

---

## TL;DR

`bc8c918` cherry-picked para `0.20-beta` (`--no-commit`, resolução manual); os quatro ficheiros de serving (`ontology-loader`, `consult-security-requirements`, `resolve-entities`, `structured-tools`) eram idênticos a master e vieram limpos; `src/index.ts` juntou automaticamente (enum `concerns` ganha `agents`; registos de `trace_sbd_toe_graph`, `detail`, `include_relations` e recurso codegen-instructions preservados). Vieram `src/serving/requirement-id.ts` + `requirement-id.test.ts` + `req-agn-serving.test.ts`. Bump `0.10.2` **não** trazido — versão desta linha `0.20.0-beta.3`. `consumed-bundle.json` com o mesmo pin (`a66c3245…5276`, `pinned_at` 2026-08-29, contrato v1.10); `sync-bundle` do snapshot idempotente (`+0 ~0 -0 =49`). Verificações 2 (as da estável) todas ✅; verificações 3 (desta linha) ✅ com **duas diferenças face à estável** (abaixo) e **uma discrepância de contagens** face ao despacho. `npm run check` ✅, **720/720** ✅, smoke e2e ✅.

## Identificadores (verificados, nunca inventados)

| Item | Valor |
|---|---|
| Commit de origem (master) | `bc8c91890e454f171e267cea892d9d9b99f6585a` (squash PR #45) |
| Base desta linha | `0cc9e14` (0.20.0-beta.2) |
| KG tag (dev-build) | `kg-v1-manual-v1.6.7-aligned-2026-08-29` |
| Snapshot | `sbd-toe-knowledge-graph/dist/sbd-toe-knowledge-graph-bundle-kg-v1-manual-v1.6.7-aligned-2026-08-29-snapshot.zip` |
| sha256 (calculado = sidecar = despacho) | `a66c324575cede5ffb9e7c5ddae06bb8d090b3a1ec7150d53f80074f55185276` |
| Pin | `consumed-bundle.json` idêntico a master (`source: dev-build`, v1.10, Manual v1.6.7 `171db83d`, ontologia `84fe8bf6`) |
| Versão | `0.20.0-beta.3` (package.json + package-lock.json) |

## Verificação 2 — as mesmas da estável (servidor vivo `dist/index.js`, stdio)

| Verificação | Resultado |
|---|---|
| `resolve_entities` REQ-AGN-001…004 | ✅ 4/4 `total: 1`, `category: AGN`, `source_chapter: 2`; 001/002 L1–L3, 003/004 L2–L3 |
| Casos obrigatórios | ✅ `REQ-AGN-001` ✓ · `AUT-003` ✓ · `EX-AUT-003` ✗ (`total: 0`, resposta não contém `AUT-003`) · `REQ-AUTH-001` ✗ (`total: 0`) |
| `consult` L1 / L2 / L3 | ✅ 120 req./26 cat. · **230/27** · **255/27**; AGN ×2 / ×4 / ×4 |
| 20 requisitos sem controlo | ✅ `coverage_gaps.requirements_without_control_link.count` = 4 / 18 / **20** (L3: ARC-014/015, DEP-011…014, DPL-010/011, GOV-013/014, OPS-011…014, REQ-AGN-001…004, THR-008, VAL-008) + `rule_trace` `REQUIREMENT_WITHOUT_CONTROL_LINK: 20 …` |
| `consult` `concerns:["agents"]` L2 | ✅ exactamente REQ-AGN-001…004; 0 controlos; 4 declarados |
| Citações legadas | ✅ `query` `REQ-AUT-003` → `match: declared_gap`, `kind: legacy_citation_unresolvable`, «citação legada não resolvível (finding editorial em curso)»; `resolve_entities` idem em `meta.declared_gap`; `REQ-010` → `citation_unresolvable`; `EX-AUT-003` sem gap e nunca `AUT-003` |
| `npm run check` · `npm test` | ✅ tsc + disclosure + verify-consumed-bundle · ✅ 42 ficheiros, 720/720 (688 antes; +32 de master) |

## Verificação 3 — desta linha

| Verificação | Resultado |
|---|---|
| `trace_sbd_toe_graph` determinístico | ✅ 3 lentes × 2 chamadas (pageSize 200): sha byte-igual por lente |
| Contagens de cobertura vs beta.2 | ✅ **iguais**: 270 / 270 / 270 linhas por lente, mesmos sha (`7f6ac79efaa4`, `3872fb5076d8`, `9652ddb1808f`) em beta.2 e beta.3 — a projecção RDF cobre as relações v1, não tocadas por este bundle. `anchor: REQ-AGN-001` → 0 linhas (coerente com o gap declarado: AGN sem `requirement_control_links`); `anchor: ASC-01` → 19 |
| `get_sbd_toe_verification_matrix` L3 | ✅ 255/255 EvidencePatterns |
| `prepare_sbd_toe_codegen_context` AGN nos conjuntos activados | ✅ nos 4 níveis (`full`/`standard`/`minimal`/`ultrathin`), via `concerns:["agents"]` e via heurística de tarefa («AI agent … kill-switch»): REQ-AGN-001…004 presentes em todos; `category` elidida nos níveis dietados (derivável pela gramática v1.10); `description` publicada em standard/minimal, nenhuma em ultrathin — **só após a alteração desta linha (diferença 2 abaixo)** |
| `declared_gap` / `coverage_gaps` nos níveis dietados | ✅ nada desaparece — vivem em `consult` / `query` / `resolve_entities`, que não têm `detail`; `prepare` não os transporta em nenhum nível (nem antes nem agora) |
| Orçamentos de payload (vitest, `JSON.length/4`) | ✅ dentro dos limites. f1: full 18.903 (= beta.2) · standard **6.227**/6.500 · minimal **5.588**/5.800 · ultrathin **3.696**/3.870. f2: full 24.730 (beta.2 24.731) · standard **8.422**/8.500 · minimal **7.703**/8.000 · ultrathin **4.612**/4.840. Desvio vs beta.2: +17/+17/+8 e +11/+11/+6 tokens (texto da legenda, abaixo) |
| `full` byte-igual a beta.2? | ❌ esperado: `manual_commit_sha` mudou em todas as 131 entradas de grounding (`09b20f6f` → `171db83d`); contagem de tokens igual em f1 |
| `npm run smoke:mcp` | ✅ (tools/list, trace total=270 sem fuga de IRI, recurso codegen-instructions byte-igual) |

## Diferenças face à estável (AGENTS.md regra 10 — superfície servida)

1. **Elisão de `category` nos níveis dietados usava «prefixo antes do primeiro `-`»** (`prepare-codegen-context.ts`, `categoryIsDerivable` + legendas `provenance_legend`/`detail_encoding`). Sítio inexistente na estável — a auditoria de master («nenhum sítio assumia a gramática antiga») não o podia ver. Com `REQ-AGN-001` o guard lossless mantinha `category: "AGN"` inline (correcto, nunca silencioso), mas a legenda dizia o contrário. Alinhado com a fonte única `requirementCategoryOf` (segmento antes do número); guard mantido; legendas reescritas. O teste de invariante bundle-wide (`caps-resource.test.ts`) foi o único teste real a falhar (`expected 'REQ' to be 'AGN'`) e passou a usar a fonte única.
2. **`prepare_sbd_toe_codegen_context` aceita `concerns:["agents"]`** (léxico `VALID_CONCERNS` + heurísticas `ai agent`, `agentic`, `kill-switch`/`kill switch`, `autonomy level`; `CONCERN_TO_SLICE_FAMILY.agents = null`, nenhum controlo inventado). Na estável `agents` é consult-only por desenho (rationale: `get_threat_landscape` sem capítulo de domínio) — rationale que não se aplica a `prepare`, que resolve via `concernsMap`. Sem isto a verificação 3 do despacho («requisitos AGN nos conjuntos activados») era impossível: o léxico rejeitava `agents` (`debug.rejected_candidates`) e o pedido caía em `needs_decomposition`. Aditivo; descrição do schema em `index.ts` actualizada.
3. **Golden snapshots regenerados** (8 ficheiros, +149/−149): 131× `manual_commit_sha`, 8× `name` + 4× `description` (asteriscos markdown removidos upstream), 6× `note` (legenda). Nenhuma linha adicionada/removida — sem alteração estrutural.

## Discrepância face ao despacho (reportada, não reconciliada)

O despacho diz «bundle tem +64 arestas de overlay, +32 EP». Medido neste checkout (beta.2 → beta.3): `overlay_mappings.jsonl` 5508 → **6360 (+852)**, `cross_layer_referrals.jsonl` 6366 → **7218 (+852)**, `external_frameworks` 4 → **6**, `evidence_patterns.json` 251 → **255 (+4)**, `requirements.json` 251 → **255 (+4)**. Os «+64 / +32» podem referir-se a outra granularidade upstream (Codex); não os encontro nos ficheiros materializados. A pedir confirmação ao Orchestrator/Codex, sem bloquear.

## Ficheiros alterados (além dos vindos de master por cherry-pick)

`package.json`/`package-lock.json` (→ 0.20.0-beta.3) · `CHANGELOG.md` (secção beta: 0.20.0-beta.3; entrada 0.10.2 de master mantida como histórico da estável) · `AI-USE-DISCLOSURE.md` (lado desta linha mantido; sem nova ferramenta) · `src/index.ts` (merge manual + descrição de `concerns` em `prepare`) · `src/tools/prepare-codegen-context.ts` (v1.10 category segment; `agents`) · `src/tools/prepare-codegen-context.{caps-resource,detail}.test.ts` · `src/tools/__snapshots__/codegen-detail/*` (8). Não tocado: `FREEZE-REGISTRY.md` (não é evento de freeze), `README.md`, `CITATION.cff`, `data/upstream/graph-runtime-lock.json` (idêntico a master).

## Pendente (fora de Pontifex — os mesmos da estável)

1. Programme lead: merge em `0.20-beta` (PR se o push directo for rejeitado); sem tag `v0.20.0-beta.3`, sem npm.
2. Codex / programme lead: release formal do KG + `mcp-stable` → re-pin `source: release` em ambas as linhas.
3. Manual (via Orchestrator): correcção das citações legadas → recompile → `declared_gap` desaparecem sozinhos.
4. Codex: refresh de `requirement_control_links` → `coverage_gaps` a 0 e `trace_sbd_toe_graph anchor: REQ-AGN-*` deixa de ser vazio, sem alteração de código.
5. Orchestrator/Codex: confirmar a origem dos «+64 arestas / +32 EP».
