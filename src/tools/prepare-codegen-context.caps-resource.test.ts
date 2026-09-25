/**
 * 0.20.0-beta.21 («declarativo primeiro»): ESTE ficheiro mede CODIFICAÇÃO (dieta v2),
 * não selecção. Para a série de medições continuar comparável byte a byte, as fixtures
 * correm no caminho inferencial histórico — `selection_mode: "discover"` — injectado
 * em `handlePrepareCodegenContext` pelo wrapper abaixo.
 */
/**
 * 0.21 §1 — O REQUISITO FUNDIDO, o resource de instruções e o "how" publicado.
 *
 * Este ficheiro era o dos caps do s3 (evidence_patterns 25→10→5→0 por nível). Os
 * caps morreram com o bloco: o padrão de evidência de cada requisito vai fundido
 * no próprio requisito, em TODOS os níveis. Gates desta fase:
 *   - `llm_codegen_instructions` + `security_rationale_template` INLINE em todos
 *     os níveis (2,2% do payload e é o que impede a invenção de ids), byte-iguais
 *     ao full; o resource `sbd://toe/codegen-instructions/{mode}` continua a ser a
 *     cópia de referência slot a slot e reconstrói o inline byte-igual;
 *   - `activation_trace` só com `debug: true` em lista/standard; contador exacto;
 *   - QUALIDADE (o "how"): `description` VERBATIM de requirements.json em todos os
 *     níveis (full incluído — a descrição nunca sai), `verify`/`evidence` VERBATIM
 *     de evidence_patterns.json (1:1 por requisito), description dos controlos
 *     `direct` verbatim de controls.json em todos os níveis;
 *   - sem bloco `g2_context.evidence_patterns` em nível nenhum; o sumário
 *     `completeness_report.verification` tem denominadores que fecham e refs
 *     executáveis (≤50 ids por chamada da matriz);
 *   - derivação `category` = segmento do id: invariante em TODO o bundle; o campo
 *     não viaja em nível nenhum (guarda sem perda testada no detail.test).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildCodegenInstructionsResourceContent,
  CODEGEN_INSTRUCTION_MODES,
  handlePrepareCodegenContext,
  type CodegenMode,
  type InstructionCondition,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  citableIds,
  type PrepareCodegenContextResultReadyFull as PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { getOntologyData } from "./ontology-loader.js";
import { requirementCategoryOf } from "../serving/requirement-id.js";
import { resolveAppPath } from "../config.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

const __prepareRaw = handlePrepareCodegenContext;
const handlePrepareCodegenContextDiscover = (input: Parameters<typeof __prepareRaw>[0]) =>
  __prepareRaw({ selection_mode: "discover", ...input });

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    }
  }
];

const DIET_LEVELS = ["lista", "standard"] as const;
const ALL_LEVELS = ["lista", "standard", "full"] as const;

function loadBundleItems(relPath: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(resolveAppPath(relPath), "utf-8")) as
    | Array<Record<string, unknown>>
    | { items?: Array<Record<string, unknown>> };
  return Array.isArray(parsed) ? parsed : (parsed.items ?? []);
}

function expectReadyFull(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}

function expectReadyDieted(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}

type Ready = PrepareCodegenContextResultReady | PrepareCodegenContextResultReadyDieted;

function run(input: PrepareCodegenContextInput, detail: (typeof ALL_LEVELS)[number]): Ready {
  const result = handlePrepareCodegenContextDiscover({ ...input, detail });
  if (detail === "full") expectReadyFull(result);
  else expectReadyDieted(result);
  return result as Ready;
}

/** Condições dos slots, DERIVADAS do próprio payload (a regra publicada no resource). */
function conditionsFor(result: Ready): InstructionCondition[] {
  const active: InstructionCondition[] = [];
  if (result.activated_scope.regulatory_obligations.length > 0) active.push("regulatory_overlay");
  const risk = result.input_echo.risk_level;
  if (risk === "L1" || risk === "L2" || risk === "L3") active.push(`risk_level:${risk}`);
  if (citableIds(result).length === 0) active.push("citations_empty");
  return active;
}

function assembleInstructions(mode: CodegenMode, activeConditions: readonly InstructionCondition[]): string[] {
  const resource = buildCodegenInstructionsResourceContent(mode);
  const active = new Set(activeConditions);
  return resource.llm_codegen_instructions.slots
    .filter((slot) => slot.when === "always" || active.has(slot.when))
    .map((slot) => slot.text);
}

function assembleTemplate(mode: CodegenMode, echoedTask: string): unknown {
  const resource = buildCodegenInstructionsResourceContent(mode);
  return { ...resource.security_rationale_template.template, task: echoedTask.trim() };
}

describe("prepare_sbd_toe_codegen_context — requisito fundido + resource + description (0.21 §1)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  // -------------------------------------------------------------------------
  // Instruções + template INLINE; o resource é a cópia de referência
  // -------------------------------------------------------------------------

  describe("resource codegen-instructions", () => {
    it("lista/standard trazem instructions/template INLINE, byte-iguais ao full, e sem codegen_instructions_ref", () => {
      for (const fixture of FIXTURES) {
        const full = run(fixture.input, "full");
        for (const detail of DIET_LEVELS) {
          const dieted = run(fixture.input, detail);
          expect(dieted).not.toHaveProperty("codegen_instructions_ref");
          expect(JSON.stringify(dieted.llm_codegen_instructions)).toBe(JSON.stringify(full.llm_codegen_instructions));
          expect(JSON.stringify(dieted.security_rationale_template)).toBe(JSON.stringify(full.security_rationale_template));
          expect(dieted.llm_codegen_instructions.length).toBeGreaterThan(0);
        }
      }
    });

    it.each([...CODEGEN_INSTRUCTION_MODES])(
      "mode %s: os slots do resource filtrados pelas condições derivadas do payload reconstroem o inline BYTE-IGUAL (full e lista)",
      (mode) => {
        for (const fixture of FIXTURES) {
          for (const detail of ["full", "lista"] as const) {
            const result = run({ ...fixture.input, mode }, detail);
            const instructions = assembleInstructions(mode, conditionsFor(result));
            expect(JSON.stringify(instructions)).toBe(JSON.stringify(result.llm_codegen_instructions));
            const template = assembleTemplate(mode, result.input_echo.task);
            expect(JSON.stringify(template)).toBe(JSON.stringify(result.security_rationale_template));
          }
        }
      }
    );

    it("sem risk_level: a condição não dispara e a reconstrução continua byte-igual", () => {
      const input: PrepareCodegenContextInput = {
        task: "Add input validation to the POST /orders endpoint payload",
        mode: "codegen"
      };
      const result = run(input, "lista");
      expect(conditionsFor(result)).toEqual([]);
      expect(JSON.stringify(assembleInstructions("codegen", []))).toBe(JSON.stringify(result.llm_codegen_instructions));
    });

    it("task com whitespace: template com trim é byte-igual ao inline", () => {
      const input: PrepareCodegenContextInput = {
        task: "  Add payload validation to the PATCH /users/:id/email endpoint  ",
        risk_level: "L2",
        mode: "codegen"
      };
      const result = run(input, "lista");
      expect(JSON.stringify(assembleTemplate("codegen", result.input_echo.task))).toBe(
        JSON.stringify(result.security_rationale_template)
      );
    });

    it("o resource é determinístico e a legenda detail_encoding descreve os três níveis (sem ultrathin) e a verificação fundida", () => {
      for (const mode of CODEGEN_INSTRUCTION_MODES) {
        const first = buildCodegenInstructionsResourceContent(mode);
        const second = buildCodegenInstructionsResourceContent(mode);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
        expect(first.resource).toBe(`sbd://toe/codegen-instructions/${mode}`);
        expect(Object.keys(first.detail_encoding.sources.map)).toContain("activated_scope.requirements");
        expect(Object.keys(first.detail_encoding.sources.map)).not.toContain("g2_context.evidence_patterns");
        expect(first.detail_encoding.levels).toMatch(/lista/);
        expect(first.detail_encoding.levels).toMatch(/retired/);
        expect(first.detail_encoding.verification).toMatch(/no g2_context\.evidence_patterns block/);
        expect(first.detail_encoding).not.toHaveProperty("ultrathin");
        expect(first.security_rationale_template.template.task).toBeNull();
      }
    });

    it("test-plan: a instrução ensina a usar verify/evidence inline e a ref da matriz — não o bloco morto", () => {
      const result = run({ ...FIXTURES[0]!.input, mode: "test-plan" }, "lista");
      const slot = result.llm_codegen_instructions.find((t) => t.startsWith("Test-plan mode"));
      expect(slot).toBeDefined();
      expect(slot).toMatch(/`verify`/);
      expect(slot).toMatch(/verification\.by_ref/);
      expect(slot).not.toMatch(/reference evidence_patterns/);
    });
  });

  // -------------------------------------------------------------------------
  // activation_trace só com debug (contador exacto)
  // -------------------------------------------------------------------------

  describe.each(FIXTURES)("$label — activation_trace", (fixture) => {
    it.each([...DIET_LEVELS])("%s: elidido por omissão, contador exacto", (detail) => {
      const full = run(fixture.input, "full") as PrepareCodegenContextResultReady;
      const dieted = run(fixture.input, detail) as PrepareCodegenContextResultReadyDieted;
      expect(dieted.activation_trace).toBeUndefined();
      expect(dieted.activation_trace_ref?.entries).toBe(full.activation_trace.length);
      expect(dieted.activation_trace_ref?.note).toMatch(/lista\/standard/);
    });

    it("debug=true repõe o trace completo (byte-igual ao de full) e remove o contador", () => {
      const fullDebug = handlePrepareCodegenContextDiscover({ ...fixture.input, debug: true });
      expectReadyFull(fullDebug);
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard", debug: true });
      expectReadyDieted(dieted);
      expect(dieted.activation_trace_ref).toBeUndefined();
      expect(JSON.stringify(dieted.activation_trace)).toBe(JSON.stringify(fullDebug.activation_trace));
      expect(dieted.debug).toBeDefined();
    });

    it("full mantém sempre o trace inline (com e sem debug)", () => {
      const full = run(fixture.input, "full");
      expect(Array.isArray((full as PrepareCodegenContextResultReady).activation_trace)).toBe(true);
      expect(full).not.toHaveProperty("activation_trace_ref");
    });
  });

  // -------------------------------------------------------------------------
  // O requisito fundido — verbatim do bundle publicado, em TODOS os níveis
  // -------------------------------------------------------------------------

  describe.each(FIXTURES)("$label — o requisito fundido, verbatim do bundle", (fixture) => {
    it.each([...ALL_LEVELS])(
      "%s: description byte-igual a requirements.json; verify/evidence byte-iguais a evidence_patterns.json (1:1)",
      (detail) => {
        const requirements = loadBundleItems("data/publish/runtime/requirements.json");
        const descriptionById = new Map(requirements.map((item) => [item.requirement_id as string, item.description as string]));
        const typeById = new Map(requirements.map((item) => [item.requirement_id as string, item.type as string]));
        const patternByReq = new Map(
          loadBundleItems("data/publish/runtime/evidence_patterns.json").map((item) => [item.maps_to_requirement_id as string, item])
        );
        const result = run(fixture.input, detail);
        expect(result.activated_scope.requirements.length).toBeGreaterThan(0);
        for (const requirement of result.activated_scope.requirements) {
          expect(requirement.id).toMatch(/^[A-Z]{3}-\d{3}$|^REQ-[A-Z]{3}-\d{3}$/);
          expect(requirement.description).toBe(descriptionById.get(requirement.id));
          expect(requirement.type).toBe(typeById.get(requirement.id));
          const pattern = patternByReq.get(requirement.id);
          expect(pattern, `bundle sem padrão para ${requirement.id}`).toBeDefined();
          // o bundle publica alguns padrões com verification_logic VAZIO (EP-ENC-*): o
          // campo não viaja e o requisito conta como `partial` — declarado, nunca omitido.
          expect(requirement.verify ?? "").toBe((pattern!.verification_logic as string | undefined) ?? "");
          expect(requirement.evidence ?? "").toBe((pattern!.evidence_expectation as string | undefined) ?? "");
          if (detail === "full") expect((requirement as { source?: string }).source).toBe("runtime_v0");
          else expect(requirement).not.toHaveProperty("source");
        }
      }
    );

    it.each([...ALL_LEVELS])(
      "%s: controls direct com description byte-igual a controls.json; derived sem description",
      (detail) => {
        const descriptionById = new Map(
          loadBundleItems("data/publish/runtime/controls.json").map((item) => [item.control_id as string, item.description as string])
        );
        const result = run(fixture.input, detail);
        const direct = result.activated_scope.controls.filter((control) => control.confidence === "direct");
        expect(direct.length).toBeGreaterThan(0);
        for (const control of result.activated_scope.controls) {
          if (control.confidence === "direct") expect(control.description).toBe(descriptionById.get(control.control_id));
          else expect(control.description).toBeUndefined();
        }
      }
    );

    it.each([...ALL_LEVELS])(
      "%s: sem bloco evidence_patterns; verification com denominadores que fecham; by_ref ≤50 ids por chamada",
      (detail) => {
        const result = run(fixture.input, detail);
        expect(result.g2_context).not.toHaveProperty("evidence_patterns");
        expect(result.completeness_report).not.toHaveProperty("evidence_patterns_total");
        const v = result.completeness_report.verification;
        expect(v.requirements).toBe(result.activated_scope.requirements.length);
        expect(v.with_verify_and_evidence + v.partial + v.without_pattern).toBe(v.requirements);
        expect(v.with_verify_and_evidence).toBe(result.activated_scope.requirements.filter((r) => r.verify && r.evidence).length);
        expect(v.by_ref.tool).toBe("get_sbd_toe_verification_matrix");
        expect(v.by_ref.calls).toBe(Math.ceil(v.requirements / 50));
        expect(v.by_ref.with).toMatch(/≤50 por chamada/);
        expect(v.related_by_control_outside_scope.ref.tool).toBe("resolve_entities");
      }
    );
  });

  // -------------------------------------------------------------------------
  // Derivação category = segmento do id — invariante do bundle
  // -------------------------------------------------------------------------

  it("invariante bundle-wide: category == segmento de categoria do requirement_id (v1.10 §1.18) em TODOS os requirements publicados", () => {
    const requirements = getOntologyData().requirements;
    expect(requirements.length).toBeGreaterThan(0);
    for (const requirement of requirements) {
      expect(requirementCategoryOf(requirement.requirement_id)).toBe(requirement.category);
    }
    const agn = requirements.filter((r) => r.requirement_id.startsWith("REQ-AGN-"));
    expect(agn.map((r) => r.category)).toEqual(agn.map(() => "AGN"));
    expect(agn.length).toBe(4);
  });

  it("category (derivável) não viaja em nível nenhum; `id` substitui `requirement_id` em todos", () => {
    for (const fixture of FIXTURES) {
      for (const detail of ALL_LEVELS) {
        const result = run(fixture.input, detail);
        for (const requirement of result.activated_scope.requirements) {
          expect(requirement).not.toHaveProperty("category");
          expect(requirement).not.toHaveProperty("requirement_id");
        }
      }
    }
  });

  it("sentinela do budget.test (s1FusionLanded): description + verify em todos os requisitos e sem bloco — em lista, standard e full", () => {
    for (const detail of ALL_LEVELS) {
      const result = run(FIXTURES[0]!.input, detail);
      expect(result.activated_scope.requirements.every((item) => "description" in item && "verify" in item)).toBe(true);
      expect("evidence_patterns" in (result.g2_context as object)).toBe(false);
    }
  });
});
