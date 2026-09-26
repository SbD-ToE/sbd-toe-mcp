/**
 * 0.21.2 (decisão 0004, lead 2026-09-26) — o ENVELOPE é a regra.
 *
 * lista 8.450 · standard 9.200 · full sem envelope. Em lista/standard uma resposta pronta cabe
 * no envelope, medida sobre o payload que o cliente recebe; acima, needs_decomposition com lotes
 * medidos que somam o todo; a única excepção é o lote irredutível (uma categoria), servido pronto
 * e declarado. Os tectos por contagem (52/55) e a recta que os derivava retiraram-se.
 */
import { describe, it, expect } from "vitest";
import * as ceilings from "./payload-ceilings.js";
import { PAYLOAD_PROMISE_TK } from "./payload-ceilings.js";
import { handlePrepareCodegenContext, estimatePrepareCostTk, VALID_CONCERNS } from "../tools/prepare-codegen-context.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";

const EVALUATOR_CASE = { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" };

type Ready = { status: string; activated_scope: { requirements: unknown[] }; size_estimate: { approx_tokens: number; envelope_tk?: number; within_envelope?: boolean; note_id?: string; irreducible_note_id?: string } };
type Blocked = { status: string; suggestions?: string[]; requirement_ceiling?: { basis: string; selected: number; projected_tk: number; promise_tk: number; batches: Array<{ measured_tk: number; irreducible: boolean }>; union: { recall: number } } };

describe("payload-ceilings — o envelope é a regra (0.21.2, decisão 0004)", () => {
  it("envelopes herdados 8.450/9.200; full sem envelope; os tectos por contagem e a recta retiraram-se", () => {
    expect(PAYLOAD_PROMISE_TK).toEqual({ lista: 8450, standard: 9200 });
    expect(PAYLOAD_PROMISE_TK["full"]).toBeUndefined();
    for (const retired of ["ultrathin", "minimal"]) expect(PAYLOAD_PROMISE_TK[retired]).toBeUndefined();
    expect(Object.keys(ceilings).sort()).toEqual(["PAYLOAD_PROMISE_TK"]);
  });

  it("caso do avaliador bloqueia por CUSTO MEDIDO em lista e standard, com lotes medidos que cabem e somam o todo; full fica pronto e declara o preço", () => {
    for (const detail of ["lista", "standard"] as const) {
      const r = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail } as never) as Blocked;
      expect(r.status, detail).toBe("needs_decomposition");
      const rc = r.requirement_ceiling!;
      expect(rc.basis).toBe("measured_payload");
      expect(rc.promise_tk).toBe(PAYLOAD_PROMISE_TK[detail]);
      expect(rc.projected_tk).toBeGreaterThan(rc.promise_tk);
      expect(rc.batches.length).toBeGreaterThan(0);
      for (const b of rc.batches) if (!b.irreducible) expect(b.measured_tk).toBeLessThanOrEqual(rc.promise_tk);
      expect(r.suggestions?.some((s) => /SOMAM O TODO/.test(s))).toBe(true);
      expect(rc.union.recall).toBe(1);
    }
    const full = handlePrepareCodegenContext({ ...EVALUATOR_CASE, detail: "full" } as never) as Ready;
    expect(full.status).toBe("ready_for_codegen");
    expect(full.size_estimate.approx_tokens).toBeGreaterThan(0);
    expect(full.size_estimate.envelope_tk).toBeUndefined(); // full não tem envelope: declara, não recusa
  });

  it("a contagem deixou de decidir: 53 requisitos baratos (auth+validation+logging / L3) cabem e saem prontos em lista — bloqueavam com o tecto 52", () => {
    const r = handlePrepareCodegenContext({ task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"], detail: "lista" } as never) as Ready;
    expect(r.status).toBe("ready_for_codegen");
    expect(r.activated_scope.requirements.length).toBe(53);
    expect(r.size_estimate.within_envelope).toBe(true);
    expect(r.size_estimate.approx_tokens).toBeLessThanOrEqual(PAYLOAD_PROMISE_TK["lista"]!);
  });

  it("propriedade (decisão 0004 §6.1): toda a resposta pronta em lista/standard cabe no envelope, salvo lote irredutível declarado — cada concern isolado em L2 e L3", { timeout: 300_000 }, () => {
    for (const concern of [...VALID_CONCERNS].sort()) {
      for (const risk_level of ["L2", "L3"] as const) {
        for (const detail of ["lista", "standard"] as const) {
          const r = handlePrepareCodegenContext({ task: "x", risk_level, concerns: [concern], detail } as never) as Ready & Blocked;
          const at = `${concern}/${risk_level}@${detail}`;
          if (r.status === "ready_for_codegen") {
            expect(r.size_estimate.within_envelope || r.size_estimate.irreducible_note_id !== undefined, at).toBe(true);
          } else if (r.status === "needs_decomposition") {
            expect(r.requirement_ceiling!.basis, at).toBe("measured_payload");
            expect(r.requirement_ceiling!.union.recall, at).toBe(1);
          }
        }
      }
    }
  });

  it("a projecção do select (decisão 0004 §2): estimativa por médias de categoria, determinística, declarada ESTIMATIVA, nunca bloqueia", () => {
    const ids = (handlePrepareCodegenContext({ task: "x", risk_level: "L2", concerns: ["auth"], detail: "lista" } as never) as unknown as { activated_scope: { requirements: Array<{ id: string }> } }).activated_scope.requirements.map((q) => q.id);
    const a = estimatePrepareCostTk("lista", ids);
    expect(a).toBeGreaterThan(0);
    expect(estimatePrepareCostTk("lista", ids)).toBe(a);
    expect(estimatePrepareCostTk("lista", [])).toBe(0);
    const sel = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"] } as never) as unknown as { next?: Array<{ tool: string; intent: string }> };
    const prepareRow = sel.next?.find((n) => n.tool === "prepare_sbd_toe_codegen_context");
    if (prepareRow) {
      expect(prepareRow.intent).toMatch(/ESTIMATIVA/);
      expect(prepareRow.intent).not.toMatch(/tecto/);
    }
  });
});
