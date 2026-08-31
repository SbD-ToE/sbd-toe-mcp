import { describe, it, expect } from "vitest";
import {
  buildChapterApplicabilityJson,
  buildGroundedCodegenPrompt,
  buildSetupAgentPrompt,
  readGroundedCodegenGuide
} from "./sbd-toe-resources.js";

describe("buildChapterApplicabilityJson", () => {
  it("L1 returns the graduated shape (riskLevel, semantics, anchor, 15 chapters)", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L1");
    expect(String(result["semantics"])).toContain("graduated");
    expect((result["canonical_anchor"] as { document_id: string }).document_id).toContain("matriz-controlos-por-risco");
    expect((result["chapters"] as unknown[]).length).toBe(15);
    expect(result["active"]).toBeUndefined();
    expect(result["excluded"]).toBeUndefined();
  });

  it("L1 does not include conditional field", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["conditional"]).toBeUndefined();
  });

  it("L2 returns the graduated shape with derived demand on every chapter", () => {
    const result = buildChapterApplicabilityJson("L2") as { riskLevel: string; chapters: Array<{ demand: Record<string, number>; dominant: string }> };
    expect(result.riskLevel).toBe("L2");
    expect(result.chapters.every((c) => c.demand && c.dominant)).toBe(true);
  });

  it("L3 keeps every chapter present and total mandatory demand ≥ L1 (scaling)", () => {
    const l3 = buildChapterApplicabilityJson("L3") as { chapters: Array<{ demand: { obrigatorio: number } }> };
    const l1 = buildChapterApplicabilityJson("L1") as { chapters: Array<{ demand: { obrigatorio: number } }> };
    expect(l3.chapters.length).toBe(15);
    const ob = (x: { chapters: Array<{ demand: { obrigatorio: number } }> }) => x.chapters.reduce((n, c) => n + c.demand.obrigatorio, 0);
    expect(ob(l3)).toBeGreaterThan(ob(l1));
  });

  it("invalid riskLevel X throws Error mentioning X", () => {
    expect(() => buildChapterApplicabilityJson("X")).toThrow(Error);
    expect(() => buildChapterApplicabilityJson("X")).toThrow("X");
  });

  it("L1 presence is unconditional — 00/01/02/05/07/10 all present", () => {
    const result = buildChapterApplicabilityJson("L1") as { chapters: Array<{ chapter_id: string }> };
    const ids = result.chapters.map((c) => c.chapter_id);
    for (const id of ["00-fundamentos", "01-classificacao-aplicacoes", "02-requisitos-seguranca", "05-dependencias-sbom-sca", "07-cicd-seguro", "10-testes-seguranca"]) {
      expect(ids, id).toContain(id);
    }
  });

  it("L1 NEVER excludes 06/11/13 — graduated demand instead (Author decision 2026-09-01)", () => {
    const result = buildChapterApplicabilityJson("L1") as { chapters: Array<{ chapter_id: string; demand: { obrigatorio: number }; dominant: string }> };
    const by = new Map(result.chapters.map((c) => [c.chapter_id, c]));
    expect(by.get("06-desenvolvimento-seguro")?.demand.obrigatorio ?? 0).toBeGreaterThan(0); // cap06 dev L1 tem obrigatórios autorados
    expect(by.get("11-deploy-seguro")).toBeDefined();
    expect(by.get("13-formacao-onboarding")).toBeDefined();
    expect(by.get("13-formacao-onboarding")?.dominant).not.toBe("obrigatorio");
  });

  it("L2 carries chapter-06/11 with authored demand (nothing 'unlocks' — it scales)", () => {
    const result = buildChapterApplicabilityJson("L2") as { chapters: Array<{ chapter_id: string; demand: { obrigatorio: number } }> };
    const by = new Map(result.chapters.map((c) => [c.chapter_id, c]));
    expect(by.get("06-desenvolvimento-seguro")?.demand.obrigatorio ?? 0).toBeGreaterThan(0);
    expect(by.get("11-deploy-seguro")).toBeDefined();
  });

  it("L2 keeps chapter-13 present with graduated demand (binary exclusion retired)", () => {
    const result = buildChapterApplicabilityJson("L2") as { chapters: Array<{ chapter_id: string; user_stories: number }> };
    const ch13 = result.chapters.find((c) => c.chapter_id === "13-formacao-onboarding");
    expect(ch13).toBeDefined();
    expect(ch13!.user_stories).toBeGreaterThan(0);
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

  it("L2 setup prompt teaches graduated semantics and names chapter 06", () => {
    const result = buildSetupAgentPrompt("L2");
    expect(result).toContain("L2");
    expect(result).toContain("GRADUATED");
    expect(result).toContain("06-desenvolvimento-seguro");
  });

  it("setup prompt never excludes a chapter (graduated wording)", () => {
    const result = buildSetupAgentPrompt("L3");
    expect(result).toContain("L3");
    expect(result).toContain("No chapter is excluded");
    expect(result).not.toContain("Excluded chapters:");
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
