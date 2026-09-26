/**
 * 0.21.2 (decisão 0006, opção A; lead 2026-09-26) — os activadores LARGOS trazem contexto, e o contexto vem SÓ do dado.
 *
 * exposure / data_sensitivity → requisitos que seleccionam sozinhos → controlos (requirement_control_links) →
 * objectivos (ctrl_acore_alignment, exact/partial) → famílias. As tabelas exposure/data_sensitivity → concerns
 * ficam só para a selecção; a tabela concern → família não decide as fatias dos activadores largos.
 */
import { describe, expect, it } from "vitest";
import { handlePrepareCodegenContext, sliceFamiliesForBroadActivator, EXPOSURE_CONCERNS, SENSITIVITY_CONCERNS, __wp5Lexicon } from "./prepare-codegen-context.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";
import { sliceFamiliesByDataChain, witnessHolds } from "../serving/context-slice-chain.js";
import { handleSelectRequirements } from "./select-requirements.js";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const LEVELS = ["L1", "L2", "L3"] as const;
const BROAD: Array<Record<string, string>> = [
  ...["internal", "authenticated", "public"].map((exposure) => ({ exposure })),
  ...["personal", "regulated", "secrets"].map((data_sensitivity) => ({ data_sensitivity }))
];
const chainFamilies = (p: Any) => (p.activation_trace as Any[]).filter((t) => t.source === "context_slice_chain").map((t) => t.produced as string).sort();
const slicesOf = (p: Any) => new Set(((p.activated_scope?.slices ?? []) as Any[]).map((s) => s.slice_id as string));

describe("0.21.2 decisão 0006 — exposure/data_sensitivity trazem contexto, derivado só do dado", () => {
  it("propriedade: todo o valor não inerte, em L1–L3, traz fatias em full — as que o vocabulário publica, cada uma com uma cadeia que existe no dado", { timeout: 120_000 }, () => {
    const vocab = buildActivationVocabulary() as Any;
    for (const risk_level of LEVELS) {
      for (const decl of BROAD) {
        const full = handlePrepareCodegenContext({ task: "x", risk_level, ...decl, detail: "full" } as never) as Any;
        const at = `${JSON.stringify(decl)}@${risk_level}`;
        expect(full.status, at).toBe("ready_for_codegen");
        expect(slicesOf(full).size, at).toBeGreaterThan(0);
        expect(full.manual_grounding.length, at).toBeGreaterThan(0);
        const [field, value] = Object.entries(decl)[0]!;
        const published = (vocab[field].values as Any[]).find((v) => v.value === value).activates_slice_families[risk_level];
        expect(chainFamilies(full), at).toEqual(published);
        expect(sliceFamiliesForBroadActivator(risk_level, decl as never), at).toEqual(published);
        for (const f of published) expect(full.activated_scope.slices.some((s: Any) => s.objective_family === f), `${at} ${f}`).toBe(true);
      }
    }
  });

  it("cada família da cadeia tem testemunha verificável no dado publicado (requisito → controlo → objectivo)", () => {
    const sel = handleSelectRequirements({ risk_level: "L3", exposure: "public", limit: 500 } as never) as unknown as Any;
    const ids = (sel.selection.selected as Any[]).map((r) => r.requirement_id as string);
    const chain = sliceFamiliesByDataChain(ids);
    expect(chain.size).toBeGreaterThan(0);
    for (const w of chain.values()) expect(witnessHolds(w)).toBe(true);
  });

  it("as tabelas saem do caminho das fatias: exposure=public dá as famílias da cadeia, não as da tabela concern → família", () => {
    const full = handlePrepareCodegenContext({ task: "x", risk_level: "L2", exposure: "public", detail: "full" } as never) as Any;
    const viaTable = [...new Set((EXPOSURE_CONCERNS["public"] ?? []).map((c) => __wp5Lexicon.CONCERN_TO_SLICE_FAMILY[c]).filter(Boolean))].sort();
    const served = [...new Set((full.activated_scope.slices as Any[]).map((s) => s.objective_family as string))].sort();
    expect(served).toEqual(sliceFamiliesForBroadActivator("L2", { exposure: "public" }));
    expect(served).not.toEqual(viaTable);
    expect((full.activation_trace as Any[]).some((t) => t.source === "concern_slice_mapping" && (EXPOSURE_CONCERNS["public"] ?? []).includes(t.produced))).toBe(false);
    void SENSITIVITY_CONCERNS;
  });

  it("a selecção de requisitos não muda: prepare e select servem os mesmos ids para declarações com activadores largos", { timeout: 120_000 }, () => {
    for (const risk_level of LEVELS) {
      for (const decl of [...BROAD, { exposure: "public", data_sensitivity: "personal" }]) {
        const full = handlePrepareCodegenContext({ task: "x", risk_level, ...decl, detail: "full" } as never) as Any;
        const sel = handleSelectRequirements({ risk_level, ...decl, limit: 500 } as never) as unknown as Any;
        expect((full.activated_scope.requirements as Any[]).map((q) => q.id).sort(), `${JSON.stringify(decl)}@${risk_level}`).toEqual(
          (sel.selection.selected as Any[]).map((r) => r.requirement_id).sort()
        );
      }
    }
  });

  it("valores inertes (local, low) não trazem fatias nem tabela: needs_input, como antes", () => {
    for (const decl of [{ exposure: "local" }, { data_sensitivity: "low" }]) {
      const r = handlePrepareCodegenContext({ task: "x", risk_level: "L2", ...decl, detail: "lista" } as never) as Any;
      expect(r.status).toBe("needs_input");
    }
  });

  it("lotes (0005): o caso do avaliador decompõe e a união dos lotes devolve EXACTAMENTE as fatias do pedido — nem menos, nem mais", { timeout: 120_000 }, () => {
    const task = "Expor API pública de consulta com chaves de cliente e rate limiting";
    const ev = { task, risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" } as const;
    const full = handlePrepareCodegenContext({ ...ev, detail: "full" } as never) as Any;
    const want = slicesOf(full);
    expect(want.size).toBeGreaterThan(0);
    for (const detail of ["lista", "standard"] as const) {
      const r = handlePrepareCodegenContext({ ...ev, detail } as never) as Any;
      expect(r.status).toBe("needs_decomposition");
      const got = new Set<string>();
      for (const b of r.requirement_ceiling.batches) {
        const x = handlePrepareCodegenContext({ task, risk_level: "L3", detail, ...b.with } as never) as Any;
        expect(x.status).toBe("ready_for_codegen");
        expect(x.size_estimate.approx_tokens).toBe(b.measured_tk);
        for (const s of slicesOf(x)) got.add(s);
      }
      expect([...got].sort(), detail).toEqual([...want].sort());
    }
  });
});
