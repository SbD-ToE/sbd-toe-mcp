import { describe, it, expect } from "vitest";
import {
  LEGACY_CITATION_SERVING_PHRASE,
  LEGACY_REQUIREMENT_CITATION_PATTERN,
  REQUIREMENT_ID_PATTERN,
  describeRequirementGap,
  getRequirementCitations,
  isLegacyRequirementCitation,
  isRequirementId,
  requirementCategoryOf
} from "./requirement-id.js";
import { getOntologyData } from "../tools/ontology-loader.js";

describe("requirement id grammar (consumer contract v1.10 §1.18)", () => {
  it("is the contract grammar verbatim — the single source in this server", () => {
    expect(REQUIREMENT_ID_PATTERN.source).toBe("^(?:REQ-[A-Z]{3}-\\d{3}|[A-Z]{3}-\\d{3})$");
  });

  it("accepts the base form and the namespaced transversal form", () => {
    for (const id of ["AUT-001", "ARC-014", "REQ-AGN-001", "REQ-AGN-004"]) {
      expect(isRequirementId(id), id).toBe(true);
    }
  });

  it("rejects hyphenated tails, wrong case and truncated forms (REQ-010 is a valid base-form shape of category REQ)", () => {
    for (const id of ["req-agn-001", "ACO-IVF-008", "IAC-EXC-003", "AGN", "REQ-AGN-1", ""]) {
      expect(isRequirementId(id), id).toBe(false);
    }
    expect(isRequirementId("REQ-010")).toBe(true);
  });

  it("is a FULLMATCH — never search, never prefix normalisation (mandatory cases, programme lead 2026-08-29)", () => {
    expect(isRequirementId("REQ-AGN-001")).toBe(true);
    expect(isRequirementId("AUT-003")).toBe(true);
    // EX- marks the Manual's illustrative identifiers: never a requirement id, never stripped to AUT-003.
    expect(isRequirementId("EX-AUT-003")).toBe(false);
    expect(isLegacyRequirementCitation("EX-AUT-003")).toBe(false);
    expect(requirementCategoryOf("EX-AUT-003")).toBeUndefined();
    // 4-letter category is outside the grammar.
    expect(isRequirementId("REQ-AUTH-001")).toBe(false);
    expect(isLegacyRequirementCitation("REQ-AUTH-001")).toBe(false);
    // Embedded matches must not pass (search vs fullmatch).
    expect(isRequirementId("xREQ-AGN-001")).toBe(false);
    expect(isRequirementId("REQ-AGN-001x")).toBe(false);
    expect(isRequirementId("see AUT-003")).toBe(false);
  });

  it("category is the segment immediately before the number — never REQ", () => {
    expect(requirementCategoryOf("REQ-AGN-001")).toBe("AGN");
    expect(requirementCategoryOf("AUT-001")).toBe("AUT");
    expect(requirementCategoryOf("REQ-AC-010")).toBe("AC");
    expect(requirementCategoryOf("REQ")).toBeUndefined();
    expect(requirementCategoryOf("ACO-IVF-008")).toBeUndefined();
  });

  it("legacy citation shape covers 2–3 letter categories (REQ-AC-010 is one of the 21)", () => {
    expect(LEGACY_REQUIREMENT_CITATION_PATTERN.test("REQ-AC-010")).toBe(true);
    expect(isLegacyRequirementCitation("REQ-AUT-003")).toBe(true);
    expect(isLegacyRequirementCitation("AUT-003")).toBe(false);
    // REQ-AGN-001 has the same shape — it is NOT a gap because the bundle carries it.
    expect(isLegacyRequirementCitation("REQ-AGN-001")).toBe(true);
  });
});

describe("declared requirement gaps over the pinned bundle (Codex handover 2026-08-29, gap (b))", () => {
  const known = new Set(getOntologyData().requirements.map((r) => r.requirement_id));

  it("published ids are never gaps (namespaced or base)", () => {
    expect(describeRequirementGap("REQ-AGN-001", known)).toBeUndefined();
    expect(describeRequirementGap("AUT-001", known)).toBeUndefined();
  });

  it("REQ-AUT-003 is a declared legacy gap carrying the handover serving phrase and its citations", () => {
    const gap = describeRequirementGap("REQ-AUT-003", known);
    expect(gap).toBeDefined();
    expect(gap?.status).toBe("declared_gap");
    expect(gap?.kind).toBe("legacy_citation_unresolvable");
    expect(gap?.note).toContain(LEGACY_CITATION_SERVING_PHRASE);
    expect(gap?.note).toContain("Não é «requisito inexistente»");
    expect(gap?.cited_in.mention_count).toBeGreaterThan(0);
    expect(gap?.cited_in.chunk_ids.length).toBeGreaterThan(0);
    expect(gap?.routed_to).toContain("Manual");
  });

  it("never aliases a legacy citation to the base requirement with another meaning", () => {
    // Contract §1.18: REQ-AUT-003 used to resolve to AUT-003 by substring accident — forbidden.
    const gap = describeRequirementGap("REQ-AUT-003", known);
    expect(JSON.stringify(gap)).not.toContain('"AUT-003"');
  });

  it("the 20 legacy REQ-<CAT>-NNN citations of the handover are all declared gaps, never silent", () => {
    // 16 distinct ids × their mentions = the 20 citations in 6 Manual files (handover (b));
    // REQ-AC-010 is the 21st and is asserted separately below.
    const legacyIds = [
      "REQ-ARC-003", "REQ-AUT-001", "REQ-AUT-003", "REQ-AUT-004", "REQ-DAT-002", "REQ-DAT-005",
      "REQ-DAT-006", "REQ-DAT-008", "REQ-DOS-001", "REQ-IAM-001", "REQ-LOG-001", "REQ-LOG-002",
      "REQ-LOG-004", "REQ-PRI-001", "REQ-PRI-004", "REQ-VAL-002"
    ];
    let mentions = 0;
    for (const id of legacyIds) {
      const gap = describeRequirementGap(id, known);
      expect(gap?.kind, id).toBe("legacy_citation_unresolvable");
      expect(gap?.note, id).toContain(LEGACY_CITATION_SERVING_PHRASE);
      mentions += gap?.cited_in.mention_count ?? 0;
    }
    expect(mentions).toBe(20);
  });

  it("a base-form id the corpus cites but the bundle lacks is a declared (non-legacy) citation gap", () => {
    // REQ-010 is valid shape (category REQ) and cited by the Manual, yet unpublished → declared, not silent.
    const gap = describeRequirementGap("REQ-010", known);
    expect(gap?.kind).toBe("citation_unresolvable");
    expect(gap?.cited_in.mention_count).toBeGreaterThan(0);
  });

  it("EX-AUT-003 (illustrative id) is neither a requirement nor a gap — and never AUT-003", () => {
    const gap = describeRequirementGap("EX-AUT-003", known);
    expect(gap).toBeUndefined();
  });

  it("a requirement-shaped token nobody cites is not a declared gap (caller keeps its fallback)", () => {
    expect(getRequirementCitations("REQ-ZZZ-999").mention_count).toBe(0);
    expect(describeRequirementGap("REQ-ZZZ-999", known)).toBeUndefined();
    expect(describeRequirementGap("AUT-999", known)).toBeUndefined();
    expect(describeRequirementGap("CTRL-06", known)).toBeUndefined();
  });
});
