// trace_sbd_toe_graph (v2 / s4)
// Curated multi-hop lenses over the AppSec Core v1 relation graph (RDF projection).
// Additive capability — does NOT change any existing tool. Deterministic (ORDER BY),
// coverage-preserving (total + cursor), and no-leak (output is entity ids, never IRIs).

import { query, type QueryPage } from "../serving/rdf/graph-store.js";
import { iri, idFromIri, rel } from "../serving/rdf/projection.js";

export type GraphLens =
  | "slice_implementation"
  | "objective_realization"
  | "mechanism_provenance";

const REL_SLICE = rel("belongsToSlice");
const REL_MECH = rel("objective_implemented_by_mechanism");
const REL_PRAC = rel("objective_realized_by_practice");

const LENSES: Record<GraphLens, (anchorIri?: string) => string> = {
  slice_implementation: (a) => `
    SELECT ?slice ?objective ?kind ?target WHERE {
      ?objective <${REL_SLICE}> ?slice .
      { ?objective <${REL_MECH}> ?target . BIND("mechanism" AS ?kind) }
      UNION
      { ?objective <${REL_PRAC}> ?target . BIND("practice" AS ?kind) }
      ${a ? `FILTER(?slice = <${a}>)` : ""}
    } ORDER BY ?slice ?objective ?kind ?target`,
  objective_realization: (a) => `
    SELECT ?objective ?kind ?target WHERE {
      { ?objective <${REL_MECH}> ?target . BIND("mechanism" AS ?kind) }
      UNION
      { ?objective <${REL_PRAC}> ?target . BIND("practice" AS ?kind) }
      ${a ? `FILTER(?objective = <${a}>)` : ""}
    } ORDER BY ?objective ?kind ?target`,
  mechanism_provenance: (a) => `
    SELECT ?target ?objective ?slice WHERE {
      { ?objective <${REL_MECH}> ?target }
      UNION
      { ?objective <${REL_PRAC}> ?target }
      OPTIONAL { ?objective <${REL_SLICE}> ?slice }
      ${a ? `FILTER(?target = <${a}>)` : ""}
    } ORDER BY ?target ?objective ?slice`,
};

const COLUMNS: Record<GraphLens, string[]> = {
  slice_implementation: ["slice", "objective", "kind", "target"],
  objective_realization: ["objective", "kind", "target"],
  mechanism_provenance: ["target", "objective", "slice"],
};

/** Columns that are SPARQL literals (kept verbatim); all others are entity IRIs → idFromIri. */
const LITERAL_COLUMNS = new Set(["kind"]);

/**
 * 0.20.0-beta.42 — a coluna por onde CADA lente ancora. Sem isto, uma âncora que não é do
 * tipo da lente (um id de requisito numa lente de slices) devolvia 0 linhas em silêncio.
 */
const ANCHOR_COLUMN: Record<GraphLens, string> = {
  slice_implementation: "slice",
  objective_realization: "objective",
  mechanism_provenance: "target",
};

const MAX_PAGE_SIZE = 200;

export interface TraceGraphResult {
  lens: GraphLens;
  anchor: string | null;
  /** 0.20.0-beta.42 — porque é que a travessia veio vazia, e que âncoras a lente aceita. */
  empty_traversal?: Record<string, unknown>;
  next?: { intent: string; tool: string; with: string; kind: string }[];
  rows: Record<string, string | undefined>[];
  total: number;
  page: number;
  pageSize: number;
  cursor: number | null;
  provenance: {
    content_type: "derived";
    produced_by: string;
    source_data: string;
    note: string;
  };
}

export function handleTraceGraph(args: Record<string, unknown>): TraceGraphResult {
  const lens = args["lens"];
  if (typeof lens !== "string" || !(lens in LENSES)) {
    throw Object.assign(
      new Error(`Invalid "lens". Use one of: ${Object.keys(LENSES).join(", ")}.`),
      { rpcError: { code: -32602, message: 'Invalid or missing "lens".' } },
    );
  }
  const l = lens as GraphLens;

  const anchorRaw = args["anchor"];
  const anchor = typeof anchorRaw === "string" && anchorRaw.trim().length > 0 ? anchorRaw.trim() : null;
  const anchorIri = anchor ? iri(anchor) : undefined;

  const page = typeof args["page"] === "number" ? Math.max(0, Math.round(args["page"])) : 0;
  const pageSize =
    typeof args["pageSize"] === "number"
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.round(args["pageSize"])))
      : 50;

  const result: QueryPage = query(LENSES[l](anchorIri), { page, pageSize });

  const cols = COLUMNS[l];
  const rows = result.rows.map((raw) => {
    const out: Record<string, string | undefined> = {};
    for (const col of cols) {
      const value = raw[col];
      out[col] = value === undefined ? undefined : LITERAL_COLUMNS.has(col) ? value : idFromIri(value);
    }
    return out;
  });

  /**
   * 0.20.0-beta.42 — NUNCA-SILÊNCIO nesta superfície também (célula `never_silent` da matriz).
   *
   * Era a classe da b.41 numa superfície que ficou de fora — exactamente o padrão que o
   * auditor nomeou: «a classe é fechada onde o achado foi reportado e não é varrida às
   * superfícies irmãs». Uma âncora do tipo errado (um id de requisito numa lente de slices)
   * devolvia `rows: [], total: 0` e mais nada; o cenário TC-G-02 dava-o por declarado porque
   * a âncora vinha ecoada e havia `provenance.note` — uma fasquia baixa que a matriz subiu.
   *
   * As âncoras válidas DERIVAM-SE do grafo: é a coluna de ancoragem da mesma lente sem
   * filtro. Não há lista à mão, e uma projecção nova traz as suas âncoras sozinha.
   */
  const emptyAnchored =
    anchor !== null && result.total === 0
      ? (() => {
          const column = ANCHOR_COLUMN[l];
          const all: QueryPage = query(LENSES[l](), { page: 0, pageSize: MAX_PAGE_SIZE });
          const valid = [...new Set(all.rows.map((raw) => idFromIri(String(raw[column] ?? ""))).filter((x) => x.length > 0))].sort();
          return {
            requested_anchor: anchor,
            anchor_column: column,
            reason: valid.includes(anchor) ? "no_rows_for_anchor" : "anchor_not_in_lens",
            note: valid.includes(anchor)
              ? `\`${anchor}\` É uma âncora desta lente e não tem travessia publicada — o vazio é do CONTEÚDO, não do pedido.`
              : `\`${anchor}\` **não é uma âncora desta lente**: \`${l}\` ancora em \`${column}\`. Não é «não há travessia» — ` +
                "é «pediste por um eixo que esta lente não usa». As âncoras válidas vêm abaixo, derivadas do próprio grafo.",
            valid_anchors: {
              total: valid.length,
              sample: valid.slice(0, 12),
              ...(valid.length > 12 ? { note: `amostra de ${valid.length}; corre a lente sem \`anchor\` para as ver todas` } : {})
            },
            reach_with: `trace_sbd_toe_graph(lens="${l}"${valid.length > 0 ? `, anchor="${valid[0]}"` : ""})`
          };
        })()
      : undefined;

  return {
    lens: l,
    anchor,
    rows,
    ...(emptyAnchored ? { empty_traversal: emptyAnchored } : {}),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    cursor: result.cursor,
    provenance: {
      content_type: "derived",
      produced_by: "sparql_graph_query",
      source_data: "data/publish/runtime/* (RDF projection)",
      note:
        "Multi-hop traversal over the AppSec Core v1 relation graph via a curated SPARQL lens. " +
        "Deterministic (ORDER BY) and coverage-preserving (total + cursor). " +
        "IRIs are an internal projection detail; output is entity ids.",
    },
    /*
     * 0.20.0-beta.42 — a superfície navegava e não dizia para onde se podia ir a seguir
     * (célula `next` da matriz). Quando a travessia vem vazia, o passo seguinte é a
     * recuperação; quando traz linhas, é resolver as entidades que ela nomeia.
     */
    next: emptyAnchored
      ? [
          { intent: "A mesma lente sem âncora, para ver o que ela cobre", tool: "trace_sbd_toe_graph", with: `lens="${l}"`, kind: "structural" },
          { intent: "Uma âncora válida desta lente", tool: "trace_sbd_toe_graph", with: String(emptyAnchored.reach_with).replace(/^trace_sbd_toe_graph\(|\)$/g, ""), kind: "structural" }
        ]
      : [
          { intent: "Resolver as entidades que a travessia nomeia", tool: "resolve_entities", with: 'record_type="practice", filters', kind: "structural" },
          { intent: "Outra lente sobre o mesmo grafo", tool: "trace_sbd_toe_graph", with: `lens="${l === "slice_implementation" ? "mechanism_provenance" : "slice_implementation"}"`, kind: "structural" }
        ],
  };
}
