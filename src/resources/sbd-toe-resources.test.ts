import { describe, it, expect } from "vitest";
import {
  buildChapterApplicabilityJson,
  buildGroundedCodegenPrompt,
  buildSetupAgentPrompt,
  readGroundedCodegenGuide
} from "./sbd-toe-resources.js";

describe("buildChapterApplicabilityJson", () => {
  it("L1 returns object with riskLevel, active and excluded arrays", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L1");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L1 does not include conditional field", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["conditional"]).toBeUndefined();
  });

  it("L2 returns object with riskLevel and arrays", () => {
    const result = buildChapterApplicabilityJson("L2") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L2");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L3 returns object with all chapters active and excluded empty", () => {
    const result = buildChapterApplicabilityJson("L3") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L3");
    expect((result["excluded"] as string[]).length).toBe(0);
    // All 15 chapters (Cap. 00–14) should be active
    expect((result["active"] as string[]).length).toBe(15);
  });

  it("invalid riskLevel X throws Error mentioning X", () => {
    expect(() => buildChapterApplicabilityJson("X")).toThrow(Error);
    expect(() => buildChapterApplicabilityJson("X")).toThrow("X");
  });

  it("L1 active list contains chapters with minLevel L1", () => {
    const result = buildChapterApplicabilityJson("L1") as { active: string[] };
    expect(result.active).toContain("Cap. 00");
    expect(result.active).toContain("Cap. 01");
    expect(result.active).toContain("Cap. 02");
    expect(result.active).toContain("Cap. 05");
    expect(result.active).toContain("Cap. 07");
    expect(result.active).toContain("Cap. 10");
  });

  it("L1 excludes Cap. 06, Cap. 11, Cap. 13 (minLevel L2/L3)", () => {
    const result = buildChapterApplicabilityJson("L1") as { excluded: string[] };
    expect(result.excluded).toContain("Cap. 06");
    expect(result.excluded).toContain("Cap. 11");
    expect(result.excluded).toContain("Cap. 13");
  });

  it("L2 active list includes Cap. 06 and Cap. 11 (unlocked at L2)", () => {
    const result = buildChapterApplicabilityJson("L2") as { active: string[] };
    expect(result.active).toContain("Cap. 06");
    expect(result.active).toContain("Cap. 11");
  });

  it("L2 still excludes Cap. 13 (minLevel L3)", () => {
    const result = buildChapterApplicabilityJson("L2") as { excluded: string[] };
    expect(result.excluded).toContain("Cap. 13");
  });
});

describe("buildSetupAgentPrompt", () => {
  it("L1 returns non-empty string containing L1 and Cap. 01", () => {
    const result = buildSetupAgentPrompt("L1");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("L1");
    expect(result).toContain("Cap. 01");
  });

  it("L1 with projectRole includes projectRole in text", () => {
    const result = buildSetupAgentPrompt("L1", "mcp-wrapper");
    expect(result).toContain("mcp-wrapper");
  });

  it("L1 without projectRole contains mandatory rules", () => {
    const result = buildSetupAgentPrompt("L1");
    expect(result).toContain("Cap. 01");
    expect(result).toContain("Cap. 02");
    expect(result).toContain("search_sbd_toe_manual");
  });

  it("L2 includes Cap. 06 and Cap. 11 in active chapters", () => {
    const result = buildSetupAgentPrompt("L2");
    expect(result).toContain("L2");
    expect(result).toContain("Cap. 06");
    expect(result).toContain("Cap. 11");
  });

  it("L3 has no excluded chapters", () => {
    const result = buildSetupAgentPrompt("L3");
    expect(result).toContain("L3");
    expect(result).toContain("none");
  });

  it("invalid L4 riskLevel throws Error mentioning L4", () => {
    expect(() => buildSetupAgentPrompt("L4")).toThrow(Error);
    expect(() => buildSetupAgentPrompt("L4")).toThrow("L4");
  });

  it("invalid empty string riskLevel throws Error", () => {
    expect(() => buildSetupAgentPrompt("")).toThrow(Error);
  });
});

describe("readGroundedCodegenGuide", () => {
  it("loads the canonical grounded-codegen guide from disk and enforces gate rules", () => {
    const guide = readGroundedCodegenGuide();
    expect(guide.length).toBeGreaterThan(500);
    // The guide must explicitly cover the four status branches.
    for (const status of [
      "ready_for_codegen",
      "needs_clarification",
      "needs_decomposition",
      "unsupported_scope"
    ]) {
      expect(guide).toContain(status);
    }
    // Must mandate citation_map citations.
    expect(guide).toMatch(/citation_map/);
    // Must forbid compliance claims and ID invention.
    expect(guide.toLowerCase()).toMatch(/never declare compliance|do not declare/);
    expect(guide.toLowerCase()).toMatch(/never invent|do not invent/);
    // Must distinguish code / tests / evidence.
    expect(guide.toLowerCase()).toMatch(/code/);
    expect(guide.toLowerCase()).toMatch(/tests?/);
    expect(guide.toLowerCase()).toMatch(/evidence/);
  });
});

describe("buildGroundedCodegenPrompt", () => {
  it("embeds the canonical guide and the user task", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Add payload validation to PATCH /users/:id/email"
    });
    expect(prompt).toContain("SbD-ToE Grounded Codegen Guide");
    expect(prompt).toContain("Add payload validation to PATCH /users/:id/email");
    expect(prompt).toContain("prepare_sbd_toe_codegen_context");
  });

  it("echoes mode / risk_level / concerns / stack / regulatory args in the tool-call recipe", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Add payload validation to PATCH /users/:id/email",
      mode: "codegen",
      riskLevel: "L2",
      concerns: ["api", "validation"],
      stack: "Node.js/Express",
      regulatoryFrameworks: ["CRA"],
      includeRegulatoryOverlay: true
    });
    expect(prompt).toMatch(/mode:\s*codegen/);
    expect(prompt).toMatch(/risk_level:\s*L2/);
    expect(prompt).toMatch(/concerns:\s*\["api",\s*"validation"\]/);
    expect(prompt).toMatch(/stack:\s*Node\.js\/Express/);
    expect(prompt).toMatch(/regulatory_frameworks:\s*\["CRA"\]/);
    expect(prompt).toMatch(/include_regulatory_overlay:\s*true/);
  });

  it("defaults mode=codegen when omitted and signals missing risk_level", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Remove hardcoded API key from src/config.ts"
    });
    expect(prompt).toMatch(/mode:\s*codegen/);
    expect(prompt).toMatch(/risk_level: \(not provided/);
    expect(prompt).toMatch(/concerns: \(let the activation engine infer/);
    expect(prompt).toMatch(/include_regulatory_overlay: false/);
  });

  it("rejects empty task strings", () => {
    expect(() => buildGroundedCodegenPrompt({ task: "" })).toThrow(Error);
    expect(() => buildGroundedCodegenPrompt({ task: "   " })).toThrow(Error);
  });

  it("rejects invalid mode by falling back to codegen rather than echoing it", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Add payload validation",
      mode: "destroy-everything"
    });
    expect(prompt).toMatch(/mode:\s*codegen/);
    expect(prompt).not.toContain("destroy-everything");
  });

  it("riskLevel is whitelisted to L1/L2/L3 — invalid strings are treated as not provided", () => {
    const evil = buildGroundedCodegenPrompt({
      task: "Add payload validation",
      riskLevel: "L9; rm -rf /"
    });
    expect(evil).not.toContain("L9");
    expect(evil).not.toContain("rm -rf");
    expect(evil).toMatch(/risk_level: \(not provided/);

    const empty = buildGroundedCodegenPrompt({
      task: "Add payload validation",
      riskLevel: ""
    });
    expect(empty).toMatch(/risk_level: \(not provided/);

    const valid = buildGroundedCodegenPrompt({
      task: "Add payload validation",
      riskLevel: "L2"
    });
    expect(valid).toMatch(/risk_level:\s*L2/);
  });

  it("guidance forbids compliance claims and ID invention even after task echo", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Add payload validation to PATCH /users/:id/email"
    });
    expect(prompt.toLowerCase()).toContain("do not declare regulatory compliance");
    expect(prompt.toLowerCase()).toContain("do not invent identifiers");
    expect(prompt.toLowerCase()).toContain("do not treat ai-generated code as evidence");
  });

  it("distinguishes needs_clarification, needs_decomposition and unsupported_scope branches", () => {
    const prompt = buildGroundedCodegenPrompt({ task: "Add payload validation" });
    expect(prompt).toMatch(/needs_clarification\b.*STOP/s);
    expect(prompt).toMatch(/needs_decomposition\b.*STOP/s);
    expect(prompt).toMatch(/unsupported_scope\b.*STOP/s);
  });
});
