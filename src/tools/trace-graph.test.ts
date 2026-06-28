import { describe, it, expect, beforeEach } from "vitest";

import { handleTraceGraph, type GraphLens } from "./trace-graph.js";
import { _resetStore } from "../serving/rdf/graph-store.js";

const LENSES: GraphLens[] = ["slice_implementation", "objective_realization", "mechanism_provenance"];

describe("trace_sbd_toe_graph (v2 / s4)", () => {
  beforeEach(() => _resetStore());

  it("every lens: grounded rows, deterministic, and no IRI leak", () => {
    for (const lens of LENSES) {
      const a = handleTraceGraph({ lens, pageSize: 1000 });
      const b = handleTraceGraph({ lens, pageSize: 1000 });
      expect(a.total).toBeGreaterThan(0);
      expect(JSON.stringify(a.rows)).toBe(JSON.stringify(b.rows)); // determinism
      expect(JSON.stringify(a)).not.toContain("sbd-toe.dev");      // no-leak
    }
  });

  it("slice_implementation rows have the documented shape", () => {
    const r = handleTraceGraph({ lens: "slice_implementation", pageSize: 5 });
    expect(r.rows.length).toBeGreaterThan(0);
    expect(Object.keys(r.rows[0]).sort()).toEqual(["kind", "objective", "slice", "target"]);
    expect(["mechanism", "practice"]).toContain(r.rows[0].kind);
  });

  it("anchor scopes the result (subset; all rows match the anchor)", () => {
    const all = handleTraceGraph({ lens: "slice_implementation", pageSize: 10_000 });
    const anchorSlice = all.rows[0].slice as string;
    const scoped = handleTraceGraph({ lens: "slice_implementation", anchor: anchorSlice, pageSize: 10_000 });
    expect(scoped.total).toBeGreaterThan(0);
    expect(scoped.total).toBeLessThanOrEqual(all.total);
    expect(scoped.rows.every((row) => row.slice === anchorSlice)).toBe(true);
  });

  it("rejects an invalid lens", () => {
    expect(() => handleTraceGraph({ lens: "nope" })).toThrow(/lens/i);
  });

  it("is coverage-preserving (cursor-walked pages sum to total)", () => {
    const total = handleTraceGraph({ lens: "objective_realization", pageSize: 10_000 }).total;
    let page = 0;
    let cursor: number | null = 0;
    let collected = 0;
    while (cursor !== null) {
      const p = handleTraceGraph({ lens: "objective_realization", page, pageSize: 50 });
      expect(p.total).toBe(total);
      collected += p.rows.length;
      cursor = p.cursor;
      page += 1;
    }
    expect(collected).toBe(total);
  });
});
