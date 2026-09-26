/**
 * 0.21.2 (decisão 0005, lead 2026-09-26) — CADA LOTE É O PEDIDO ORIGINAL RESTRITO ÀS SUAS CATEGORIAS.
 *
 * Os lotes levam as fatias que o pedido activava (`slice_families`, só contexto), além das technologies,
 * changed_files, overlay e mode que já levavam. A união dos lotes devolve o pedido inteiro — requisitos,
 * fatias e entidades AppSec Core. Uma decomposição tem sempre dois lotes ou mais.
 */
import { describe, expect, it } from "vitest";
import { handlePrepareCodegenContext, publishedSliceFamilies, VALID_CONCERNS, type PrepareCodegenContextInput } from "./prepare-codegen-context.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const G2 = ["control_objectives", "mechanisms", "practices", "artifacts"] as const;
const g2OfFull = (p: Any) => new Set(G2.flatMap((k) => ((p.g2_context?.[k] ?? []) as Any[]).map((e) => e.entity_id as string)));
const g2OfDieted = (p: Any) => new Set(G2.flatMap((k) => Object.values((p.g2_context?.[k] ?? {}) as Record<string, Record<string, unknown>>).flatMap((e) => Object.keys(e))));
const slicesOf = (p: Any) => new Set(((p.activated_scope?.slices ?? []) as Any[]).map((s) => (s.slice_id ?? s.id) as string));

/** Executa os lotes e compara a união com o `full` do pedido original. */
function proveBatches(input: PrepareCodegenContextInput, detail: "lista" | "standard") {
  const r = handlePrepareCodegenContext({ ...input, detail }) as Any;
  if (r.status !== "needs_decomposition") return null;
  const rc = r.requirement_ceiling;
  expect(rc.batches.length, "nunca um lote único").toBeGreaterThanOrEqual(2);
  const full = handlePrepareCodegenContext({ ...input, detail: "full" }) as Any;
  const want = { reqs: new Set((full.activated_scope.requirements as Any[]).map((q) => q.id as string)), g2: g2OfFull(full), slices: slicesOf(full) };
  const got = { reqs: new Set<string>(), g2: new Set<string>(), slices: new Set<string>() };
  for (const b of rc.batches) {
    const x = handlePrepareCodegenContext({ task: input.task, risk_level: input.risk_level, detail, ...b.with }) as Any;
    expect(x.status, JSON.stringify(b.with)).toBe("ready_for_codegen");
    expect(x.size_estimate.approx_tokens).toBe(b.measured_tk);
    expect(x.size_estimate.within_envelope || x.size_estimate.irreducible_note_id !== undefined).toBe(true);
    for (const q of x.activated_scope.requirements as Any[]) got.reqs.add(q.id);
    for (const i of g2OfDieted(x)) got.g2.add(i);
    for (const i of slicesOf(x)) got.slices.add(i);
  }
  for (const k of ["reqs", "g2", "slices"] as const) {
    const missing = [...want[k]].filter((i) => !got[k].has(i));
    expect(missing, `${k} em falta na união`).toEqual([]);
  }
  return rc;
}

describe("0.21.2 decisão 0005 — lotes com os activadores e o contexto do pedido original", () => {
  it("os casos nomeados: auth/L2 + RGPD deixa de ser lote único; o exemplo dos docs leva as fatias; a união devolve requisitos, fatias e G2", () => {
    const rgpd = proveBatches({ task: "x", risk_level: "L2", concerns: ["auth"], regulatory_frameworks: ["RGPD"], include_regulatory_overlay: true }, "lista")!;
    expect(rgpd).not.toBeNull();
    for (const b of rgpd.batches) expect(b.with.slice_families).toContain("ACO-IAT");
    const docs = proveBatches({ task: "x", risk_level: "L2", concerns: ["auth", "logging"], technologies: ["jwt"], exposure: "public" }, "lista")!;
    expect(docs.batches.flatMap((b: Any) => b.with.slice_families ?? [])).toEqual(expect.arrayContaining(["ACO-ATB", "ACO-IAT", "ACO-IVF", "ACO-SLG"]));
    for (const b of docs.batches) expect(b.with.technologies).toEqual(["jwt"]);
  });

  it("propriedade: cada concern isolado (L2, L3) e os trios em L3 — toda a decomposição tem ≥2 lotes e a união cobre o pedido inteiro", { timeout: 600_000 }, () => {
    const decls: PrepareCodegenContextInput[] = [];
    for (const risk_level of ["L2", "L3"] as const) for (const c of VALID_CONCERNS) decls.push({ task: "x", risk_level, concerns: [c] });
    const cs = [...VALID_CONCERNS];
    for (let i = 0; i < cs.length; i += 3) decls.push({ task: "x", risk_level: "L3", concerns: cs.slice(i, i + 3) });
    let decomposed = 0;
    for (const d of decls) for (const detail of ["lista", "standard"] as const) if (proveBatches(d, detail)) decomposed += 1;
    expect(decomposed).toBeGreaterThan(10);
  });

  it("slice_families NUNCA muda a selecção: mesmos requisitos com e sem, para cada família publicada", () => {
    const families = publishedSliceFamilies();
    expect(families.length).toBeGreaterThan(5);
    const base = handlePrepareCodegenContext({ task: "x", risk_level: "L2", concerns: ["auth", "logging"], detail: "full" }) as Any;
    const ids = JSON.stringify((base.activated_scope.requirements as Any[]).map((q) => q.id));
    for (const f of families) {
      const r = handlePrepareCodegenContext({ task: "x", risk_level: "L2", concerns: ["auth", "logging"], slice_families: [f], detail: "full" }) as Any;
      expect(r.status).toBe("ready_for_codegen");
      expect(JSON.stringify((r.activated_scope.requirements as Any[]).map((q) => q.id)), f).toBe(ids);
      expect(slicesOf(r).size).toBeGreaterThanOrEqual(slicesOf(base).size);
      expect((r.activation_trace as Any[]).some((t) => t.source === "declared_slice_family" && t.produced === f) || slicesOf(base).size > 0).toBe(true);
    }
  });

  it("slice_families sozinho não é declaração (needs_input, dito); valor fora do conjunto publicado → needs_input com valid_values", () => {
    const alone = handlePrepareCodegenContext({ task: "x", risk_level: "L2", slice_families: ["ACO-IAT"], detail: "lista" }) as Any;
    expect(alone.status).toBe("needs_input");
    expect(alone.needs_input.inert_declarations.join(" ")).toMatch(/só de contexto/);
    const unknown = handlePrepareCodegenContext({ task: "x", risk_level: "L2", concerns: ["auth"], slice_families: ["ACO-NOPE"], detail: "lista" }) as Any;
    expect(unknown.status).toBe("needs_input");
    expect(unknown.needs_input.inert_declarations.join(" ")).toMatch(/ACO-NOPE/);
    expect(unknown.needs_input.valid_values.slice_families).toEqual(publishedSliceFamilies());
  });

  it("vocabulário: slice_families publicado como activador SÓ DE CONTEXTO, derivado do bundle", () => {
    const v = buildActivationVocabulary() as Any;
    expect(v.slice_families.context_only).toBe(true);
    expect(v.slice_families.values.map((x: Any) => x.value)).toEqual(publishedSliceFamilies());
    for (const x of v.slice_families.values) expect(x.slices).toBeGreaterThan(0);
    expect(v.slice_families.values.find((x: Any) => x.value === "ACO-IAT").produced_by_concerns).toContain("auth");
    expect(v.slice_families.note).toMatch(/NUNCA selecciona requisitos/);
  });
});
