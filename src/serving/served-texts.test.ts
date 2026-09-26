/**
 * 0.21.2 (lead, 2026-09-26) — os textos SERVIDOS dizem o que o servidor faz hoje, sem versões na prosa.
 *
 * Guarda quatro textos que ficaram para trás quando o comportamento mudou: o guia de codegen
 * (needs_input; perante needs_decomposition EXECUTAR os lotes dados), a descrição e o conteúdo de
 * codegen-instructions (sem `minimal`, sem «linha 0.20», sem `codegen_instructions_ref`), a nota de
 * coverage_gaps (sem contradição quando a contagem é 0) e a tabela de estados do README.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RESOURCE_CATALOG } from "./server-surface.js";
import { readGroundedCodegenGuide, buildGroundedCodegenPrompt } from "../resources/sbd-toe-resources.js";
import { buildCodegenInstructionsResourceContent } from "../tools/prepare-codegen-context.js";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";

const VERSION_IN_PROSE = /\b0\.(1\d|2\d)(\.\d+)?\b|§\d/;

describe("textos servidos alinhados com o comportamento (0.21.2)", () => {
  it("guia de codegen: conhece needs_input; perante needs_decomposition executa os lotes dados; sem versões na prosa", () => {
    const guide = readGroundedCodegenGuide();
    expect(guide).toMatch(/### status: needs_input/);
    expect(guide).toMatch(/requirement_ceiling\.batches/);
    expect(guide).toMatch(/EXECUTE it/);
    expect(guide).not.toMatch(/2–4 bite-size sub-tasks/);
    expect(guide).not.toMatch(/partial_activation_trace/);
    expect(guide).not.toMatch(VERSION_IN_PROSE);
    for (const status of ["ready_for_codegen", "needs_clarification", "needs_input", "needs_decomposition", "unsupported_scope"]) {
      expect(guide, status).toContain(`### status: ${status}`);
    }
    const guideEntry = RESOURCE_CATALOG.find((r) => r.uri === "sbd://toe/grounded-codegen-guide")!;
    expect(guideEntry.description).toMatch(/needs_input/);
  });

  it("prompt de codegen (setup): ramifica pelos cinco estados e manda executar os lotes", () => {
    const prompt = JSON.stringify(buildGroundedCodegenPrompt({ task: "x" } as never));
    expect(prompt).toMatch(/needs_input/);
    expect(prompt).toMatch(/requirement_ceiling\.batches/);
    expect(prompt).not.toMatch(/2–4 bite-size/);
  });

  it("codegen-instructions: descrição e conteúdo sem `minimal`, sem «linha 0.20», sem codegen_instructions_ref", () => {
    const entry = RESOURCE_CATALOG.find((r) => r.uri === "sbd://toe/codegen-instructions/{mode}")!;
    expect(entry.description).not.toMatch(/minimal|codegen_instructions_ref/);
    expect(entry.description).not.toMatch(VERSION_IN_PROSE);
    for (const mode of ["codegen", "review", "test-plan"] as const) {
      const c = buildCodegenInstructionsResourceContent(mode);
      expect(c.note).not.toMatch(VERSION_IN_PROSE);
      expect(c.line_note).not.toMatch(VERSION_IN_PROSE);
      expect(c.line_note).toMatch(/trace_sbd_toe_graph/);
    }
  });

  it("coverage_gaps: com contagem 0 a nota não fala de lacuna nem de camada por refrescar; sem datas", () => {
    for (const risk_level of ["L1", "L2", "L3"]) {
      const r = handleConsultSecurityRequirements({ risk_level }) as unknown as { coverage_gaps?: { requirements_without_control_link: { count: number; note: string } }; data?: { coverage_gaps: { requirements_without_control_link: { count: number; note: string } } } };
      const g = (r.coverage_gaps ?? r.data!.coverage_gaps).requirements_without_control_link;
      expect(g.note).not.toMatch(/not refreshed|20\d\d-\d\d-\d\d|Codex/);
      if (g.count === 0) expect(g.note).toMatch(/^All \d+ active requirements have at least one/);
    }
  });

  it("README: cinco estados, needs_input presente, needs_decomposition manda executar os lotes", () => {
    const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf-8");
    const i = readme.indexOf("### Scope gate");
    const table = readme.slice(i, readme.indexOf("###", i + 5));
    expect(table).toMatch(/five output states/);
    expect(table).toMatch(/`needs_input`/);
    expect(table).toMatch(/requirement_ceiling\.batches/);
    expect(table).not.toMatch(/bite-size|Propose 2–4/);
  });
});
