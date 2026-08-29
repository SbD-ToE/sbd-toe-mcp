import { describe, it, expect } from "vitest";
import { handlePlanRepoGovernance } from "./plan-repo-governance.js";

describe("handlePlanRepoGovernance (runtime bundle)", () => {
  it("returns byChapter + note; riskLevel null when not provided, echoed when provided", () => {
    const result = handlePlanRepoGovernance({});
    expect(Array.isArray(result.byChapter)).toBe(true);
    expect(result.byChapter.length).toBeGreaterThan(0);
    expect(result.totalArtefacts).toBeGreaterThan(0);
    expect(result.riskLevel).toBeNull();
    expect(handlePlanRepoGovernance({ riskLevel: "L2" }).riskLevel).toBe("L2");
  });

  it("invalid riskLevel throws rpcError -32602", () => {
    let err: unknown;
    try { handlePlanRepoGovernance({ riskLevel: "L9" }); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("L9");
  });

  it("artefacts come from artifact_requirements: every entry has an artefactId, a real chapterId and riskLevels", () => {
    const result = handlePlanRepoGovernance({});
    for (const chapter of result.byChapter) {
      expect(chapter.chapterId).toMatch(/^\d{2}-/);
      for (const art of chapter.artefacts) {
        expect(art.artefactId.length).toBeGreaterThan(0);
        expect(art.chapterId).toBe(chapter.chapterId);
        expect(art.riskLevels.length).toBeGreaterThan(0);
      }
    }
  });

  it("riskLevel filters artefacts to those applicable at the level", () => {
    const l1 = handlePlanRepoGovernance({ riskLevel: "L1" });
    for (const chapter of l1.byChapter) for (const art of chapter.artefacts) expect(art.riskLevels).toContain("L1");
  });

  it("note mentions manual indices and no templates", () => {
    const result = handlePlanRepoGovernance({});
    expect(result.note).toContain("manual");
    expect(result.note).toContain("template");
  });
});

// Coverage-preserving pagination wiring (Front 2b) — against the real bundle.
describe("handlePlanRepoGovernance — pagination", () => {
  it("returns coverage + size_estimate; default page covers every chapter (non-breaking)", () => {
    const result = handlePlanRepoGovernance({ riskLevel: "L2" });
    expect(result.coverage).toBeDefined();
    expect(typeof result.size_estimate.chars).toBe("number");
    expect(typeof result.size_estimate.approx_tokens).toBe("number");
    expect(result.coverage.returned).toBe(result.byChapter.length);
    expect(result.coverage.returned).toBe(result.coverage.total);
    expect(result.coverage.hasMore).toBe(false);
    expect(result.coverage.nextOffset).toBeNull();
  });

  it("limit produces a smaller page with a forward cursor", () => {
    const full = handlePlanRepoGovernance({ riskLevel: "L2" });
    const page = handlePlanRepoGovernance({ riskLevel: "L2", offset: 0, limit: 3 });
    expect(page.byChapter.length).toBe(3);
    expect(page.coverage.total).toBe(full.coverage.total);
    expect(page.coverage.hasMore).toBe(true);
    expect(page.coverage.nextOffset).toBe(3);
    expect(page.size_estimate.chars).toBeLessThan(full.size_estimate.chars);
  });

  it("is coverage-preserving: paging yields every chapter once, in order", () => {
    const all = handlePlanRepoGovernance({ riskLevel: "L2" }).byChapter.map((c) => c.chapterId);
    const collected: string[] = [];
    let offset: number | null = 0;
    let guard = 0;
    while (offset !== null && guard++ < 100) {
      const page = handlePlanRepoGovernance({ riskLevel: "L2", offset, limit: 4 });
      collected.push(...page.byChapter.map((c) => c.chapterId));
      offset = page.coverage.nextOffset;
    }
    expect(collected).toEqual(all);
  });
});

// Requirement-first applicability ladder (serving fix, brief #3b) — ontology path.
describe("handlePlanRepoGovernance — requirement-first ladder", () => {
  it("excludes a chapter with no L1 requirements (ch03 threat-modeling) from L1", () => {
    // ch03 has 0 requirements applicable at L1 in the substrate → must not appear at L1.
    const l1 = handlePlanRepoGovernance({ riskLevel: "L1" }).byChapter.map((c) => c.chapterId);
    const l3 = handlePlanRepoGovernance({ riskLevel: "L3" }).byChapter.map((c) => c.chapterId);
    expect(l1).not.toContain("03-threat-modeling");
    expect(l3).toContain("03-threat-modeling");
  });

  it("L1 artefact set is a non-strict subset of L3 (ladder never adds going down)", () => {
    const l1 = handlePlanRepoGovernance({ riskLevel: "L1" }).totalArtefacts;
    const l3 = handlePlanRepoGovernance({ riskLevel: "L3" }).totalArtefacts;
    expect(l1).toBeLessThanOrEqual(l3);
    expect(l1).toBeGreaterThan(0);
  });
});
