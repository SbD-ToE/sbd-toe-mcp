import { describe, it, expect } from "vitest";
import { handlePlanRepoGovernance } from "./plan-repo-governance.js";
import { emptySnapshotPayload, mockSnapshotPayload } from "../test-utils.js";
import type { SnapshotCache } from "../backend/semantic-index-gateway.js";

function makeCache(items: unknown[] = []): SnapshotCache {
  // Build entitiesEnrichedLookup from items that carry artifact_ids,
  // keyed by objectID (the join key used by the tool).
  const entitiesEnrichedLookup = new Map<string, { artifact_ids?: readonly string[] }>();
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const oid = typeof rec["objectID"] === "string" ? rec["objectID"] : undefined;
    const arts = Array.isArray(rec["artifact_ids"]) ? (rec["artifact_ids"] as string[]) : undefined;
    if (oid && arts && arts.length > 0) {
      entitiesEnrichedLookup.set(oid, { artifact_ids: arts });
    }
  }
  return {
    docs: emptySnapshotPayload,
    entities: { items } as typeof mockSnapshotPayload,
    docsEnrichedLookup: new Map(),
    entitiesEnrichedLookup: entitiesEnrichedLookup as SnapshotCache["entitiesEnrichedLookup"]
  };
}

describe("handlePlanRepoGovernance", () => {
  it("returns result with byChapter array and note", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(Array.isArray(result.byChapter)).toBe(true);
    expect(typeof result.note).toBe("string");
    expect(result.riskLevel).toBeNull();
  });

  it("riskLevel null when not provided", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(result.riskLevel).toBeNull();
  });

  it("riskLevel set when provided", () => {
    const result = handlePlanRepoGovernance({ riskLevel: "L2" }, makeCache());
    expect(result.riskLevel).toBe("L2");
  });

  it("invalid riskLevel throws rpcError -32602", () => {
    let err: unknown;
    try { handlePlanRepoGovernance({ riskLevel: "L9" }, makeCache()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("L9");
  });

  it("empty cache returns zero artefacts", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(result.totalArtefacts).toBe(0);
    expect(result.byChapter).toHaveLength(0);
  });

  it("extracts artefacts from entities with artifact_ids", () => {
    const items = [
      {
        objectID: "entity::proportionality::01-abc",
        entity_type: "proportionality",
        chapter_id: "01-classificacao-aplicacoes",
        artifact_ids: ["ART-threat-model-abc123", "ART-checklist-def456"],
        risk_levels: ["L1", "L2", "L3"]
      }
    ];
    const result = handlePlanRepoGovernance({}, makeCache(items));
    expect(result.totalArtefacts).toBe(2);
    expect(result.byChapter[0]?.chapterId).toBe("01-classificacao-aplicacoes");
  });

  it("filters artefacts by riskLevel", () => {
    const items = [
      {
        objectID: "entity::x::01-l1",
        chapter_id: "01-classificacao-aplicacoes",
        artifact_ids: ["ART-doc-l1only"],
        risk_levels: ["L1"]
      },
      {
        objectID: "entity::x::06-l2",
        chapter_id: "06-desenvolvimento-seguro",
        artifact_ids: ["ART-doc-l2plus"],
        risk_levels: ["L2", "L3"]
      }
    ];
    const l1 = handlePlanRepoGovernance({ riskLevel: "L1" }, makeCache(items));
    expect(l1.totalArtefacts).toBe(1);
    expect(l1.byChapter[0]?.chapterId).toBe("01-classificacao-aplicacoes");

    const l2 = handlePlanRepoGovernance({ riskLevel: "L2" }, makeCache(items));
    expect(l2.totalArtefacts).toBe(1);
    expect(l2.byChapter[0]?.chapterId).toBe("06-desenvolvimento-seguro");
  });

  it("note mentions manual indices and no templates", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
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
