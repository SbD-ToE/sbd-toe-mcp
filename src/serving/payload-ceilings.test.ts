/**
 * 0.21 §5 + decisão do lead (a) 2026-09-25 — tectos HONESTOS sobre os envelopes herdados.
 *
 * lista 52 · standard 55 · full sem tecto = a fórmula sobre as constantes MEDIDAS da forma
 * servida completa. CEILING_FIT declara a coerência (fits=true); se a medição mudar e o
 * ligado deixar de coincidir com a derivação, este teste diz que há decisão a pedir —
 * nunca «arranja» o número.
 */
import { describe, it, expect } from "vitest";
import { REQUIREMENT_CEILING_BY_DETAIL, COST_PER_REQ_TK, BASE_TK, PAYLOAD_PROMISE_TK, CEILING_FIT, PROPOSED_CEILING_BY_DETAIL, projectedCostTk } from "./payload-ceilings.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

const EVALUATOR_CASE = { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" };

describe("payload-ceilings — tectos ratificados e ajuste declarado (0.21 §5)", () => {
  it("os tectos são os decididos (a): lista 52 · standard 55 · full sem tecto; envelopes herdados 8.450/9.200", () => {
    expect(REQUIREMENT_CEILING_BY_DETAIL).toEqual({ lista: 52, standard: 55 });
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

  it("decisão (a): o ligado É a derivação (fórmula sobre as constantes medidas) e cabe no envelope — fits=true", () => {
    expect(PROPOSED_CEILING_BY_DETAIL).toEqual({ lista: 52, standard: 55 });
    for (const detail of Object.keys(PROPOSED_CEILING_BY_DETAIL)) {
      expect(REQUIREMENT_CEILING_BY_DETAIL[detail]).toBe(PROPOSED_CEILING_BY_DETAIL[detail]);
      expect(CEILING_FIT[detail]!.fits).toBe(true);
      expect(CEILING_FIT[detail]!.measured_ceiling_for_envelope).toBe(REQUIREMENT_CEILING_BY_DETAIL[detail]);
      expect(CEILING_FIT[detail]!.projected_tk_at_ceiling).toBeLessThanOrEqual(PAYLOAD_PROMISE_TK[detail]!);
    }
  });

  it("a forma servida é a medida: o custo real por requisito da forma fundida está dentro de ±15% do declive declarado", () => {
    const a = handlePrepareCodegenContext({ task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"], detail: "lista" } as never) as { activated_scope: { requirements: unknown[] }; size_estimate: { approx_tokens: number } };
    // 0.21 (a): o caso de 53 bloqueia (tecto 52) — o ponto alto passa a ser o de 42 (auth+validation/L2).
    const b = handlePrepareCodegenContext({ task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", concerns: ["auth", "validation"], detail: "lista" } as never) as { activated_scope: { requirements: unknown[] }; size_estimate: { approx_tokens: number } };
    const slope = (b.size_estimate.approx_tokens - a.size_estimate.approx_tokens) / (b.activated_scope.requirements.length - a.activated_scope.requirements.length);
    expect(Math.abs(slope - COST_PER_REQ_TK["lista"]!) / COST_PER_REQ_TK["lista"]!).toBeLessThan(0.15);
  });

  it("caso do avaliador (89 reqs) bloqueia DECLARADO em lista e standard (tecto decidido), com lotes que somam o todo; full fica pronto e declara o preço", () => {
    for (const detail of ["lista", "standard"]) {
      const r = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail } as never) as { status: string; requirement_ceiling?: { limit: number; selected: number; projected_tk: number; promise_tk: number; batches: { concerns: string[]; estimated_requirements: number }[] }; suggestions?: string[] };
      expect(r.status, detail).toBe("needs_decomposition");
      const rc = r.requirement_ceiling!;
      expect(rc.limit).toBe(REQUIREMENT_CEILING_BY_DETAIL[detail]);
      expect(rc.selected).toBeGreaterThan(rc.limit);
      expect(rc.projected_tk).toBeGreaterThan(rc.promise_tk);
      expect(rc.batches.length).toBeGreaterThan(0);
      expect(r.suggestions?.some((s) => /SOMAM O TODO/.test(s))).toBe(true);
      expect((r.requirement_ceiling as unknown as { union: { recall: number } }).union.recall).toBe(1);
    }
    const full = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail: "full" } as never) as { status: string; size_estimate?: { approx_tokens: number; envelope_tk?: number } };
    expect(full.status).toBe("ready_for_codegen");
    expect(full.size_estimate?.approx_tokens).toBeGreaterThan(0);
    expect(full.size_estimate?.envelope_tk).toBeUndefined(); // full não tem envelope: declara, não recusa
  });

  it("dentro do tecto (42 @ lista) o payload sai pronto e DIZ se coube no envelope (nunca em silêncio); 53 @ lista bloqueia declarado (tecto 52)", () => {
    const blocked = handlePrepareCodegenContext({ task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"], detail: "lista" } as never) as { status: string; requirement_ceiling?: { limit: number; selected: number } };
    expect(blocked.status).toBe("needs_decomposition");
    expect(blocked.requirement_ceiling).toMatchObject({ limit: 52, selected: 53 });
    const r = handlePrepareCodegenContext({ task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", concerns: ["auth", "validation"], detail: "lista" } as never) as { status: string; size_estimate: { approx_tokens: number; envelope_tk?: number; within_envelope?: boolean; note?: string } };
    expect(r.status).toBe("ready_for_codegen");
    const se = r.size_estimate;
    expect(se.envelope_tk).toBe(PAYLOAD_PROMISE_TK["lista"]);
    expect(se.within_envelope).toBe(se.approx_tokens <= se.envelope_tk!);
    if (!se.within_envelope) expect(se.note).toMatch(/envelope/);
    else expect(se.note).toBeUndefined();
  });
});
