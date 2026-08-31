/**
 * s4 — Workflow: turnos baratos, não menos turnos (epic v2-token-diet,
 * agentic/planeado/v2-token-diet/EPIC.md §s4, revisto pela ⟳ ADENDA
 * 2026-07-05: em produção o loop write-test-edit é legítimo — corta-se o
 * custo de cada re-consulta, não os turnos; o single-pass do bench é imposto
 * na instrução do bench, nunca aqui).
 *
 * Gates deste ficheiro:
 *   1. Templates que mencionam `prepare_sbd_toe_codegen_context` — o guia
 *      grounded-codegen (resource sbd://toe/grounded-codegen-guide + prompt
 *      prepare_grounded_codegen) e o skill do plugin — contêm as três
 *      instruções (a) payload em contexto = fonte do loop, sem re-chamada com
 *      a mesma task; (b) re-consultas legítimas via detail:"minimal" ou
 *      consult_security_requirements pontual, nunca o payload completo;
 *      (c) mode:"review" só em sessão nova.
 *      NOTA (achado do s4): NENHUMA variante do generate_sbd_toe_skill
 *      (genérica = assets/agent-guide.md; role × skill/subagent ×
 *      harnessed/skilled) menciona codegen/prepare_sbd_toe_codegen_context —
 *      o template de skill que fala de codegen é o guia grounded-codegen.
 *      O smoke do generate_sbd_toe_skill mantém-se abaixo.
 *   2. Servidor (aditivo): `repeat_call_hint` presente em standard/minimal
 *      (campo pequeno, ~50 tokens), AUSENTE em full (invariante 1 — full
 *      byte-idêntico; snapshots full sem diff, ver detail.test).
 *   3. Gate revisto do EPIC (a re-chamada minimal custa o payload minimal,
 *      5.518/7.639 — não ≤2K, que assumia o top-N removido pela ADENDA s3b):
 *      re-chamada idêntica é determinística (byte-igual) e o hint aponta a
 *      reutilização; a re-consulta pontual (consult_security_requirements)
 *      custa uma fração de re-pedir o payload — medido e afirmado abaixo.
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  REPEAT_CALL_HINT,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { handleConsultSecurityRequirements } from "./consult-security-requirements.js";
import { handleGenerateSbdToeSkill } from "./generate-sbd-toe-skill.js";
import {
  buildGroundedCodegenPrompt,
  readGroundedCodegenGuide
} from "../resources/sbd-toe-resources.js";
import { estimateSize } from "../serving/response-shaping.js";
import { resolveAppPath } from "../config.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (as no budget.test).
// ---------------------------------------------------------------------------

const FIXTURES: ReadonlyArray<{ name: string; input: PrepareCodegenContextInput }> = [
  {
    name: "fixture1",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    name: "fixture2",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    }
  }
];

const DIET_LEVELS = ["standard", "minimal"] as const;

function expectReadyDieted(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
}

/**
 * As três instruções do s4, na redação EXATA dos templates (o teste é de
 * presença textual — se a redação mudar, atualizar aqui e nos templates em
 * conjunto).
 */
const INSTRUCTION_A =
  "do NOT re-call the tool with the same task";
const INSTRUCTION_B_DETAIL = 'detail: "minimal"';
const INSTRUCTION_B_CONSULT = "consult_security_requirements";
const INSTRUCTION_B_NEVER = "never re-request the full payload";
const INSTRUCTION_C = 'mode: "review"';
const INSTRUCTION_C_SESSION = "new session";

function expectCarriesReuseInstructions(content: string, label: string): void {
  // (a) payload em contexto = fonte do loop; sem re-chamada com a mesma task.
  expect(content, `${label}: instrução (a)`).toContain(INSTRUCTION_A);
  expect(content, `${label}: instrução (a) — loop`).toContain("write-test-edit loop");
  // (b) re-consultas legítimas: detail minimal / consult pontual; nunca full.
  expect(content, `${label}: instrução (b) — detail`).toContain(INSTRUCTION_B_DETAIL);
  expect(content, `${label}: instrução (b) — consult`).toContain(INSTRUCTION_B_CONSULT);
  expect(content, `${label}: instrução (b) — nunca full`).toContain(INSTRUCTION_B_NEVER);
  // (c) review só em sessão nova.
  expect(content, `${label}: instrução (c) — mode review`).toContain(INSTRUCTION_C);
  expect(content, `${label}: instrução (c) — sessão nova`).toContain(INSTRUCTION_C_SESSION);
}

describe("s4 — templates codegen instruem reutilização de contexto (a)-(c)", () => {
  it("guia grounded-codegen (resource sbd://toe/grounded-codegen-guide) contém (a)-(c)", () => {
    expectCarriesReuseInstructions(readGroundedCodegenGuide(), "grounded-codegen guide");
  });

  it("prompt prepare_grounded_codegen embute o guia — (a)-(c) chegam ao cliente", () => {
    const prompt = buildGroundedCodegenPrompt({
      task: "Add input validation to the upload endpoint",
      mode: "codegen",
      riskLevel: "L2"
    });
    expectCarriesReuseInstructions(prompt, "prepare_grounded_codegen prompt");
  });

  it("skill do plugin (sbd-toe-plugin/skills/sbd-toe/SKILL.md) contém (a)-(c)", () => {
    const skill = readFileSync(
      resolveAppPath("sbd-toe-plugin/skills/sbd-toe/SKILL.md"),
      "utf-8"
    );
    expectCarriesReuseInstructions(skill, "plugin SKILL.md");
  });

  it("smoke: generate_sbd_toe_skill executa e devolve conteúdo válido (variantes)", () => {
    // Genérica (agent-guide) — comportamento original.
    const generic = handleGenerateSbdToeSkill();
    expect(typeof generic.content).toBe("string");
    expect(generic.content.length).toBeGreaterThan(100);
    expect(generic.content).toContain("SbD-ToE");
    // Role × formato × flavour — pipeline grounded (como nos testes existentes).
    for (const args of [
      { role: "developer", format: "skill" },
      { role: "developer", format: "subagent", flavour: "harnessed" },
      { role: "developer", format: "subagent", flavour: "skilled" }
    ] as const) {
      const result = handleGenerateSbdToeSkill({ ...args, risk_level: "L2" });
      expect(result.content.length).toBeGreaterThan(100);
      expect(result.meta?.canonical_role).toBe("developer");
      // Achado s4 (histórico): até 0.11.0 nenhuma variante mencionava o tool de
      // codegen. Mudou DE PROPÓSITO no R3 do ciclo MP1 (2026-08-31): a camada de
      // ensino (agent-guide embebido) passou a ensinar select vs consult vs
      // prepare. O guard é agora positivo: as variantes ensinam a operação de
      // selecção (duas bandas declaradas).
      expect(result.content).toContain("select_sbd_toe_requirements");
    }
    expect(generic.content).toContain("select_sbd_toe_requirements");
    expect(generic.content).toContain("narrowed_out");
  });
});

describe("s4 — repeat_call_hint no servidor (aditivo, standard/minimal)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  describe.each(FIXTURES)("$name", (fixture) => {
    it.each([...DIET_LEVELS])(
      "detail=%s inclui repeat_call_hint pequeno a apontar para a reutilização",
      (detail) => {
        const result = handlePrepareCodegenContext({ ...fixture.input, detail });
        expectReadyDieted(result);
        expect(result.repeat_call_hint).toBe(REPEAT_CALL_HINT);
        // Conteúdo: determinismo + reutilização + caminhos de re-consulta.
        expect(result.repeat_call_hint).toContain("deterministic");
        expect(result.repeat_call_hint).toContain("reuse");
        expect(result.repeat_call_hint).toContain("detail:'minimal'");
        expect(result.repeat_call_hint).toContain("consult_security_requirements");
        // Campo pequeno (~50 tokens): chave + valor, medido como no budget.test.
        const hintTokens = estimateSize({
          repeat_call_hint: result.repeat_call_hint
        }).approx_tokens;
        expect(hintTokens).toBeLessThanOrEqual(60);
      }
    );

    it("detail=full NÃO carrega o hint (invariante 1 — byte-idêntico ao clássico)", () => {
      const result = handlePrepareCodegenContext(fixture.input);
      expect(result).not.toHaveProperty("repeat_call_hint");
      const explicit = handlePrepareCodegenContext({ ...fixture.input, detail: "full" });
      expect(explicit).not.toHaveProperty("repeat_call_hint");
    });

    it("gate revisto: re-chamada idêntica em minimal é determinística (byte-igual) e barata face a full", () => {
      const first = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      const second = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      // O custo real da re-chamada minimal é o payload minimal — muito menor
      // que re-pedir o payload full (o gate ≤2K original assumia o top-N
      // removido pela ADENDA s3b; ver EPIC §s3b/§s4).
      const minimalTokens = estimateSize(first).approx_tokens;
      const fullTokens = estimateSize(handlePrepareCodegenContext(fixture.input)).approx_tokens;
      expect(minimalTokens).toBeLessThan(fullTokens / 2);
    });
  });

  it("re-consulta pontual (consult_security_requirements) custa uma fração do payload minimal", () => {
    // Exemplo real do EPIC §s4(b): aprofundar o concern "auth" da fixture 1
    // sem re-pedir o payload completo.
    const targeted = handleConsultSecurityRequirements({
      risk_level: "L2",
      concerns: ["auth"]
    });
    const targetedTokens = estimateSize(targeted).approx_tokens;
    const minimal = handlePrepareCodegenContext({
      ...FIXTURES[0]!.input,
      detail: "minimal"
    });
    expectReadyDieted(minimal);
    const minimalTokens = estimateSize(minimal).approx_tokens;
    expect(targetedTokens).toBeLessThan(minimalTokens);
    // E ordens de magnitude abaixo do full (18.9K baseline).
    const fullTokens = estimateSize(
      handlePrepareCodegenContext(FIXTURES[0]!.input)
    ).approx_tokens;
    expect(targetedTokens).toBeLessThan(fullTokens / 3);
  });
});
