import { describe, it, expect } from "vitest";
import { handleMapRegulatoryActivation } from "./map-regulatory-activation.js";

describe("map_sbd_toe_regulatory_activation", () => {
  it("ACCEPTANCE: DORA activates manual areas grouped with counts, coverage-preserving", () => {
    const r = handleMapRegulatoryActivation({ framework: "DORA" });

    expect(r.data.framework.id).toBe("EXT-DORA");
    expect(r.data.activated.length).toBeGreaterThan(0);

    // Coverage-preserving: the per-group mapping counts sum to the declared total.
    const sum = r.data.activated.reduce((n, a) => n + a.mapping_count, 0);
    expect(sum).toBe(r.data.totals.mappings);
    expect(r.data.totals.mappings).toBeGreaterThan(0);
  });

  it("emits the protocol envelope { data, provenance, coverage, next }", () => {
    const r = handleMapRegulatoryActivation({ framework: "DORA" });
    expect(r.provenance.content_type).toBe("canonical");
    expect(r.provenance.source_data).toContain("overlay_mappings");
    expect(r.coverage).toBeDefined();
    expect(Array.isArray(r.next)).toBe(true);
    expect((r.next ?? []).length).toBeGreaterThan(0);
    expect((r.next ?? []).length).toBeLessThanOrEqual(3); // RF-H ≤3
    // Affordances reference real tools, never invented.
    for (const a of r.next ?? []) {
      expect(typeof a.tool).toBe("string");
      expect(["structural", "semantic"]).toContain(a.kind);
    }
  });

  it("resolves the short code, EXT- prefix, and is case-insensitive", () => {
    const a = handleMapRegulatoryActivation({ framework: "dora" });
    const b = handleMapRegulatoryActivation({ framework: "EXT-DORA" });
    expect(a.data.framework.id).toBe("EXT-DORA");
    expect(b.data.framework.id).toBe("EXT-DORA");
  });

  it("serves each of the four published frameworks", () => {
    for (const fw of ["DORA", "NIS2", "CRA", "RGPD"]) {
      const r = handleMapRegulatoryActivation({ framework: fw });
      expect(r.data.totals.mappings).toBeGreaterThan(0);
    }
  });

  it("groups activated areas by manual chapter, sorted with cross-cutting last", () => {
    const r = handleMapRegulatoryActivation({ framework: "DORA" });
    const chapters = r.data.activated.map((a) => a.chapter);
    const crossIdx = chapters.indexOf("(cross-cutting)");
    if (crossIdx >= 0) {
      expect(crossIdx).toBe(chapters.length - 1);
    }
    // real chapters look like "NN-...".
    expect(chapters.some((c) => /^\d{2}-/.test(c))).toBe(true);
  });

  it("rejects an unknown framework listing the known ones — never invents", () => {
    expect(() => handleMapRegulatoryActivation({ framework: "HIPAA" })).toThrowError(/Known frameworks:.*DORA/);
  });

  it("requires the framework argument", () => {
    expect(() => handleMapRegulatoryActivation({})).toThrowError(/framework/);
  });

  it("is coverage-preserving under pagination (totals stay whole)", () => {
    const full = handleMapRegulatoryActivation({ framework: "DORA" });
    const page = handleMapRegulatoryActivation({ framework: "DORA", offset: 0, limit: 3 });
    expect(page.data.activated.length).toBe(3);
    expect(page.data.totals.mappings).toBe(full.data.totals.mappings);
    expect(page.data.totals.chapters).toBe(full.data.totals.chapters);
  });
});
