import { describe, it, expect } from "vitest";
import {
  LEGACY_CITATION_SERVING_PHRASE,
  LEGACY_REQUIREMENT_CITATION_PATTERN,
  REQUIREMENT_ID_PATTERN,
  describeRequirementCitation,
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

describe("declared gaps vs informative citations over the pinned bundle (KG v1.7.0, contract v1.11)", () => {
  const known = new Set(getOntologyData().requirements.map((r) => r.requirement_id));

  it("published ids are never gaps nor notes (namespaced or base)", () => {
    for (const id of ["REQ-AGN-001", "AUT-001", "OPS-015"]) {
      expect(describeRequirementGap(id, known), id).toBeUndefined();
      expect(describeRequirementCitation(id, known), id).toBeUndefined();
    }
  });

  it("the former legacy REQ-<CAT>-NNN citations are no longer cited (Manual v1.7.0 corrected them) → no gap", () => {
    for (const id of ["REQ-ARC-003", "REQ-AUT-001", "REQ-AUT-003", "REQ-DAT-005", "REQ-IAM-001", "REQ-LOG-004", "REQ-PRI-001", "REQ-VAL-002"]) {
      expect(getRequirementCitations(id).mention_count, id).toBe(0);
      expect(describeRequirementGap(id, known), id).toBeUndefined();
    }
  });

  it("a legacy-shaped citation would still be a declared gap if the corpus cited it (machinery kept, data-driven)", () => {
    // Synthetic: known set without AUT-003 does not turn REQ-AUT-003 into a gap because nothing cites it.
    expect(describeRequirementGap("REQ-AUT-003", new Set())).toBeUndefined();
    expect(LEGACY_CITATION_SERVING_PHRASE).toBe("citação legada não resolvível (finding editorial em curso)");
  });

  it("illustrative REQ-NNN example ids (25 mentions / 20 ids) are informative, never gaps", () => {
    const illustrative = ["REQ-010", "REQ-011", "REQ-014", "REQ-015", "REQ-017", "REQ-018", "REQ-024", "REQ-114", "REQ-115", "REQ-118",
      "REQ-203", "REQ-205", "REQ-208", "REQ-303", "REQ-307", "REQ-309", "REQ-310", "REQ-404", "REQ-405", "REQ-406"];
    let mentions = 0;
    for (const id of illustrative) {
      expect(describeRequirementGap(id, known), id).toBeUndefined();
      const note = describeRequirementCitation(id, known);
      expect(note?.status, id).toBe("informative");
      mentions += note?.cited_in.mention_count ?? 0;
    }
    expect(mentions).toBe(25);
  });

  it("non-requirement tokens captured by the <CAT>-NNN shape (CWE-, SHA-) are informative, never gaps", () => {
    for (const id of ["CWE-212", "SHA-256"]) {
      expect(describeRequirementGap(id, known), id).toBeUndefined();
      expect(describeRequirementCitation(id, known)?.status, id).toBe("informative");
    }
  });

  it("never aliases an unpublished id to a published one", () => {
    expect(JSON.stringify(describeRequirementCitation("REQ-010", known))).not.toContain('"REQ-01"');
    expect(describeRequirementCitation("EX-AUT-003", known)).toBeUndefined();
    expect(describeRequirementGap("EX-AUT-003", known)).toBeUndefined();
  });

  it("a requirement-shaped token nobody cites is neither gap nor note (caller keeps its fallback)", () => {
    expect(getRequirementCitations("REQ-ZZZ-999").mention_count).toBe(0);
    expect(describeRequirementGap("REQ-ZZZ-999", known)).toBeUndefined();
    expect(describeRequirementCitation("AUT-999", known)).toBeUndefined();
    expect(describeRequirementCitation("CTRL-06", known)).toBeUndefined();
  });
});
