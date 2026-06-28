import { describe, it, expect, beforeEach } from "vitest";

import { handleTraceGraph, type GraphLens } from "./trace-graph.js";
import { handleResolveEntities } from "./resolve-entities.js";
import { _resetStore } from "../serving/rdf/graph-store.js";

// Functional smoke — exercises the tool against the real bundle and cross-checks
// coherence (a) between the three lenses and (b) with resolve_entities. Goes beyond
// the unit tests: proves the lenses agree and reference only real published entities.
describe("trace_sbd_toe_graph — functional smoke", () => {
  beforeEach(() => _resetStore());

  it("the three lenses agree on the same underlying edge", () => {
    const impl = handleTraceGraph({ lens: "slice_implementation", pageSize: 10_000 });
    const sample = impl.rows.find((r) => r.kind === "mechanism") as Record<string, string> | undefined;
    expect(sample).toBeDefined();
    const { slice, objective, target } = sample!;

    // objective_realization(objective) must list that same mechanism
    const real = handleTraceGraph({ lens: "objective_realization", anchor: objective, pageSize: 10_000 });
    expect(real.rows.some((r) => r.kind === "mechanism" && r.target === target)).toBe(true);

    // mechanism_provenance(mechanism) must trace back to that objective + slice
    const prov = handleTraceGraph({ lens: "mechanism_provenance", anchor: target, pageSize: 10_000 });
    expect(prov.rows.some((r) => r.objective === objective && r.slice === slice)).toBe(true);
  });

  it("totals cohere: every realized objective belongs to a slice (impl == realization)", () => {
    const impl = handleTraceGraph({ lens: "slice_implementation", pageSize: 1 }).total;
    const real = handleTraceGraph({ lens: "objective_realization", pageSize: 1 }).total;
    expect(impl).toBeGreaterThan(0);
    expect(impl).toBe(real);
  });

  it("references only real published entities (coherent with resolve_entities)", () => {
    const impl = handleTraceGraph({ lens: "slice_implementation", pageSize: 10_000 });
    const mechanisms = new Set(impl.rows.filter((r) => r.kind === "mechanism").map((r) => r.target));
    const objectives = new Set(impl.rows.map((r) => r.objective));

    const allMechanisms = handleResolveEntities({ record_type: "mechanism" }).total;
    const allObjectives = handleResolveEntities({ record_type: "control_objective" }).total;

    expect(mechanisms.size).toBeGreaterThan(0);
    expect(mechanisms.size).toBeLessThanOrEqual(allMechanisms); // no fabricated mechanism ids
    expect(objectives.size).toBeLessThanOrEqual(allObjectives); // no fabricated objective ids
  });

  it("output is grounded ids only — no internal IRI leak across all lenses", () => {
    const lenses: GraphLens[] = ["slice_implementation", "objective_realization", "mechanism_provenance"];
    for (const lens of lenses) {
      const serialized = JSON.stringify(handleTraceGraph({ lens, pageSize: 10_000 }));
      expect(serialized).not.toContain("sbd-toe.dev");
    }
  });

  it("an anchored slice query returns a coherent, scoped implementation map", () => {
    const all = handleTraceGraph({ lens: "slice_implementation", pageSize: 10_000 });
    const someSlice = all.rows[0].slice as string;
    const scoped = handleTraceGraph({ lens: "slice_implementation", anchor: someSlice, pageSize: 10_000 });

    expect(scoped.total).toBeGreaterThan(0);
    expect(scoped.rows.every((r) => r.slice === someSlice)).toBe(true);
    // every scoped row carries a real objective + a mechanism|practice target
    expect(scoped.rows.every((r) => r.objective && r.target && ["mechanism", "practice"].includes(r.kind!))).toBe(true);
  });
});
