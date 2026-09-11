---
ai_assisted: true
model: Claude Opus 4.8 (1M context)
date: 2026-06-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s3
epic: v2-sparql
depends_on: s2 (done)
review_status: pending-human-review
---

# Brief — s3: desenho & contrato de `trace_sbd_toe_graph`

## Objetivo
Fixar o contrato do tool novo (aditivo) e os templates SPARQL das 3 lentes curadas, antes de implementar (s4).

## Contrato

### Input
```
trace_sbd_toe_graph(
  lens: "slice_implementation" | "objective_realization" | "mechanism_provenance",  // obrigatório
  anchor?: string,   // id de entidade para scope (slice / objective / mechanism|practice). Omisso = tudo.
  page?: number,     // 0-based, default 0
  pageSize?: number  // default 50, máx 200
)
```

### Output
```
{
  lens, anchor,
  rows: Array<Record<string,string>>,   // por LENS (ids, NUNCA IRIs). Ver shapes abaixo.
  total, page, pageSize, cursor,        // coverage-preserving (do GraphStore)
  provenance: { content_type:"derived", produced_by:"sparql_graph_query",
                source_data:"data/publish/runtime/* (RDF projection)", note:"..." },
  next?: Affordance[]                   // advisory band (RF-H), se aplicável
}
```

### Shapes de `rows` por lens
- `slice_implementation`: `{ slice, objective, kind:"mechanism"|"practice", target }`
- `objective_realization`: `{ objective, kind, target }`
- `mechanism_provenance` : `{ target, objective, slice? }`

## Templates SPARQL (cada um com ORDER BY total; `anchor` injeta um `FILTER`)

**slice_implementation**
```sparql
SELECT ?slice ?objective ?kind ?target WHERE {
  ?objective <REL/belongsToSlice> ?slice .
  { ?objective <REL/objective_implemented_by_mechanism> ?target . BIND("mechanism" AS ?kind) }
  UNION
  { ?objective <REL/objective_realized_by_practice> ?target . BIND("practice" AS ?kind) }
  {{ANCHOR: FILTER(?slice = <anchorIRI>)}}
} ORDER BY ?slice ?objective ?kind ?target
```

**objective_realization** — idem sem o `belongsToSlice`; `ORDER BY ?objective ?kind ?target`; anchor → `FILTER(?objective = …)`.

**mechanism_provenance** (reverso) — `?target` é o anchor (mechanism/practice):
```sparql
SELECT ?target ?objective ?slice WHERE {
  { ?objective <REL/objective_implemented_by_mechanism> ?target }
  UNION
  { ?objective <REL/objective_realized_by_practice> ?target }
  OPTIONAL { ?objective <REL/belongsToSlice> ?slice }
  {{ANCHOR: FILTER(?target = <anchorIRI>)}}
} ORDER BY ?target ?objective ?slice
```

## No-leak (invariante 5)
- `anchor` (id) → IRI via `iri()` só para o `FILTER`.
- toda a coluna de output passa por **`idFromIri()`** (novo helper em `projection.ts`, inverso de `iri()`):
  `decodeURIComponent(value.slice(BASE.length))`. Nenhuma IRI `https://sbd-toe.dev/v2/...` na output.
- Guard de teste: `JSON.stringify(rows)` não contém `"sbd-toe.dev"`.

## Gate (tester)
- Contrato coerente; 3 lentes correm via GraphStore e devolvem ≥1 row (com o bundle atual).
- `idFromIri(iri(x)) === x` (round-trip).
- Nenhuma lens duplica tool existente (slice/objective traceability não é servida hoje).

## Done quando
- Este contrato revisto + `idFromIri` especificado. (Implementação = s4.)
