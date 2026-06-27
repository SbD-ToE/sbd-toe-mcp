import { describe, it, expect } from "vitest";

import { projectBundleToTriples, toNTriples, predicateManifest } from "./projection.js";

// s1 gate — pins the consumed v1.5.0 bundle. A change here means the data drifted.
describe("rdf projection (v2 / s1)", () => {
  it("loads every source with expected counts (no silent skip)", () => {
    const { counts } = projectBundleToTriples();
    expect(counts["relations.v1"]).toBe(529);
    expect(counts["requirement_control_links"]).toBe(242);
    expect(counts["antipattern_requirement_links"]).toBe(2);
    expect(counts["antipattern_threat_links"]).toBe(5);
    expect(counts["signal_evidence_links"]).toBe(11);

    const sum = 529 + 242 + 2 + 5 + 11;
    expect(counts["__total__"]).toBe(sum);

    // every declared source contributed at least one edge
    for (const [k, v] of Object.entries(counts)) {
      if (k !== "__total__") expect(v).toBeGreaterThan(0);
    }
  });

  it("is deterministic (same input → identical serialization)", () => {
    const a = toNTriples(projectBundleToTriples().triples);
    const b = toNTriples(projectBundleToTriples().triples);
    expect(a).toBe(b);
  });

  it("emits well-formed IRIs (no whitespace, http base)", () => {
    const { triples } = projectBundleToTriples();
    expect(triples.length).toBeGreaterThan(0);
    for (const t of triples) {
      for (const term of [t.s, t.p, t.o]) {
        expect(term.startsWith("https://")).toBe(true);
        expect(/\s/.test(term)).toBe(false);
      }
    }
  });

  it("exposes a stable predicate manifest", () => {
    const manifest = predicateManifest(projectBundleToTriples().triples);
    expect(manifest.some((p) => p.endsWith("belongsToSlice"))).toBe(true);
    expect(manifest.some((p) => p.endsWith("objective_implemented_by_mechanism"))).toBe(true);
    expect(manifest.some((p) => p.endsWith("objective_realized_by_practice"))).toBe(true);
  });
});
