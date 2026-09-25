/**
 * 0.21 §5 — tectos RATIFICADOS (lead 2026-09-25) + o ajuste DECLARADO.
 *
 * O tecto por-id de cada nível com envelope é o ratificado (lista 83, standard
 * 88; full sem tecto). A base e o custo por requisito são a MEDIÇÃO da forma
 * servida nesta fase. Quando tecto×custo+base não cabe no envelope, isso não se
 * esconde: CEILING_FIT declara-o e cada payload di-lo em size_estimate. Este
 * teste prova a COERÊNCIA entre as três coisas — nunca «arranja» o número.
 */
import { describe, it, expect } from "vitest";
import { REQUIREMENT_CEILING_BY_DETAIL, COST_PER_REQ_TK, BASE_TK, PAYLOAD_PROMISE_TK, CEILING_FIT, projectedCostTk } from "./payload-ceilings.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

const EVALUATOR_CASE = { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" };

describe("payload-ceilings — tectos ratificados e ajuste declarado (0.21 §5)", () => {
  it("os tectos são os ratificados: lista 83 · standard 88 · full sem tecto; envelopes herdados 8.450/9.200", () => {
    expect(REQUIREMENT_CEILING_BY_DETAIL).toEqual({ lista: 83, standard: 88 });
    expect(PAYLOAD_PROMISE_TK).toEqual({ lista: 8450, standard: 9200 });
    expect(REQUIREMENT_CEILING_BY_DETAIL["full"]).toBeUndefined();
    expect(PAYLOAD_PROMISE_TK["full"]).toBeUndefined();
    for (const retired of ["ultrathin", "minimal"]) {
      expect(REQUIREMENT_CEILING_BY_DETAIL[retired]).toBeUndefined();
      expect(PAYLOAD_PROMISE_TK[retired]).toBeUndefined();
    }
  });

  it("CEILING_FIT é aritmeticamente coerente com as constantes (nunca declara um ajuste que os números não sustentam)", () => {
    for (const [detail, limit] of Object.entries(REQUIREMENT_CEILING_BY_DETAIL)) {
      const fit = CEILING_FIT[detail]!;
      const projected = Math.round(BASE_TK[detail]! + limit * COST_PER_REQ_TK[detail]!);
      expect(fit.ceiling).toBe(limit);
      expect(fit.envelope_tk).toBe(PAYLOAD_PROMISE_TK[detail]);
      expect(fit.projected_tk_at_ceiling).toBe(projected);
      expect(projectedCostTk(detail, limit)).toBe(projected);
      expect(fit.fits).toBe(projected <= PAYLOAD_PROMISE_TK[detail]!);
      expect(fit.measured_ceiling_for_envelope).toBe(Math.floor((PAYLOAD_PROMISE_TK[detail]! - BASE_TK[detail]!) / COST_PER_REQ_TK[detail]!));
    }
  });

  it("a forma servida é a medida: o custo real por requisito da forma fundida está dentro de ±15% do declive declarado", () => {
    const a = handlePrepareCodegenContext({ task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"], detail: "lista" } as never) as { activated_scope: { requirements: unknown[] }; size_estimate: { approx_tokens: number } };
    const b = handlePrepareCodegenContext({ task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"], detail: "lista" } as never) as { activated_scope: { requirements: unknown[] }; size_estimate: { approx_tokens: number } };
    const slope = (b.size_estimate.approx_tokens - a.size_estimate.approx_tokens) / (b.activated_scope.requirements.length - a.activated_scope.requirements.length);
    expect(Math.abs(slope - COST_PER_REQ_TK["lista"]!) / COST_PER_REQ_TK["lista"]!).toBeLessThan(0.15);
  });

  it("caso do avaliador (89 reqs) bloqueia DECLARADO em lista e standard (tecto ratificado), com lotes; full fica pronto e declara o preço", () => {
    for (const detail of ["lista", "standard"]) {
      const r = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail } as never) as { status: string; requirement_ceiling?: { limit: number; selected: number; projected_tk: number; promise_tk: number; batches: { concerns: string[]; estimated_requirements: number }[] }; suggestions?: string[] };
      expect(r.status, detail).toBe("needs_decomposition");
      const rc = r.requirement_ceiling!;
      expect(rc.limit).toBe(REQUIREMENT_CEILING_BY_DETAIL[detail]);
      expect(rc.selected).toBeGreaterThan(rc.limit);
      expect(rc.projected_tk).toBeGreaterThan(rc.promise_tk);
      expect(rc.batches.length).toBeGreaterThan(0);
      expect(r.suggestions?.some((s) => s.includes("Divide por área"))).toBe(true);
    }
    const full = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail: "full" } as never) as { status: string; size_estimate?: { approx_tokens: number; envelope_tk?: number } };
    expect(full.status).toBe("ready_for_codegen");
    expect(full.size_estimate?.approx_tokens).toBeGreaterThan(0);
    expect(full.size_estimate?.envelope_tk).toBeUndefined(); // full não tem envelope: declara, não recusa
  });

  it("dentro do tecto o payload sai pronto e DIZ se coube no envelope (nunca em silêncio)", () => {
    const r = handlePrepareCodegenContext({ task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"], detail: "lista" } as never) as { status: string; size_estimate: { approx_tokens: number; envelope_tk?: number; within_envelope?: boolean; note?: string } };
    expect(r.status).toBe("ready_for_codegen");
    const se = r.size_estimate;
    expect(se.envelope_tk).toBe(PAYLOAD_PROMISE_TK["lista"]);
    expect(se.within_envelope).toBe(se.approx_tokens <= se.envelope_tk!);
    if (!se.within_envelope) expect(se.note).toMatch(/envelope/);
    else expect(se.note).toBeUndefined();
  });
});
