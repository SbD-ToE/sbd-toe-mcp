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

# EPIC — v2: SPARQL graph-query capability (linha beta `0.20.x`)

**Home:** `sbd-toe-mcp-poc_0.20.0` (branch `0.20-beta`, version `0.20.0-beta.0`).
**Estável paralelo:** `0.10.x`/`0.11.x` (`master`, `latest`) — **intocado**.

## ⟳ PIVOT (2026-06-27) — de "refactor" para "capacidade nova"

Piloto (`resolve_entities`) deu gate decisivo: é **filtro de atributos plano**, não travessia → SPARQL
seria **pior** (achatar→reconstruir, mais código). E `get_threat_landscape` é **graph-light** (2+5 links).
**Em nenhuma tool existente o SPARQL simplifica materialmente → tese "refactor" cai.**

Análise de topologia confirmou: o grafo é **shallow / em estrela** (hubs `Slice` e `ControlObjective`;
`Control`/`Threat`/`EvidencePattern` são *sinks*). Logo o valor não é "deep paths" — é **star-joins de
2-hop** que hoje não existem como tool. **v2 = adicionar UMA capacidade nova; não migrar tool nenhuma.**

---

## Objetivo

Adicionar o tool **`trace_sbd_toe_graph`** (nome provisório): **lentes multi-hop curadas** sobre a
projeção RDF, determinísticas e paginadas, servindo rastreabilidade que hoje está presa dentro de
tools ou não existe. **Aditivo** — não altera a surface existente.

### Lentes curadas (o valor do tool — ancoradas na topologia real)

| Lens | Caminho (hub `ControlObjective`) | Pergunta que responde |
|---|---|---|
| **`slice_implementation`** 🏆 | `Slice ← objectives → {Mechanisms, Practices}` | "como é este slice realizado?" |
| **`objective_realization`** | `ControlObjective → {Mechanism, Practice}` | "o que implementa+realiza este objetivo?" |
| **`mechanism_provenance`** | `Mechanism/Practice → objectives → Slices` | "onde é usado este mecanismo?" (impacto) |

*(Candidata 4ª lens — `antipattern_impact` `AntiPattern→{Threats,Requirements}→Controls` — adiada:
dados finos, 5+2 arestas. Add-on se houver procura.)*

---

## Invariantes (MANTER — violação = gate falha)

1. **Aditivo.** Não alterar contratos/outputs das tools existentes; só acrescentar o tool novo.
2. **`consumed-bundle.json` idêntico ao estável.**
3. **Determinismo:** `ORDER BY` total + paginação (garantido pelo GraphStore, s2).
4. **Coverage-preserving:** totais + cursor; sem truncar em silêncio.
5. **Sem fuga de internals:** input/output usam **ids de entidade**, nunca IRIs provisórias.
6. **Offline / `npx` / cross-platform:** só Oxigraph WASM.
7. **Sem builder logic** upstream. IRIs provisórias; esquema canónico = decisão upstream antes de graduar.

---

## Garantia entre passos

Tool **novo** → sem baseline de paridade. Gate de cada slice (tester independente):
**golden snapshots** (output fixa para inputs fixos) + **determinismo** (2× idêntico) +
**coverage** (páginas somam ao total) + **no-leak** (nenhuma IRI na output) + **suite completa** verde.

Fallback: se as lentes não derem valor real, ou determinismo/coverage falharem → **dropa o tool**
(aditivo, zero dano no estável).

---

## Orçamento (s0; foundation s1+s2 fechada)

| Gate | Tipo | Orçamento | Estado |
|---|---|---|---|
| Offline / nativo | 🔴 hard | sem nativo | ✅ WASM puro |
| Determinismo | 🔴 hard | `ORDER BY` | ✅ (s2) |
| Cold-start | 🟡 soft | ≤ +150 ms | ✅ ~+47 ms |
| Size | 🟡 soft | ≤ 8 MB | ✅ +7.89 MB (tarball intocado) |

---

## Slices

- **s0** — spike & gates **[DONE]** (`spike/sparql-gate-check.mjs`).
- **s1** — projeção RDF **[DONE]** (`src/serving/rdf/projection.ts`, 789 triplos). `4542d0e`.
- **s2** — GraphStore **[DONE]** (`src/serving/rdf/graph-store.ts`, ORDER BY guard + paging). `850d1ac`.

### s3 — Desenho & contrato do tool  *(depends_on: s2)*  ← **PRÓXIMA**
- **Create:** `s3-tool-design/brief.md` — contrato input (`lens`, `anchor?`, `page`, `pageSize`) /
  output (rows por ids, `total`/`cursor`, `provenance`, `next`); registry das 3 lentes (SPARQL curado
  com `ORDER BY`); helper `idFromIri()` (inverso de `iri()`) para o no-leak.
- **Gate:** contrato revisto; cada lens justificada pela topologia (não duplica tool existente);
  output validado contra resultado real do GraphStore.

### s4 — Implementação do core  *(depends_on: s3)*
- **Create:** `src/tools/trace-graph.ts` (registry de templates por lens, parametrizados por `anchor`;
  handler args→SPARQL→GraphStore→ids).
- **Test (gate):** determinismo, coverage/paginação, no-leak, **golden snapshot por lens**.

### s5 — Wire-in MCP + integração  *(depends_on: s4)*
- **Alter (aditivo):** registar o tool no `src/index.ts` (+ afordâncias/`next`).
- **Test (gate):** **suite completa** verde; teste MCP-level do tool.

### s6 — Release beta  *(depends_on: s5)*
- **Create:** CHANGELOG `0.20.0-beta.0`; nota FREEZE-REGISTRY (betas não-citáveis).
- **Test (gate):** push `0.20-beta` → tag `v0.20.0-beta.0` → `@beta` (latest intocado), GH pre-release.
  Valida também o pipeline prerelease + o fix OIDC.

---

## Inventário
**CRIAR:** `src/tools/trace-graph.ts` (+ registry), `src/serving/rdf/*` (feito), golden snapshots, CHANGELOG/FREEZE.
**ALTERAR (aditivo):** `src/index.ts` (registar tool); `package.json` (`oxigraph`, instalada).
**MANTER:** todas as tools existentes + surface; `consumed-bundle.json`; coverage-envelope; offline.
**TESTAR:** projeção (s1), GraphStore (s2), tool novo (determinismo+coverage+no-leak+golden), suite, orçamento.

## Papéis
sync (mantém epic + abre briefs) · executor (implementa) · tester (valida gate) ·
programme-lead (ratifica IRIs canónicas com upstream antes de graduar).
