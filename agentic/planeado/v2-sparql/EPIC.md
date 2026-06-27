---
ai_assisted: true
model: Claude Opus 4.8 (1M context)
date: 2026-06-27
purpose: governance-doc
produced_by: sync
target: executor+tester
epic: v2-sparql
review_status: pending-human-review
---

# EPIC — v2: SPARQL serving engine (linha beta `0.20.x`)

**Home:** `sbd-toe-mcp-poc_0.20.0` (clone independente, branch `0.20-beta`, version `0.20.0-beta.0`).
**Linha estável paralela:** `0.10.x`/`0.11.x` (`master`, dist-tag `latest`) — **intocada**.
**Decisão (2026-06-27):** SPARQL é o destino do serving. **TS graph-index é o fallback documentado**
(se um *hard gate* falhar ou houver regressão → reverte para TS no estável). Ver `[[dual-line-0.20-beta-strategy]]`.

---

## Objetivo

Substituir a travessia de grafo **hand-rolled** das tools (os ~32 Maps de adjacência em 11 tools)
por um **engine SPARQL embebido (Oxigraph/WASM)** sobre uma projeção RDF do bundle já consumido —
**sem mudar a surface MCP, sem mudar os dados, sem perder determinismo**.

Ganho: tools mais simples (traversal/join/filtro → query declarativa), e a fundação para
"query ontologia" (FAIR/RDF) como deliverable upstream futuro e separado.

---

## Invariantes (MANTER em TODAS as slices — qualquer violação = gate falha)

1. **Surface MCP inalterada.** Nomes de tools, input schemas, output shapes, `next` band — idênticos.
2. **Paridade de output byte-a-byte** com o engine estável (TS). É a **garantia entre passos** (ver abaixo).
3. **`consumed-bundle.json` idêntico ao estável.** A beta muda o *engine*, não os *dados*.
4. **Determinismo:** toda a query SPARQL tem `ORDER BY` por ordem **total** + `LIMIT/OFFSET` explícitos.
   Teste de reprodutibilidade (2× idêntico) obrigatório.
5. **Coverage-preserving:** nunca truncar em silêncio; expor totais + cursor (regra `[[serving-tools-must-paginate]]`).
6. **Offline / `npx` / cross-platform:** só Oxigraph WASM. Zero deps nativas, zero install scripts.
7. **Sem mover builder logic** do upstream para cá (CLAUDE.md hard constraint). IRIs provisórias locais
   no spike; o esquema **canónico** de IRIs é decisão **upstream** (Codex/ontology) antes de graduar.

---

## A garantia entre passos ("garante entre passos")

Cada slice fecha **só** quando um **tester independente** confirma o seu gate. O gate central é
**paridade diferencial**: o engine SPARQL tem de produzir **a mesma output** que o engine estável (TS)
para o mesmo input. Mecanismo:

- **Golden outputs:** capturar as outputs do engine estável (`master`) para um conjunto de inputs por tool.
- **Diff gate:** a tool migrada para SPARQL corre os mesmos inputs; `diff == ∅`. Senão → slice **não fecha**.
- Os **testes existentes** (513) correm **sem alteração** sobre o engine novo (são, eles próprios, golden).

Fallback: se um **hard gate** (offline/determinismo) falhar, ou a paridade for **impossível** numa tool,
ou o orçamento de integração estourar → **PARA SPARQL, reverte para TS graph-index no estável (0.11.0)**.

---

## Orçamento (gates medidos — fonte: `spike/sparql-gate-check.mjs`, s0)

| Gate | Tipo | Orçamento | s0 medido |
|---|---|---|---|
| Offline / `npx` / nativo | 🔴 hard | sem nativo, importa em Node | ✅ WASM puro |
| Determinismo | 🔴 hard | `ORDER BY` → reprodutível | ✅ PASS |
| Cold-start | 🟡 soft | ≤ +150 ms | ✅ ~+47 ms (init 23 + ingest 24) |
| Size (footprint) | 🟡 soft | ≤ 8 MB | ✅ +7.89 MB (tarball intocado) |
| Memória RSS | informativo | — | +10.4 MB |

---

## Slices (sequência com depends_on + gate)

### s0 — Spike & baseline de gates  **[DONE]**
- **Create:** `spike/sparql-gate-check.mjs`.
- **Gate (tester):** todos os hard gates passam + números registados. ✅ (ver tabela acima).

### s1 — Camada de projeção RDF  *(depends_on: s0)*
- **Create:** `src/serving/rdf/projection.ts` — mapeia o bundle (`relations.jsonl` + link tables +
  entidades) → triplos RDF com esquema de IRI **provisório**; emite também um manifesto
  predicado→IRI / tipo→IRI.
- **Maintain:** consome `data/publish/*` como está; `consumed-bundle.json` intocado.
- **Test (gate):** nº de triplos == soma de arestas esperadas por fonte; **output determinística**
  (mesmo input → hash N-Triples idêntico); nenhum id perdido (round-trip). Fix do bug do spike
  (link tables são objeto-não-array nalguns ficheiros) entra aqui.

### s2 — GraphStore (serviço de query)  *(depends_on: s1)*
- **Create:** `src/serving/rdf/graph-store.ts` — wrapper Oxigraph: carrega triplos ao arranque,
  expõe `query(sparql, {page, cursor})` que **força** `ORDER BY` + paginação + integra o coverage-envelope.
- **Create:** guard/lint que **rejeita** queries sem `ORDER BY` (determinismo by-construction-of-the-wrapper).
- **Test (gate):** teste de reprodutibilidade (2× idêntico); teste de paginação/coverage (totais+cursor,
  sem truncar); o guard rejeita uma query não-ordenada.

### s3 — Tool piloto: `get_threat_landscape`  *(depends_on: s2)*
- **Alter:** `src/tools/get-threat-landscape.ts` → query via `GraphStore` (substitui os 3 Maps + 18 walk-ops).
- **Maintain:** output shape EXATA.
- **Test (gate):** `get-threat-landscape.test.ts` passa **sem alteração** + **paridade diferencial**
  vs golden do estável (`diff == ∅`).

### s4.N — Migração das restantes tools de travessia  *(depends_on: s3; uma sub-slice por tool)*
Ordem por complexidade decrescente (maior ganho primeiro): `prepare-codegen-context` (47 walk-ops),
`consult-security-requirements`, `map-review-scope`, `plan-repo-governance`, `get-guide-by-role`,
`map-regulatory-activation`, `resolve-entities`, `assess-implementation`, `generate-sbd-toe-skill`,
`ontology-loader` (consumers).
- **Alter:** cada tool → SPARQL.   **Maintain:** surface + output.
- **Test (gate) por tool:** testes existentes verdes + paridade diferencial. Slice não fecha sem `diff == ∅`.
- **Não migrar:** `search_sbd_toe_manual` e lookups puros (não fazem travessia) — ficam como estão.

### s5 — Integração & re-medição de orçamento  *(depends_on: s4.N)*
- **Test (gate):** **513 testes** verdes sobre o engine novo; `npm pack` → Δ-tarball; cold-start do
  servidor real; RSS — todos dentro do orçamento. Qualquer estouro = fallback.

### s6 — Release beta  *(depends_on: s5)*
- **Create:** entrada CHANGELOG `0.20.0-beta.0`; nota no `FREEZE-REGISTRY.md` (**betas não-citáveis**).
- **Maintain:** o `release.yml` da beta já suporta prerelease (commit `4894c1a`).
- **Test (gate):** push `0.20-beta` → tag `v0.20.0-beta.0` → publica em **`@beta`** (`latest` intocado),
  GitHub pre-release. **Valida também o pipeline prerelease + o fix OIDC/trusted-publishing.**

---

## Inventário CRIAR / ALTERAR / MANTER / TESTAR (resumo)

**CRIAR:** `src/serving/rdf/projection.ts`, `src/serving/rdf/graph-store.ts`, golden-output fixtures +
harness de paridade diferencial, `spike/` (s0, feito), entrada CHANGELOG/FREEZE beta.
**ALTERAR:** as ~11 tools de travessia (s3–s4); `package.json` (dep `oxigraph`, já instalada).
**MANTER:** surface MCP, `consumed-bundle.json`, coverage-envelope, `next` band, determinismo, offline.
**TESTAR:** projeção (counts+hash), GraphStore (determinismo+paginação), paridade diferencial por tool,
suite 513, orçamento de integração.

---

## Papéis (modelo agentic)

- **sync:** mantém este epic + abre as slice briefs em `agentic/planeado/v2-sparql/sNN-*/brief.md`.
- **executor:** implementa a slice ativa.
- **tester:** valida o gate **independentemente** (paridade diferencial + testes) antes de fechar.
- **programme-lead (humano):** ratifica o esquema de IRIs canónico (com upstream) **antes da graduação**
  da beta a estável; aprova fallback se acionado.
