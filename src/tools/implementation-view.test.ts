import { describe, it, expect } from "vitest";
import { handleGetChapterImplementationChecklist } from "./get-chapter-implementation-checklist.js";
import { handleGetOperatingModel } from "./get-operating-model.js";
import { handlePlanRollout } from "./plan-rollout.js";

// Implementation-view content tools (retrieval-grounded, profile/chunks, v1.4).
// Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md

describe("get_sbd_toe_chapter_implementation_checklist", () => {
  it("serves the canon/20 checklist for a chapter, grounded in chunk ids", () => {
    const r = handleGetChapterImplementationChecklist({ chapter: "08" });
    expect(r.data.chapter).toBe("08-iac-infraestrutura");
    expect(r.data.items.length).toBeGreaterThan(0);
    for (const item of r.data.items) {
      expect(item.chunk_id.length).toBeGreaterThan(0); // grounded, never invented
      expect(typeof item.text).toBe("string");
    }
    expect(r.provenance.source_data).toContain("mcp_chunks");
    expect(r.coverage).toBeDefined();
  });

  it("resolves chapter by id or number to the same bundle", () => {
    const byNum = handleGetChapterImplementationChecklist({ chapter: "8" });
    const byId = handleGetChapterImplementationChecklist({ chapter: "08-iac-infraestrutura" });
    expect(byNum.data.chapter).toBe(byId.data.chapter);
  });

  it("carries a next affordance to the level-sharp DoD (get_guide_by_role)", () => {
    const r = handleGetChapterImplementationChecklist({ chapter: "08" });
    expect((r.next ?? []).some((a) => a.tool === "get_guide_by_role")).toBe(true);
    expect((r.next ?? []).length).toBeLessThanOrEqual(3);
  });

  it("rejects an unknown chapter listing the known ones — never invents", () => {
    expect(() => handleGetChapterImplementationChecklist({ chapter: "99" })).toThrowError(/Known chapters:/);
  });

  it("requires the chapter argument", () => {
    expect(() => handleGetChapterImplementationChecklist({})).toThrowError(/chapter/);
  });
});

describe("get_sbd_toe_operating_model", () => {
  it("serves operating-model sections (RACI/governance) grounded in chunks", () => {
    const r = handleGetOperatingModel({});
    expect(r.data.sections.length).toBeGreaterThan(0);
    expect(r.data.sections.every((s) => s.chunk_id.length > 0)).toBe(true);
    expect(r.provenance.content_type).toBe("canonical");
    expect(r.coverage).toBeDefined();
  });

  it("is coverage-preserving under pagination (total stays whole)", () => {
    const full = handleGetOperatingModel({});
    const page = handleGetOperatingModel({ offset: 0, limit: 2 });
    expect(page.data.sections.length).toBeLessThanOrEqual(2);
    expect(page.data.totals.sections).toBe(full.data.totals.sections);
  });
});

describe("plan_sbd_toe_rollout", () => {
  it("returns the lifecycle phases in order, mapped to chapters (MVP)", () => {
    const r = handlePlanRollout({});
    expect(r.data.model).toBe("phase-ordered-mvp");
    expect(r.data.phases.length).toBeGreaterThan(0);
    // strictly increasing order
    const orders = r.data.phases.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    // at least one phase maps to a real chapter bundle
    expect(r.data.phases.some((p) => /^\d{2}-/.test(p.chapter ?? ""))).toBe(true);
  });

  it("declares the MVP limitation in provenance (DAG deferred — not faked)", () => {
    const r = handlePlanRollout({});
    expect(r.provenance.note.toLowerCase()).toContain("dag");
  });

  it("horizon caps the spanned phases, coverage-preserving", () => {
    const full = handlePlanRollout({});
    const capped = handlePlanRollout({ horizon: 3 });
    expect(capped.data.phases.length).toBe(3);
    expect(capped.data.totals.phases).toBe(full.data.totals.phases);
  });
});
