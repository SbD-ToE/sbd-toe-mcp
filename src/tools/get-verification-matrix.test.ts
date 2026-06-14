import { describe, it, expect } from "vitest";
import { handleGetVerificationMatrix } from "./get-verification-matrix.js";

// get_sbd_toe_verification_matrix — the EXPECTED side of verification (EvidencePatterns).
// Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md

describe("get_sbd_toe_verification_matrix", () => {
  it("returns rows with validation method + expected evidence + EP ref, cited", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L2" });
    expect(r.data.rows.length).toBeGreaterThan(0);
    const row = r.data.rows.find((x) => x.validation_method);
    expect(row?.evidence_pattern_id.length).toBeGreaterThan(0); // EP reference
    expect(typeof row?.validation_method).toBe("string");
    expect(typeof row?.expected_evidence).toBe("string");
    expect(row?.source).toBeTruthy(); // cited, never invented
  });

  it("level filter is cumulative: L1 ⊆ L2 ⊆ L3 (hint applies upward)", () => {
    const l1 = handleGetVerificationMatrix({ risk_level: "L1" }).data.totals.evidence_patterns;
    const l2 = handleGetVerificationMatrix({ risk_level: "L2" }).data.totals.evidence_patterns;
    const l3 = handleGetVerificationMatrix({ risk_level: "L3" }).data.totals.evidence_patterns;
    expect(l1).toBeLessThanOrEqual(l2);
    expect(l2).toBeLessThanOrEqual(l3);
    expect(l1).toBeGreaterThan(0);
  });

  it("declares the requirement→EvidencePattern coverage gap (never silently complete)", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L3" });
    expect(r.data.coverage_gaps.requirements_without_evidence_pattern).toBeGreaterThan(0);
    expect(Array.isArray(r.data.coverage_gaps.sample)).toBe(true);
    expect(r.data.coverage_gaps.note.toLowerCase()).toContain("codex");
  });

  it("flags unhinted patterns (risk_level_hint sparse) rather than hiding them", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L1" });
    expect(r.data.totals.unhinted).toBeGreaterThan(0);
    expect(r.data.rows.some((row) => row.level_hint === "unhinted")).toBe(true);
    expect(r.provenance.note.toLowerCase()).toContain("hint");
  });

  it("emits the protocol envelope, coverage-preserving + next", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L2" });
    expect(r.provenance.content_type).toBe("canonical");
    expect(r.coverage).toBeDefined();
    expect((r.next ?? []).length).toBeLessThanOrEqual(3);
    expect((r.next ?? []).some((a) => a.tool === "assess_sbd_toe_implementation")).toBe(true);
  });

  it("is coverage-preserving under pagination (total stays whole)", () => {
    const full = handleGetVerificationMatrix({ risk_level: "L2" });
    const page = handleGetVerificationMatrix({ risk_level: "L2", offset: 0, limit: 5 });
    expect(page.data.rows.length).toBe(5);
    expect(page.data.totals.evidence_patterns).toBe(full.data.totals.evidence_patterns);
  });

  it("validates risk_level", () => {
    expect(() => handleGetVerificationMatrix({ risk_level: "L9" })).toThrowError(/risk_level/);
    expect(() => handleGetVerificationMatrix({})).toThrowError(/risk_level/);
  });
});
