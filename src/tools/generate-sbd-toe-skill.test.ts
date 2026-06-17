import { describe, it, expect } from "vitest";
import { handleGenerateSbdToeSkill } from "./generate-sbd-toe-skill.js";
import { handleGetGuideByRole } from "./get-guide-by-role.js";

describe("handleGenerateSbdToeSkill", () => {
  it("returns an object with a non-empty content string", () => {
    const result = handleGenerateSbdToeSkill();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(100);
  });

  it("content includes SbD-ToE identity", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("SbD-ToE");
    expect(content).toContain("Theory of Everything");
  });

  it("content includes source comment pointing to MCP resource", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("sbd://toe/agent-guide");
  });

  it("content includes agent-guide sections", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("CONSULT");
    expect(content).toContain("GUIDE");
  });
});

// RF-S Stage 1 — role-specialised skill + sub-agent serving
// Contract: agentic/em-curso/2026-06-12-pontifex-rfs-stage1-contract.md

function frontmatterOf(content: string): string {
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  return m?.[1] ?? "";
}

describe("generate_sbd_toe_skill — RF-S role serving", () => {
  it("ACCEPTANCE: devops-sre subagent guidance matches what get_guide_by_role grounds", () => {
    const result = handleGenerateSbdToeSkill({
      role: "devops-sre",
      format: "subagent",
      flavour: "skilled",
      risk_level: "L2"
    });
    const guide = handleGetGuideByRole({ risk_level: "L2", role: "devops-sre", include_detail: true });

    // Installable definition: frontmatter with name + description + tools.
    const fm = frontmatterOf(result.content);
    expect(fm).toContain("name: sbd-devops-sre");
    expect(fm).toContain("description:");
    expect(fm).toContain("tools:");

    // Every user story in the embedded slice exists in the guide output (never invented)…
    const guideUsIds = new Set((guide.role_checklist ?? []).map((e) => e.us_id ?? e.id));
    const embeddedUsIds = [...result.content.matchAll(/\*\*(US-[^*]+)\*\*/g)].map((m) => m[1]);
    expect(embeddedUsIds.length).toBeGreaterThan(0);
    for (const id of embeddedUsIds) {
      expect(guideUsIds.has(id), `embedded ${id} must exist in get_guide_by_role output`).toBe(true);
    }

    // …and coverage counts equal the guide totals (coverage-preserving, nothing hidden).
    const checklist = guide.role_checklist ?? [];
    expect(result.meta?.coverage.user_stories).toBe(checklist.length);
    expect(result.meta?.coverage.assignments).toBe(guide.meta.assignmentCount);
    expect(result.meta?.coverage.checklist_items).toBe(
      checklist.reduce((n, e) => n + e.checklist_items.length, 0)
    );
    expect(result.content).toContain(`${checklist.length} user stories`);
    expect(result.content).toContain("not** the whole manual");
  });

  it("GUARD-RAIL: skilled flavour carries no MCP tools", () => {
    const result = handleGenerateSbdToeSkill({ role: "devops-sre", format: "subagent", flavour: "skilled" });
    expect(frontmatterOf(result.content)).not.toContain("mcp__sbd-toe__");
  });

  it("harnessed flavour grants mcp__sbd-toe__* and points to live querying", () => {
    const result = handleGenerateSbdToeSkill({ role: "devops-sre", format: "subagent", flavour: "harnessed" });
    expect(frontmatterOf(result.content)).toContain("mcp__sbd-toe__get_guide_by_role");
    expect(result.content).toContain("include_detail=true");
    expect(result.meta?.flavour).toBe("harnessed");
  });

  it("resolves natural role aliases to the canonical role", () => {
    const result = handleGenerateSbdToeSkill({ role: "sre", format: "skill" });
    expect(result.meta?.canonical_role).toBe("devops-sre");
    expect(result.content).toContain("name: sbd-devops-sre");
  });

  it("rejects unknown roles listing the canonical 13 — never invents", () => {
    expect(() => handleGenerateSbdToeSkill({ role: "pentester" })).toThrowError(/Canonical roles:.*devops-sre/);
  });

  it("include_detail embeds checklist items verbatim from the guide", () => {
    const result = handleGenerateSbdToeSkill({ role: "qa", format: "skill", include_detail: true });
    const guide = handleGetGuideByRole({ risk_level: "L2", role: "qa", include_detail: true });
    const firstItem = (guide.role_checklist ?? []).find((e) => e.checklist_items.length > 0)?.checklist_items[0];
    expect(firstItem).toBeDefined();
    expect(result.content).toContain(firstItem as string);
  });

  it("default digest omits checklist item bodies (token-bomb guard)", () => {
    const digest = handleGenerateSbdToeSkill({ role: "devops-sre", format: "skill" });
    const detailed = handleGenerateSbdToeSkill({ role: "devops-sre", format: "skill", include_detail: true });
    expect(digest.content).not.toContain("- [ ]");
    expect(detailed.content).toContain("- [ ]");
    expect(digest.content.length).toBeLessThan(detailed.content.length);
  });

  it("validates risk_level, format and flavour", () => {
    expect(() => handleGenerateSbdToeSkill({ role: "qa", risk_level: "L9" })).toThrowError(/risk_level/);
    expect(() => handleGenerateSbdToeSkill({ role: "qa", format: "agent" })).toThrowError(/format/);
    expect(() => handleGenerateSbdToeSkill({ role: "qa", format: "subagent", flavour: "frozen" })).toThrowError(/flavour/);
  });

  it("suggested_path follows format and clientType", () => {
    expect(handleGenerateSbdToeSkill({ role: "qa", format: "subagent" }).suggested_path).toBe(
      ".claude/agents/sbd-qa.md"
    );
    expect(handleGenerateSbdToeSkill({ role: "qa", format: "skill" }).suggested_path).toBe(
      ".claude/skills/sbd-qa.md"
    );
    expect(handleGenerateSbdToeSkill({ role: "qa", format: "skill", clientType: "copilot" }).suggested_path).toBe(
      ".github/copilot-instructions.md"
    );
  });

  it("no-role call keeps the original generic behaviour (backwards-compatible)", () => {
    const result = handleGenerateSbdToeSkill({});
    expect(result.content).toContain("sbd://toe/agent-guide");
    expect(result.meta).toBeUndefined();
  });
});
