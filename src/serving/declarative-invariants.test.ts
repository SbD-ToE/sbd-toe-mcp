/**
 * 0.20.0-beta.22 — a regra transversal do ciclo, verificada como PROPRIEDADE:
 *
 *   «nada acontece sem traço, nada falta sem aviso»
 *
 * Não é um cenário: é uma varredura sobre combinações de declarações. O ponto cego
 * do P1-A (declarações válidas mas inertes davam `selected: []` calado) era o mesmo
 * do antigo `empty_selection_warning` noutra roupa — por isso a guarda passa a ser
 * testada como invariante, não como caso.
 */
import { describe, it, expect } from "vitest";
import { runSelection, type SelectionResult } from "./selection.js";
import { buildActivationVocabulary, EXPOSURE_VALUES, SENSITIVITY_VALUES } from "./activation-vocabulary.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";

const LEVELS = ["L1", "L2", "L3"] as const;
const vocab = buildActivationVocabulary();
const CONCERNS = vocab.concerns.values.map((c) => String(c.value));

/** Todas as combinações declaráveis que interessam à invariante (inclui as inertes). */
function declarationMatrix(): Array<Record<string, unknown>> {
  const cases: Array<Record<string, unknown>> = [];
  for (const risk_level of LEVELS) {
    cases.push({ risk_level });
    cases.push({ risk_level, task: "prosa que o servidor não deve interpretar" });
    for (const exposure of EXPOSURE_VALUES) cases.push({ risk_level, exposure });
    for (const data_sensitivity of SENSITIVITY_VALUES) cases.push({ risk_level, data_sensitivity });
    for (const exposure of EXPOSURE_VALUES)
      for (const data_sensitivity of SENSITIVITY_VALUES) cases.push({ risk_level, exposure, data_sensitivity });
    for (const c of CONCERNS) cases.push({ risk_level, concerns: [c] });
    for (const t of vocab.technologies.values.map((x) => x.value)) cases.push({ risk_level, technologies: [t] });
    cases.push({ risk_level, stack: "Python/FastAPI" });
    cases.push({ risk_level, stack: "docker e kubernetes" });
    cases.push({ risk_level, changed_files: ["src/auth/login.ts"] });
    cases.push({ risk_level, concerns: ["authz"] });               // gralha pura
    cases.push({ risk_level, concerns: ["authz", "auth"] });        // gralha + válido
  }
  return cases;
}

describe("invariante P1-A — selecção vazia NUNCA sem needs_input", () => {
  const cases = declarationMatrix();

  it(`nenhuma das ${cases.length} combinações declaráveis devolve zero em silêncio`, () => {
    const offenders: string[] = [];
    for (const input of cases) {
      const r: SelectionResult = runSelection(input as Parameters<typeof runSelection>[0]);
      const empty = r.selected.length === 0;
      if (empty && !r.needs_input) offenders.push(JSON.stringify(input));
      // e o inverso: quando há needs_input, não pode haver selecção
      if (r.needs_input && r.selected.length > 0) offenders.push(`needs_input COM selecção: ${JSON.stringify(input)}`);
    }
    expect(offenders, `zero silencioso em:\n${offenders.slice(0, 10).join("\n")}`).toEqual([]);
  });

  it("a guarda indexa-se à ACTIVAÇÃO, não à presença de campos (sonda do avaliador)", () => {
    const probe = runSelection({ risk_level: "L2", exposure: "local", data_sensitivity: "low" });
    expect(probe.selected).toHaveLength(0);
    expect(probe.needs_input, "declarações válidas mas inertes têm de pedir declaração").toBeDefined();
    expect(probe.needs_input!.inert_declarations).toEqual(['exposure="local"', 'data_sensitivity="low"']);
    // e o vocabulário publica-as como inertes — um conjunto fechado não omite valores
    expect(vocab.exposure.values.find((v) => v.value === "local")?.inert).toBe(true);
    expect(vocab.data_sensitivity.values.find((v) => v.value === "low")?.inert).toBe(true);
  });

  it("mode='baseline' continua a ser a saída explícita (não é fallback da invariante)", () => {
    const base = runSelection({ risk_level: "L2", exposure: "local", mode: "baseline" });
    expect(base.needs_input).toBeUndefined();
    expect(base.selected.length).toBeGreaterThan(100);
  });
});

describe("invariante transversal — nada acontece sem traço, nada falta sem aviso", () => {
  it("toda a activação produzida tem entrada no activation_trace", () => {
    const probes = [
      { risk_level: "L2", concerns: ["auth", "files"] },
      { risk_level: "L2", exposure: "public" },
      { risk_level: "L2", data_sensitivity: "personal" },
      { risk_level: "L2", technologies: ["containers", "kubernetes"] },
      { risk_level: "L1", concerns: ["auth"], technologies: ["jwt"] },
      { risk_level: "L2", concerns: ["auth"], stack: "docker e kubernetes" },
      { risk_level: "L2", changed_files: ["src/auth/login.ts"] }
    ] as const;
    const offenders: string[] = [];
    for (const p of probes) {
      const r = runSelection(p as Parameters<typeof runSelection>[0]);
      if (r.needs_input) continue;
      const traceSources = new Set(r.activation.trace.map((t) => t.source));
      const chapterSources = new Set(r.activated_chapters.map((c) => c.source));
      // cada canal que produziu activação tem de estar declarado nalgum rasto
      if (r.activated_categories.length > 0 && r.activation.trace.length === 0)
        offenders.push(`categorias sem trace: ${JSON.stringify(p)}`);
      if (chapterSources.has("stack") && !traceSources.has("stack_token"))
        offenders.push(`stack activou capítulos sem stack_token: ${JSON.stringify(p)}`);
      if (r.selected.some((x) => x.requirement_id === "SES-008") && (p as { technologies?: string[] }).technologies?.includes("jwt")) {
        if (!r.activation.trace.some((t) => t.source === "named_rule" && t.produced === "SES-008"))
          offenders.push(`regra nomeada SES-008 sem trace: ${JSON.stringify(p)}`);
      }
      // etiqueta órfã do motor lexical não pode aparecer no caminho declarativo
      if (traceSources.has("task_term")) offenders.push(`task_term no declarativo: ${JSON.stringify(p)}`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("toda a ausência é declarada: valor inválido, valor inerte, selecção vazia", () => {
    // (a) valor inválido → unknown_concerns com o conjunto válido
    const typo = handleSelectRequirements({ risk_level: "L2", concerns: ["authz", "auth"] });
    expect(typo.unknown_concerns?.values).toEqual(["authz"]);
    expect(typo.unknown_concerns?.valid_values.length).toBe(CONCERNS.length);
    expect(typo.unknown_concerns?.vocabulary_resource).toBe("sbd://toe/activation-vocabulary");
    // (b) valor inerte → needs_input nomeando-o
    const inert = handleSelectRequirements({ risk_level: "L2", exposure: "local" });
    expect(inert.needs_input?.inert_declarations).toContain('exposure="local"');
    // (c) exclusões continuam declaradas (narrowed_out/excluded_by_level nunca em silêncio)
    const sel = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"] });
    expect(sel.selection.narrowed_out.every((g) => typeof g.reason === "string" && g.reason.length > 0)).toBe(true);
    expect(sel.coverage.narrowed_out_requirements).toBeGreaterThan(0);
  });

  it("P1-C — o enum servido nas três tools é o vocabulário (uma fonte, um contrato)", async () => {
    const { default: fs } = await import("node:fs");
    const src = fs.readFileSync("src/index.ts", "utf8");
    // as três declarações usam a constante gerada, não listas escritas à mão
    const generated = src.match(/enum: DECLARED_CONCERNS/g) ?? [];
    expect(generated.length, "há schemas de concerns com enum escrito à mão").toBeGreaterThanOrEqual(3);
    expect(src).toContain("const DECLARED_CONCERNS: string[] = buildActivationVocabulary()");
  });
});
