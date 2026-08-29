/**
 * Serving verification over the pinned dev-build
 * kg-v1-manual-v1.7.0-aligned-2026-08-29 (consumer contract v1.11 §1.19):
 * 256 requirements / 27 categories (AGN + OPS-015), curated requirement→control layer
 * (0 requirements without a link), 0 legacy REQ-<CAT>-NNN citations, illustrative REQ-NNN
 * ids informative (not gaps), EX- illustrative ids rejected, macro-processos page in the
 * guide profile, guide-by-role still answering.
 */
import { describe, it, expect } from "vitest";
import { handleResolveEntities } from "./resolve-entities.js";
import { handleConsultSecurityRequirements } from "./consult-security-requirements.js";
import { handleQuerySbdToeEntities } from "./structured-tools.js";
import { handleGetVerificationMatrix } from "./get-verification-matrix.js";
import { handleGetGuideByRole } from "./get-guide-by-role.js";
import { filterChunks } from "../serving/chunk-index.js";

const AGN_IDS = ["REQ-AGN-001", "REQ-AGN-002", "REQ-AGN-003", "REQ-AGN-004"];

describe("resolve_entities — REQ-AGN-001…004 and OPS-015 resolve from the pinned bundle", () => {
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

  it("resolves OPS-015 (Manual v1.7.0, L2/L3, chapter 12)", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "OPS-015" } });
    expect(r.total).toBe(1);
    const entity = r.entities[0] as Record<string, unknown>;
    expect(entity["category"]).toBe("OPS");
    expect(entity["source_chapter"]).toBe(12);
    expect(entity["applicable_levels"]).toEqual({ L1: false, L2: true, L3: true });
  });

  it("EX-AUT-003 (illustrative id) does NOT resolve — and never to AUT-003 (fullmatch, no prefix stripping)", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "EX-AUT-003" } });
    expect(r.total).toBe(0);
    expect(r.entities).toHaveLength(0);
    expect(r.meta.declared_gap).toBeUndefined();
    expect(r.meta.citation_note).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('"requirement_id":"AUT-003"');
    const real = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "AUT-003" } });
    expect(real.total).toBe(1);
    expect((real.entities[0] as Record<string, unknown>)["requirement_id"]).toBe("AUT-003");
    expect(handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "REQ-AUTH-001" } }).total).toBe(0);
  });

  it("a legacy REQ-<CAT>-NNN citation is no longer cited by the corpus → no declared gap (0 legacy citations in v1.7.0)", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "REQ-AUT-003" } });
    expect(r.total).toBe(0);
    expect(r.meta.declared_gap).toBeUndefined();
  });

  it("an illustrative REQ-NNN example id is informative (citation_note), not a declared gap", () => {
    const r = handleResolveEntities({ record_type: "requirement", filters: { requirement_id: "REQ-010" } });
    expect(r.total).toBe(0);
    expect(r.meta.declared_gap).toBeUndefined();
    expect(r.meta.citation_note?.status).toBe("informative");
    expect(r.meta.citation_note?.cited_in.mention_count).toBeGreaterThan(0);
  });
});

describe("consult_security_requirements — full catalogue served, curated control layer (0 gaps)", () => {
  it("L3 serves 256 requirements across 27 categories, AGN and OPS-015 included", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L3" });
    expect(r.meta.requirementCount).toBe(256);
    expect(r.active_categories).toHaveLength(27);
    expect(r.active_categories).toContain("AGN");
    const ids = r.requirements.map((x) => x.requirement_id);
    for (const id of [...AGN_IDS, "OPS-015"]) expect(ids).toContain(id);
  });

  it("L2 includes AGN ×4 and OPS-015; L1 includes REQ-AGN-001/002 only", () => {
    const l2 = handleConsultSecurityRequirements({ risk_level: "L2" }).requirements.map((x) => x.requirement_id);
    for (const id of [...AGN_IDS, "OPS-015"]) expect(l2).toContain(id);
    const l1 = handleConsultSecurityRequirements({ risk_level: "L1" }).requirements.map((x) => x.requirement_id);
    expect(l1).toContain("REQ-AGN-001");
    expect(l1).toContain("REQ-AGN-002");
    expect(l1).not.toContain("REQ-AGN-003");
    expect(l1).not.toContain("OPS-015");
  });

  it("coverage_gaps.requirements_without_control_link is 0 at every level (curated layer, 263 links)", () => {
    for (const level of ["L1", "L2", "L3"]) {
      const r = handleConsultSecurityRequirements({ risk_level: level });
      expect(r.coverage_gaps.requirements_without_control_link.count, level).toBe(0);
      expect(r.coverage_gaps.requirements_without_control_link.requirement_ids, level).toEqual([]);
      expect(r.rule_trace.some((l) => l.startsWith("REQUIREMENT_WITHOUT_CONTROL_LINK")), level).toBe(false);
    }
  });

  it("concerns=['agents'] narrows to the AGN catalogue, now with a direct (linked) control", () => {
    const r = handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["agents"] });
    expect(r.requirements.map((x) => x.requirement_id).sort()).toEqual(AGN_IDS);
    expect(r.active_categories).toEqual(["AGN"]);
    const direct = r.controls.filter((c) => c._confidence === "direct").map((c) => c.control_id);
    expect(direct).toHaveLength(1);
    expect(direct[0]).toMatch(/^CTRL-governance-classificacao-e-governacao-por-risco-[0-9a-f]+$/);
    expect(r.coverage_gaps.requirements_without_control_link.count).toBe(0);
  });
});

describe("query_sbd_toe_entities — exact id, informative citation, illustrative ids", () => {
  it("REQ-AGN-001 and OPS-015 resolve directly (match=exact_id)", async () => {
    for (const id of ["REQ-AGN-001", "OPS-015"]) {
      const r = (await handleQuerySbdToeEntities({ query: id })) as { total: number; match?: string; entities: Array<Record<string, unknown>> };
      expect(r.match, id).toBe("exact_id");
      expect(r.entities[0]?.requirement_id).toBe(id);
    }
  });

  it("no legacy REQ-<CAT>-NNN citation yields a declared gap in v1.7.0 (0 unresolvable)", async () => {
    for (const q of ["REQ-AUT-003", "REQ-DAT-005", "REQ-IAM-001"]) {
      const r = (await handleQuerySbdToeEntities({ query: q })) as { match?: string };
      expect(r.match, q).not.toBe("declared_gap");
    }
  });

  it("an illustrative REQ-NNN id keeps the semantic path with an informative citation_note (not a gap)", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "REQ-010" })) as {
      match?: string; citation_note?: { status: string; cited_in: { mention_count: number } }; declared_gap?: unknown;
    };
    expect(r.match).toBeUndefined();
    expect(r.declared_gap).toBeUndefined();
    expect(r.citation_note?.status).toBe("informative");
    expect(r.citation_note?.cited_in.mention_count).toBeGreaterThan(0);
  });

  it("EX-AUT-003 never exact-matches AUT-003 and carries no note (not cited as a Requirement)", async () => {
    const r = (await handleQuerySbdToeEntities({ query: "EX-AUT-003" })) as { match?: string; citation_note?: unknown; entities: Array<Record<string, unknown>> };
    expect(r.match).toBeUndefined();
    expect(r.citation_note).toBeUndefined();
    expect(r.entities.some((e) => e["requirement_id"] === "AUT-003")).toBe(false);
  });
});

describe("guide profile — 00-fundamentos/macro-processos is served in guide (not only consult)", () => {
  it("publishes 82 macro-processos chunks with support_profiles consult+guide, role addon", () => {
    const guide = filterChunks({ bundle_id: "00-fundamentos", profile: "guide" }).filter((c) => c.document_id.endsWith("macro-processos"));
    const consult = filterChunks({ bundle_id: "00-fundamentos", profile: "consult" }).filter((c) => c.document_id.endsWith("macro-processos"));
    expect(guide).toHaveLength(82);
    expect(consult).toHaveLength(82);
    expect(guide.every((c) => c.document_role === "addon")).toBe(true);
  });

  it("get_guide_by_role still answers for a role at L2", () => {
    const r = handleGetGuideByRole({ risk_level: "L2", role: "developer" }) as Record<string, unknown>;
    expect(r).toBeDefined();
    expect(JSON.stringify(r).length).toBeGreaterThan(200);
  });
});

describe("verification matrix — EvidencePattern coverage complete (256/256)", () => {
  it("L3 has 0 requirements without an EvidencePattern and 256 patterns", () => {
    const r = handleGetVerificationMatrix({ risk_level: "L3" });
    expect(r.data.coverage_gaps.requirements_without_evidence_pattern).toBe(0);
    expect(r.data.totals.evidence_patterns).toBe(256);
  });
});
