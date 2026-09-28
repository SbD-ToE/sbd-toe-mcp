/**
 * 0.21.1 — O OVERLAY REGULATÓRIO RESTRINGE-SE AO QUE A CHAMADA ACTIVOU.
 *
 * Defeito medido (0.19.4, 0.20.0 e 0.21.0): com `include_regulatory_overlay`, o prepare servia TODOS os
 * mapeamentos das obrigações para todo o Manual — RGPD 1 693 mapeamentos, `lista` ≈123k tokens para 36
 * requisitos. Estes testes guardam a correcção e a disciplina:
 *   - só se servem mapeamentos com alvo no âmbito activado (requisito, controlo, EP de requisito
 *     activado, capítulo de requisito activado);
 *   - EP espelho de um mapeamento de requisito servido é elidido como derivável — e a regra é VERDADE;
 *   - as contas fecham (served + derivable_elided + out_of_scope = total) e o total bate com a
 *     referência executada (nada silencioso);
 *   - as obrigações e o conjunto citável NÃO mudam (invariante 3);
 *   - acima do envelope, o payload continua a dizê-lo (within_envelope:false + note_id).
 *
 * 0.21.2 (decisão 0004): em lista/standard, acima do envelope a resposta é needs_decomposition com
 * lotes MEDIDOS que preservam o overlay; a restrição do overlay prova-se então em cada lote executado.
 */
import { describe, expect, it } from "vitest";
import { citableIds, handlePrepareCodegenContext, type PrepareCodegenContextResultReadyFull } from "./prepare-codegen-context.js";
import { handleResolveEntities } from "./resolve-entities.js";
import { getOntologyData } from "./ontology-loader.js";
import { NOTES } from "../serving/notes.js";
import { getRegulatoryOverlay } from "./regulatory-overlay-loader.js";

const FRAMEWORKS = ["RGPD", "DORA", "NIS2", "CRA", "AI-ACT"] as const;
const BASE = { task: "Implementar endpoint POST /login com lockout", risk_level: "L2" as const, mode: "codegen" as const, concerns: ["auth", "logging"] };

function run(fw: string, detail: "lista" | "standard" | "full" = "full"): PrepareCodegenContextResultReadyFull {
  const r = handlePrepareCodegenContext({ ...BASE, detail, regulatory_frameworks: [fw], include_regulatory_overlay: true });
  expect(r.status).toBe("ready_for_codegen");
  return r as PrepareCodegenContextResultReadyFull;
}

type DietedOrBlocked = {
  status: string;
  regulatory_overlay?: { mappings: unknown[]; mappings_scope: { served: number } };
  size_estimate?: { approx_tokens: number; envelope_tk: number; within_envelope: boolean; note_id?: string; irreducible_note_id?: string };
  requirement_ceiling?: { basis: string; projected_tk: number; promise_tk: number; union: { recall: number }; batches: Array<{ with: Record<string, unknown>; measured_tk: number; irreducible: boolean }> };
};

/** Pronto: o próprio payload. Decomposto: cada lote EXECUTADO (a receita tal e qual). */
function servedPayloads(fw: string, detail: "lista" | "standard"): DietedOrBlocked[] {
  const r = handlePrepareCodegenContext({ ...BASE, detail, regulatory_frameworks: [fw], include_regulatory_overlay: true }) as DietedOrBlocked;
  if (r.status === "ready_for_codegen") return [r];
  expect(r.status).toBe("needs_decomposition");
  expect(r.requirement_ceiling!.basis).toBe("measured_payload");
  expect(r.requirement_ceiling!.union.recall).toBe(1);
  return r.requirement_ceiling!.batches.map((b) => {
    expect(b.with.regulatory_frameworks).toEqual([fw]);
    expect(b.with.include_regulatory_overlay).toBe(true);
    const x = handlePrepareCodegenContext({ task: BASE.task, risk_level: BASE.risk_level, detail, ...b.with } as never) as DietedOrBlocked;
    expect(x.status).toBe("ready_for_codegen");
    expect(x.size_estimate!.approx_tokens).toBe(b.measured_tk);
    return x;
  });
}

describe("0.21.1 — overlay restrito ao âmbito activado", () => {
  it.each(FRAMEWORKS)("%s: só se servem mapeamentos com alvo no âmbito; as contas fecham e batem com a referência executada", (fw) => {
    const r = run(fw);
    const ov = r.regulatory_overlay;
    const s = ov.mappings_scope!;
    expect(s).toBeDefined();
    const reqIds = new Set(r.activated_scope.requirements.map((q) => q.id));
    const ctrlIds = new Set(r.activated_scope.controls.map((c) => c.control_id));
    const ont = getOntologyData();
    const epOfActive = new Set((ont.evidencePatterns ?? []).filter((e) => e.maps_to_requirement_id && reqIds.has(e.maps_to_requirement_id)).map((e) => e.id));
    const bundles = new Set(ont.requirements.filter((q) => reqIds.has(q.requirement_id)).map((q) => q.source_bundle));
    for (const m of ov.mappings) {
      const ok =
        (m.target_type === "Requirement" && reqIds.has(m.target_id)) ||
        (m.target_type === "Control" && ctrlIds.has(m.target_id)) ||
        (m.target_type === "EvidencePattern" && epOfActive.has(m.target_id)) ||
        (m.target_type === "KnowledgeBundle" && bundles.has(m.target_id));
      expect(ok, `${m.mapping_id} → ${m.target_type} ${m.target_id} fora do âmbito`).toBe(true);
    }
    expect(s.served).toBe(ov.mappings.length);
    expect(s.served + s.derivable_elided + s.out_of_scope).toBe(s.total);
    for (const b of Object.values(s.by_target_type)) expect(b.served + b.derivable_elided + b.out_of_scope).toBe(b.total);
    // a referência executa-se e devolve o universo inteiro
    const obl = ov.obligations.map((o) => o.obligation_id);
    expect(s.rest_ref.with).toContain(JSON.stringify(obl));
    const ref = handleResolveEntities({ record_type: "regulatory_mapping", filters: { obligation_id: { in: obl } }, limit: 5 });
    expect(ref.unknown_filter_fields ?? []).toEqual([]);
    expect(ref.total).toBe(s.total);
    expect(NOTES[s.rest_ref.note_id]).toMatch(/SCOPED/);
    // o defeito não volta: menos de 10% dos mapeamentos inline
    expect(s.served / s.total).toBeLessThan(0.1);
  });

  it.each(FRAMEWORKS)("%s: a elisão de EP é VERDADE — cada EP elidido espelha um mapeamento de requisito servido", (fw) => {
    const r = run(fw);
    const s = r.regulatory_overlay.mappings_scope!;
    const obl = r.regulatory_overlay.obligations.map((o) => o.obligation_id);
    // recálculo independente sobre os dados PUBLICADOS do overlay (o resolve pagina, não serve para isto)
    const data = getRegulatoryOverlay();
    const all = obl.flatMap((o) => data.mappingsByObligation.get(o) ?? []) as Array<{ obligation_id: string; target_type: string; target_id: string }>;
    expect(all.length).toBe(s.total);
    const served = new Set(r.regulatory_overlay.mappings.filter((m) => m.target_type === "Requirement").map((m) => `${m.obligation_id}|${m.target_id}`));
    const ont = getOntologyData();
    const epToReq = new Map((ont.evidencePatterns ?? []).map((e) => [e.id, e.maps_to_requirement_id]));
    const reqIds = new Set(r.activated_scope.requirements.map((q) => q.id));
    const elided = all.filter((m) => m.target_type === "EvidencePattern" && reqIds.has(String(epToReq.get(m.target_id))) && !r.regulatory_overlay.mappings.some((x) => x.obligation_id === m.obligation_id && x.target_id === m.target_id));
    expect(elided.length).toBe(s.derivable_elided);
    for (const m of elided) expect(served.has(`${m.obligation_id}|${epToReq.get(m.target_id)}`), `${m.target_id} sem espelho`).toBe(true);
  });

  it.each(FRAMEWORKS)("%s: obrigações e conjunto citável inalterados (invariante 3); em todos os níveis o overlay vem restrito", (fw) => {
    const full = run(fw, "full");
    expect(full.activated_scope.regulatory_obligations.length).toBe(full.regulatory_overlay.obligations.length);
    for (const detail of ["lista", "standard"] as const) {
      const lista = handlePrepareCodegenContext({ ...BASE, detail, regulatory_frameworks: [fw], include_regulatory_overlay: true });
      if (lista.status === "ready_for_codegen") expect([...new Set(citableIds(lista))].sort()).toEqual([...new Set(citableIds(full))].sort());
      for (const p of servedPayloads(fw, detail)) {
        expect(p.regulatory_overlay!.mappings.length).toBe(p.regulatory_overlay!.mappings_scope.served);
        expect(p.size_estimate!.within_envelope || p.size_estimate!.irreducible_note_id !== undefined).toBe(true);
      }
    }
  });

  it("RGPD @ lista: o payload desce uma ordem de grandeza; acima do envelope, lotes medidos que cabem (0.21.2)", () => {
    const r = handlePrepareCodegenContext({ ...BASE, detail: "lista", regulatory_frameworks: ["RGPD"], include_regulatory_overlay: true }) as DietedOrBlocked;
    const measured = r.status === "ready_for_codegen" ? r.size_estimate!.approx_tokens : r.requirement_ceiling!.projected_tk;
    expect(measured).toBeLessThan(20000); // era ≈123 000
    if (r.status === "ready_for_codegen") {
      expect(r.size_estimate!.within_envelope || r.size_estimate!.irreducible_note_id !== undefined).toBe(true);
    } else {
      expect(r.requirement_ceiling!.projected_tk).toBeGreaterThan(r.requirement_ceiling!.promise_tk);
      for (const p of servedPayloads("RGPD", "lista")) expect(p.size_estimate!.within_envelope).toBe(true);
    }
  });

  it("sem obrigações (ENISA-CSA) ou sem overlay: nada muda — sem mappings_scope", () => {
    const e = run("ENISA-CSA");
    expect(e.regulatory_overlay.mappings_scope).toBeUndefined();
    const plain = handlePrepareCodegenContext({ ...BASE }) as PrepareCodegenContextResultReadyFull;
    expect(plain.regulatory_overlay.mappings_scope).toBeUndefined();
    expect(plain.regulatory_overlay.mappings).toEqual([]);
  });
});
