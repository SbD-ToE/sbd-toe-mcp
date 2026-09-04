/** 0.19.4 — coerência do tecto por-id com a promessa de cada nível (medição). */
import { describe, it, expect } from "vitest";
import { REQUIREMENT_CEILING_BY_DETAIL, COST_PER_REQ_TK, BASE_TK, PAYLOAD_PROMISE_TK, projectedCostTk } from "./payload-ceilings.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

const EVALUATOR_CASE = { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" };

describe("payload-ceilings — a promessa do minimal (0.19.4)", () => {
  it("tecto×custo cabe na promessa de cada nível dieted (derivação declarada)", () => {
    for (const [detail, limit] of Object.entries(REQUIREMENT_CEILING_BY_DETAIL)) {
      expect(BASE_TK[detail]! + limit * COST_PER_REQ_TK[detail]!).toBeLessThanOrEqual(PAYLOAD_PROMISE_TK[detail]!);
      expect(BASE_TK[detail]! + (limit + 1) * COST_PER_REQ_TK[detail]!).toBeGreaterThan(PAYLOAD_PROMISE_TK[detail]! - COST_PER_REQ_TK[detail]!);
      expect(projectedCostTk(detail, limit)).toBe(BASE_TK[detail]! + limit * COST_PER_REQ_TK[detail]!);
    }
    expect(REQUIREMENT_CEILING_BY_DETAIL["full"]).toBeUndefined();
  });
  it("caso do avaliador (88 reqs) bloqueia DECLARADO em todos os dieted, com lotes; full fica pronto", () => {
    for (const detail of ["ultrathin", "minimal", "standard"]) {
      const r = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail } as never) as { status: string; requirement_ceiling?: { limit: number; selected: number; projected_tk: number; promise_tk: number; batches: { concerns: string[]; estimated_requirements: number }[] }; suggestions?: string[] };
      expect(r.status, detail).toBe("needs_decomposition");
      const rc = r.requirement_ceiling!;
      expect(rc.selected).toBeGreaterThan(rc.limit);
      expect(rc.projected_tk).toBeGreaterThan(rc.promise_tk);
      expect(rc.batches.length).toBeGreaterThan(0);
      expect(r.suggestions?.some((s) => s.includes("Divide por área"))).toBe(true);
    }
    const full = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail: "full" } as never) as { status: string };
    expect(full.status).toBe("ready_for_codegen");
  });
  it("selecção dentro do tecto continua pronta (53 @ minimal)", () => {
    const r = handlePrepareCodegenContext({ task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"], detail: "minimal" } as never) as { status: string };
    expect(r.status).toBe("ready_for_codegen");
  });
});
