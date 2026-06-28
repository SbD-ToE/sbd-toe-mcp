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

const MAX_PAGE_SIZE = 200;

export interface TraceGraphResult {
  lens: GraphLens;
  anchor: string | null;
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

  return {
    lens: l,
    anchor,
    rows,
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
  };
}
