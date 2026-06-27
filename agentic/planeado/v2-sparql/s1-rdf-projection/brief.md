---
ai_assisted: true
model: Claude Opus 4.8 (1M context)
date: 2026-06-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s1
epic: v2-sparql
depends_on: s0 (done)
review_status: pending-human-review
---

# Brief — s1: camada de projeção RDF

## Objetivo

Criar a camada que projeta o bundle consumido (`data/publish/*`) para **triplos RDF**, com um
esquema de IRI **provisório e local**, de forma **determinística**. É a entrada do GraphStore (s2).
Não toca em tools nem na surface MCP. Não toca em `consumed-bundle.json`.

## Create

- `src/serving/rdf/projection.ts`
  - `projectBundleToTriples(): Triple[]` — lê e mapeia:
    - `data/publish/runtime/v1/relations.jsonl` → `<subject_id> <predicate> <object_id>`.
    - link tables (`requirement_control_links`, `antipattern_requirement_links`,
      `antipattern_threat_links`, `signal_evidence_links`, …) → `<source_id> <link_type> <target_id>`.
      ⚠️ **Fix do bug do spike:** alguns destes ficheiros são **objeto** (`{links:[…]}`/`{items:[…]}`),
      não array — detetar a coleção defensivamente (não silenciar: contar e logar por fonte).
    - entidades (requirements, controls, …) → triplos de tipo/atributos mínimos necessários às queries.
  - Esquema de IRI provisório centralizado: `iri(id)`, `rel(predicate)` sob base `https://sbd-toe.dev/v2/`.
  - `predicateManifest()` — predicado→IRI e tipo→IRI (o ponto único onde o esquema canónico
    upstream será trocado na graduação).

## Alter
- Nada de tools. (`package.json` já tem `oxigraph` — não é desta slice.)

## Maintain
- `consumed-bundle.json` intocado; dados consumidos como estão; sem builder logic.

## Test (GATE — fechado pelo tester independente)
- `src/serving/rdf/projection.test.ts`:
  1. **Counts:** `triples.length` == soma de arestas por fonte (relations + cada link table),
     com a contagem por-fonte logada (prova de que nenhuma fonte foi silenciosamente saltada).
  2. **Determinismo:** mesma input → **hash N-Triples idêntico** em 2 execuções.
  3. **Round-trip:** todo `id` de entrada aparece como IRI; nenhum id perdido.
  4. **IRI sanity:** ids com caracteres especiais → IRIs válidas (encode), sem colisões.
- Gate só fecha com os 4 verdes.

## Done quando
- `projection.ts` + testes verdes; contagem por-fonte logada e == esperado; hash determinístico.
- **Não** depende de Oxigraph (projeção é dados puros) → desacopla o risco do engine.
