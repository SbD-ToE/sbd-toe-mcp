/**
 * Serving verification over the pinned dev-build
 * kg-v1-manual-v1.6.7-aligned-2026-08-29 (consumer contract v1.10 §1.18):
 * REQ-AGN-001…004 served, AGN category active at L2/L3, requirements without a
 * control link declared (not omitted), legacy citations declared (not silent).
 */
import { describe, it, expect } from "vitest";
import { handleResolveEntities } from "./resolve-entities.js";
import { handleConsultSecurityRequirements } from "./consult-security-requirements.js";
import { handleQuerySbdToeEntities } from "./structured-tools.js";
import { handleGetVerificationMatrix } from "./get-verification-matrix.js";
import { LEGACY_CITATION_SERVING_PHRASE } from "../serving/requirement-id.js";

const AGN_IDS = ["REQ-AGN-001", "REQ-AGN-002", "REQ-AGN-003", "REQ-AGN-004"];

/** Handover 2026-08-29 gap (a): requirements with no requirement_control_links entry. */
const UNLINKED_REQUIREMENTS = [
  "ARC-014", "ARC-015",
  "DEP-011", "DEP-012", "DEP-013", "DEP-014",
  "DPL-010", "DPL-011",
  "GOV-013", "GOV-014",
  "OPS-011", "OPS-012", "OPS-013", "OPS-014",
  "REQ-AGN-001", "REQ-AGN-002", "REQ-AGN-003", "REQ-AGN-004",
  "THR-008", "VAL-008"
].sort();

describe("resolve_entities — REQ-AGN-001…004 resolve from the pinned bundle", () => {
  for (const id of AGN_IDS) {
    it(`resolves ${id} as a requirement of category AGN (chapter 02)`, () => {
      const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: id } });
      expect(r.total).toBe(1);
      const entity = r.entities[0] as Record<string, unknown>;
      expect(entity["requirement_id"]).toBe(id);
      expect(entity["category"]).toBe("AGN");
      expect(entity["source_chapter"]).toBe(2);
      expect(r.meta.declared_gap).toBeUndefined();
    });
  }

  it("EX-AUT-003 (illustrative id) does NOT resolve — and never to AUT-003 (fullmatch, no prefix stripping)", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "EX-AUT-003" } });
    expect(r.total).toBe(0);
    expect(r.entities).toHaveLength(0);
    expect(r.meta.declared_gap).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('"requirement_id":"AUT-003"');
    // Control: the real id resolves, and only itself.
    const real = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "AUT-003" } });
    expect(real.total).toBe(1);
    expect((real.entities[0] as Record<string, unknown>)["requirement_id"]).toBe("AUT-003");
    // 4-letter category never matches anything either.
    expect(handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "REQ-AUTH-001" } }).total).toBe(0);
  });

  it("declares a legacy citation gap when the filter names REQ-AUT-003 (never a silent empty page)", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "REQ-AUT-003" } });
    expect(r.total).toBe(0);
    expect(r.meta.declared_gap?.kind).toBe("legacy_citation_unresolvable");
    expect(r.meta.note).toContain(LEGACY_CITATION_SERVING_PHRASE);
  });
});

describe("consult_security_requirements — AGN served at L2/L3 with declared control-link gaps", () => {
  it("L3 serves the full catalogue: 255 requirements across 27 categories, AGN included", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L3" });
    expect(r.meta.requirementCount).toBe(255);
    expect(r.active_categories).toHaveLength(27);
    expect(r.active_categories).toContain("AGN");
    const ids = r.requirements.map((x) => x.requirement_id);
    for (const id of AGN_IDS) expect(ids).toContain(id);
  });

  it("L2 includes AGN (all four: 001/002 are L1+, 003/004 are L2+)", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L2" });
    expect(r.active_categories).toContain("AGN");
    const ids = r.requirements.map((x) => x.requirement_id);
    for (const id of AGN_IDS) expect(ids).toContain(id);
  });

  it("L1 includes REQ-AGN-001/002 only (levels as published)", () => {
    const ids = handleConsultSecurityRequirements({ risk_level: "L1" }).requirements.map((x) => x.requirement_id);
    expect(ids).toContain("REQ-AGN-001");
    expect(ids).toContain("REQ-AGN-002");
    expect(ids).not.toContain("REQ-AGN-003");
    expect(ids).not.toContain("REQ-AGN-004");
  });

  it("the 20 requirements without a control link are SERVED and DECLARED at L3 — not omitted", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L3" });
    const served = new Set(r.requirements.map((x) => x.requirement_id));
    for (const id of UNLINKED_REQUIREMENTS) expect(served.has(id), id).toBe(true);
    expect(r.coverage_gaps.requirements_without_control_link.count).toBe(20);
    expect(r.coverage_gaps.requirements_without_control_link.requirement_ids).toEqual(UNLINKED_REQUIREMENTS);
    expect(r.coverage_gaps.requirements_without_control_link.note).toMatch(/declared gap/i);
    expect(r.rule_trace.some((line) => line.startsWith("REQUIREMENT_WITHOUT_CONTROL_LINK: 20 "))).toBe(true);
  });

  it("concerns=['agents'] narrows to the AGN catalogue; no control is invented for it", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["agents"] });
    expect(r.requirements.map((x) => x.requirement_id).sort()).toEqual(AGN_IDS);
    expect(r.active_categories).toEqual(["AGN"]);
    expect(r.controls.filter((c) => c._confidence === "direct")).toHaveLength(0);
    expect(r.coverage_gaps.requirements_without_control_link.count).toBe(4);
    expect(r.rule_trace).toContain("CONCERNS_FILTER_REQUIREMENTS(concerns=[agents]): intersected with risk-level filter");
  });
});

describe("query_sbd_toe_entities — exact-id lookup vs declared legacy-citation gap", () => {
  it("REQ-AGN-001 resolves directly (match=exact_id)", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "REQ-AGN-001" })) as {
      total: number; match?: string; entities: Array<Record<string, unknown>>;
    };
    expect(r.match).toBe("exact_id");
    expect(r.total).toBe(1);
    expect(r.entities[0]?.requirement_id).toBe("REQ-AGN-001");
    expect(r.entities[0]?.entity_type).toBe("requirement");
  });

  it("REQ-AUT-003 answers with the declared gap phrase — never «requisito inexistente», never a silent fallback", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "REQ-AUT-003" })) as {
      total: number; match?: string; declared_gap?: { kind: string; note: string; cited_in: { mention_count: number } };
    };
    expect(r.match).toBe("declared_gap");
    expect(r.total).toBe(0);
    expect(r.declared_gap?.kind).toBe("legacy_citation_unresolvable");
    expect(r.declared_gap?.note).toContain(LEGACY_CITATION_SERVING_PHRASE);
    expect(r.declared_gap?.cited_in.mention_count).toBeGreaterThan(0);
  });

  it("EX-AUT-003 never exact-matches AUT-003 (query tool)", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "EX-AUT-003" })) as {
      match?: string; entities: Array<Record<string, unknown>>;
    };
    expect(r.match).toBeUndefined();
    expect(r.entities.some((e) => e["requirement_id"] === "AUT-003")).toBe(false);
  });

  it("a guessed token still falls through to the semantic path (unchanged behaviour)", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "CTRL-06" })) as { match?: string };
    expect(r.match).toBeUndefined();
  });
});

describe("verification matrix — EvidencePattern coverage stays complete after the AGN absorption (255/255)", () => {
  it("L3 has 0 requirements without an EvidencePattern and 255 patterns", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L3" });
    expect(r.data.coverage_gaps.requirements_without_evidence_pattern).toBe(0);
    expect(r.data.totals.evidence_patterns).toBe(255);
  });
});
