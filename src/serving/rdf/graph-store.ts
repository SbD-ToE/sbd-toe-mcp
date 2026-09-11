// GraphStore (v2 / s2)
// Oxigraph (WASM) wrapper over the RDF projection. Loads triples once at startup and
// exposes a query() that ENFORCES the serving invariants:
//   - determinism: SPARQL must carry ORDER BY (total order) — guarded, else throws
//   - coverage-preserving: every call returns the full `total`; pagination via cursor
// No native deps; no MCP surface. consumed-bundle.json untouched.

import { Store, namedNode, quad } from "oxigraph";

import { projectBundleToTriples } from "./projection.js";

const ORDER_BY_RE = /\border\s+by\b/i;

type SparqlRow = Map<string, { value: string } | undefined>;

let store: Store | undefined;

export function getStore(): Store {
  if (store) return store;
  const s = new Store();
  const { triples } = projectBundleToTriples();
  for (const t of triples) s.add(quad(namedNode(t.s), namedNode(t.p), namedNode(t.o)));
  store = s;
  return s;
}

/** Test hook — drop the cached store so the next getStore() rebuilds. */
export function _resetStore(): void {
  store = undefined;
}

export interface QueryOptions {
  /** 0-based page index. */
  page?: number;
  /** Rows per page. */
  pageSize?: number;
}

export interface QueryPage {
  rows: Record<string, string | undefined>[];
  /** Total matching rows — coverage-preserving (never silently truncated). */
  total: number;
  page: number;
  pageSize: number;
  /** Next offset, or null when the last page is reached. */
  cursor: number | null;
}

/**
 * Run an ordered SELECT and return a coverage-preserving page.
 * The graph is tiny, so the full ordered result is materialised once and sliced in
 * memory — guarantees `total` without a second COUNT query.
 */
export function query(sparql: string, opts: QueryOptions = {}): QueryPage {
  if (!ORDER_BY_RE.test(sparql)) {
    throw new Error(
      "GraphStore.query: SPARQL must contain ORDER BY (determinism + coverage-preserving). " +
        "Add a total-order ORDER BY clause.",
    );
  }
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = Math.max(1, opts.pageSize ?? 50);

  const all = getStore().query(sparql) as unknown as SparqlRow[];
  const total = all.length;
  const start = page * pageSize;
  const slice = all.slice(start, start + pageSize);

  const rows = slice.map((m) => {
    const obj: Record<string, string | undefined> = {};
    for (const [key, term] of m) obj[key] = term?.value;
    return obj;
  });

  const nextOffset = start + slice.length;
  return {
    rows,
    total,
    page,
    pageSize,
    cursor: nextOffset < total ? nextOffset : null,
  };
}
