# Brief: dev-build `kg-v1-manual-v1.6.7-aligned-2026-08-29` pinado — REQ-AGN servido, gramática v1.10, gaps declarados — 0.10.2 preparada (não commitada)

**Date:** 2026-08-29
**De:** Pontifex
**Para:** Orchestrator (fecho do brief 02-08 lado Pontifex) · Codex (visibilidade: ask 1 do handover executado) · programme lead (bump 0.10.2 + release formal do KG)
**Em resposta a:** `agentic/briefs/2026-08-02-orchestrator-to-pontifex-req-agn-surface-gap.md` + `sbd-ai-runtime/handover/em-curso/2026-08-29-codex-req-agn-absorption-via-b.md`
**Natureza:** relatório de execução (linha estável, dev-build, **sem release, sem npm publish, sem mcp-stable, sem commit**)

---

## TL;DR

Snapshot Codex pinado com digest verificado; REQ-AGN-001…004 resolvem e a categoria `AGN` está activa em L2/L3 (27 categorias, 255 requisitos em L3); os 20 requisitos sem ligação a controlo são servidos com a ausência declarada; as citações legadas `REQ-<CAT>-NNN` respondem com «citação legada não resolvível (finding editorial em curso)». Gramática v1.10 §1.18 codificada como fonte única (fullmatch). `npm run check` verde, 545/545 testes, pacote `release/sbd-toe-mcp-v0.10.2-bundle.*` gerado. Working tree em proposta.

## Identificadores (verificados, nunca inventados)

| Item | Valor |
|---|---|
| KG tag (dev-build) | `kg-v1-manual-v1.6.7-aligned-2026-08-29` → `762ccaafa5cacec44f203488c234be3a174ef780` |
| Snapshot | `sbd-toe-knowledge-graph/dist/sbd-toe-knowledge-graph-bundle-kg-v1-manual-v1.6.7-aligned-2026-08-29-snapshot.zip` |
| sha256 (calculado = sidecar = handover) | `a66c324575cede5ffb9e7c5ddae06bb8d090b3a1ec7150d53f80074f55185276` |
| Pin | `consumed-bundle.json` → `source: dev-build`, contrato **v1.10**, Manual v1.6.7 `171db83d`, ontologia `ontology-v1.1-fair-baseline` `84fe8bf6` |
| Verificador | `scripts/verify-consumed-bundle.mjs` ✅ (`npm run check`) |
| Diff de dados | 21 ficheiros do bundle alterados (+0 / −0), materializados por `sync-bundle` (só entradas de `bundle-files.json`) |
| Pacote preparado | `release/sbd-toe-mcp-v0.10.2-bundle.tar.gz` `391bc92698451ed4d5dc1061177b4ed1f06c847a56b517bd88e6e7623aa2c0d3` · `.zip` `a98a64d131055a7722e0b307d846845fbfb7744e5c94545c5b3fc681e0f40fbc` (dir `release/` é gitignored) |

## Ponto 2 — gramática de `requirement_id` (auditoria + resultado)

- **Auditoria:** nenhum sítio do servidor assumia `^[A-Z]{3}-\d{3}$` (nem regex, nem `split("-")`, nem prefixos). A resolução por ID era já igualdade estrita (`===`).
- **Resultado:** `src/serving/requirement-id.ts` — fonte única `REQUIREMENT_ID_PATTERN = /^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$/` (**fullmatch**, sem search, sem normalização de prefixos); `requirementCategoryOf` = segmento anterior ao número (`AGN`, nunca `REQ`); o loader sinaliza em stderr (nunca descarta, nunca reescreve) IDs publicados fora da gramática.
- **Casos obrigatórios (testados, unitário + servidor vivo):** `REQ-AGN-001` ✓ · `AUT-003` ✓ · `EX-AUT-003` ✗ e `resolve_entities` não resolve para `AUT-003` · `REQ-AUTH-001` ✗.
- `assets/agent-guide.md` §Identifier conventions: convenção de requisitos (duas formas, regra de categoria, prefixo `EX-` ilustrativo, regra das citações legadas).

## Ponto 3 — verificação funcional (servidor `dist/index.js` sobre stdio, bundle pinado)

| Verificação | Resultado |
|---|---|
| `resolve_entities` REQ-AGN-001…004 | ✅ 4/4 `total: 1`, `category: AGN`, `source_chapter: 2`, níveis 001/002 L1–L3, 003/004 L2–L3 |
| `consult_security_requirements` L2 | ✅ 230 requisitos, **27 categorias**, `AGN` activa, AGN ×4 servidos |
| `consult_security_requirements` L3 | ✅ **255 requisitos, 27 categorias**, AGN ×4 |
| `consult_security_requirements` L1 | ✅ 120 requisitos, 26 categorias (AGN 001/002 só — níveis como publicados) |
| `consult` `concerns:["agents"]` (novo) | ✅ exactamente REQ-AGN-001…004; 0 controlos directos, 0 derivados (`domain_mapping` sem `AGN`); gap declarado 4/4 |
| 20 requisitos sem controlo (handover (a)) | ✅ servidos em L3 **e** declarados: `coverage_gaps.requirements_without_control_link = {count: 20, requirement_ids: [os 20]}` + `rule_trace` `REQUIREMENT_WITHOUT_CONTROL_LINK: 20 …`; L2 18, L1 4 (GOV-014, REQ-AGN-001/002, VAL-008) |
| 21 citações legadas (handover (b)) | ✅ 16 IDs / **20 menções** em `chunk_entity_mentions` respondem `match: "declared_gap"`, `kind: legacy_citation_unresolvable`, nota com a frase do handover + `cited_in` (chunk/document ids); `resolve_entities` com `filters.requirement_id` idem em `meta.declared_gap`. **`REQ-AC-010` (21.ª) não existe em `chunk_entity_mentions` deste bundle** (4 ocorrências textuais em `mcp_chunks`, sem menção extraída) — nada a declarar até o KG a surfacear |
| `REQ-010` (forma base citada, não publicada) | ✅ `declared_gap`, `kind: citation_unresolvable` (não legado) |
| `EX-AUT-003` / `CTRL-06` | ✅ sem exact-match, sem gap, fallback semântico inalterado; nunca `AUT-003` |
| `get_sbd_toe_verification_matrix` L3 | ✅ 255 EvidencePatterns, 0 requisitos sem EP (255/255) |
| `sbd://toe/version` | ✅ ecoa o pin (tag, sha256, `source: dev-build`, contrato v1.10, Manual v1.6.7) |
| `npm run check` | ✅ tsc + disclosure + verify-consumed-bundle |
| `npm test` | ✅ 31 ficheiros, **545/545** (513 antes; +32 novos) |

## Ponto 4 — gap interino AGN

Não existia declaração interina no código servido (item 1 do brief de 02-08 nunca foi implementado — ver `git log`; nada em `src/` referia AGN). Nada a levantar; o fecho é o próprio dado publicado.

## Ficheiros alterados (working tree, não commitado)

Código/serving: `src/serving/requirement-id.ts` (novo) · `src/tools/ontology-loader.ts` · `src/tools/consult-security-requirements.ts` · `src/tools/structured-tools.ts` · `src/tools/resolve-entities.ts` · `src/index.ts`.
Testes: `src/serving/requirement-id.test.ts` (novo) · `src/tools/req-agn-serving.test.ts` (novo) · `src/tools/consult-security-requirements.test.ts`.
Docs/guia: `assets/agent-guide.md` · `CHANGELOG.md` (entrada 0.10.2 proposta) · `AI-USE-DISCLOSURE.md` (Fable 5).
Pin/dados: `consumed-bundle.json` + 21 ficheiros de `data/` (bundle). Bump: `package.json`/`package-lock.json` 0.10.1 → 0.10.2.
Não tocado: `FREEZE-REGISTRY.md` (não é evento de freeze), `README.md`, `CITATION.cff`.

## Superfície servida — mudanças visíveis ao consumidor (AGENTS.md regra 10)

Aditivas: `consult` ganha `coverage_gaps` + linha de `rule_trace` + valor `agents` em `concerns`; `query_sbd_toe_entities` ganha `match: "declared_gap"` + `declared_gap`; `resolve_entities` ganha `meta.declared_gap`. Nenhum campo removido/renomeado.

## Pendente da release formal do KG (fora do meu âmbito)

1. **Codex / programme lead:** release formal `vX.Y.Z` do KG com o conteúdo deste dev-build (+ `.sha256` sidecar no GitHub Release) e mover `mcp-stable` → Pontifex re-pina com `sync-bundle --from-release` (`source: release`) antes da release 0.10.2 formal, conforme alignment policy (v1.5.0 continua o formal corrente).
2. **Manual (via Orchestrator):** correcção das 21 citações legadas (dispatcher 2026-08-29) → Codex recompila → os `declared_gap` desaparecem sozinhos (são derivados dos dados, não hardcoded).
3. **Codex (decisão separada):** refresh de `requirement_control_links` para os 20 requisitos pós-2026-04-07 → `coverage_gaps` cai a 0 sem alteração de código.
4. **Programme lead:** decidir commit + tag `v0.10.2` (release.yml publica no npm a partir da tag); se preferir esperar pelo formal do KG, o working tree fica em proposta.

## Proposta de commit (não executada)

```
release(0.10.2): dev-build KG pin 2026-08-29 (REQ-AGN served) + id grammar v1.10 + declared gaps

- pin dev-build kg-v1-manual-v1.6.7-aligned-2026-08-29 (762ccaaf), sha256
  a66c3245…5276 verified; contract v1.10 §1.18; Manual v1.6.7 @ 171db83d
- REQ-AGN-001…004 served: requirements 251→255, categories 26→27 (AGN),
  EvidencePatterns 255/255; overlay gains AI Act + ENISA-CSA (v1.9 collateral)
- src/serving/requirement-id.ts: single-source grammar
  ^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$ (fullmatch; EX-/REQ-AUTH- rejected)
- consult: coverage_gaps.requirements_without_control_link (20 declared) +
  concern `agents`; query_sbd_toe_entities/resolve_entities: declared_gap for
  legacy REQ-<CAT>-NNN citations («citação legada não resolvível …»)
- agent-guide: requirement id convention + gap interpretation; CHANGELOG 0.10.2
- tests: +32 (545/545); npm run check green

Closes Pontifex side of brief 2026-08-02 (REQ-AGN surface gap).
Not a freeze event; FREEZE-REGISTRY unchanged. KG formal release + mcp-stable
pending upstream (re-pin before formal 0.10.2 release).
```
