import { describe, it, expect, beforeEach } from "vitest";

import { query, _resetStore } from "./graph-store.js";
import { rel } from "./projection.js";

// 2-hop join over the real bundle: control objectives → mechanism, grouped by slice.
const Q = `
  SELECT ?slice ?mech WHERE {
    ?obj <${rel("belongsToSlice")}> ?slice .
    ?obj <${rel("objective_implemented_by_mechanism")}> ?mech .
  } ORDER BY ?slice ?mech`;

describe("GraphStore (v2 / s2)", () => {
  beforeEach(() => _resetStore());

  it("rejects queries without ORDER BY (determinism guard)", () => {
    const unordered = `SELECT ?o ?s WHERE { ?o <${rel("belongsToSlice")}> ?s . }`;
    expect(() => query(unordered)).toThrow(/ORDER BY/i);
  });

  it("is deterministic (same query twice → identical rows)", () => {
    const a = query(Q, { pageSize: 1000 });
    const b = query(Q, { pageSize: 1000 });
    expect(JSON.stringify(a.rows)).toBe(JSON.stringify(b.rows));
    expect(a.total).toBeGreaterThan(0);
  });

  it("is coverage-preserving: total is exposed and pages sum to total", () => {
    const full = query(Q, { pageSize: 10_000 });
    const total = full.total;
    expect(total).toBeGreaterThan(10); // 144 in the v1.5.0 bundle

    // walk pages via cursor; collected rows must equal the full set, no truncation
    const collected: string[] = [];
    let page = 0;
    let cursor: number | null = 0;
    while (cursor !== null) {
      const p = query(Q, { page, pageSize: 50 });
      expect(p.total).toBe(total); // total never changes across pages
      expect(p.rows.length).toBeLessThanOrEqual(50);
      collected.push(...p.rows.map((r) => `${r.slice}|${r.mech}`));
      cursor = p.cursor;
      page += 1;
    }
    expect(collected.length).toBe(total);
    expect(collected.join("\n")).toBe(full.rows.map((r) => `${r.slice}|${r.mech}`).join("\n"));
  });

  it("last page reports cursor=null", () => {
    const total = query(Q, { pageSize: 10_000 }).total;
    const lastPage = Math.floor((total - 1) / 50);
    expect(query(Q, { page: lastPage, pageSize: 50 }).cursor).toBeNull();
  });
});
