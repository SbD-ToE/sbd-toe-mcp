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
    const lista = run(fw, "lista");
    expect([...new Set(citableIds(lista))].sort()).toEqual([...new Set(citableIds(full))].sort());
    expect(full.activated_scope.regulatory_obligations.length).toBe(full.regulatory_overlay.obligations.length);
    const l = lista as unknown as { regulatory_overlay: { mappings: unknown[]; mappings_scope: { served: number } } };
    expect(l.regulatory_overlay.mappings.length).toBe(l.regulatory_overlay.mappings_scope.served);
  });

  it("RGPD @ lista: o payload desce uma ordem de grandeza e, se ainda passar o envelope, DI-LO", () => {
    const r = run("RGPD", "lista") as unknown as { size_estimate: { approx_tokens: number; envelope_tk: number; within_envelope: boolean; note_id?: string } };
    expect(r.size_estimate.approx_tokens).toBeLessThan(20000); // era ≈123 000
    expect(r.size_estimate.within_envelope).toBe(r.size_estimate.approx_tokens <= r.size_estimate.envelope_tk);
    if (!r.size_estimate.within_envelope) expect(r.size_estimate.note_id).toBe("prepare.size_estimate.envelope_exceeded");
  });

  it("sem obrigações (ENISA-CSA) ou sem overlay: nada muda — sem mappings_scope", () => {
    const e = run("ENISA-CSA");
    expect(e.regulatory_overlay.mappings_scope).toBeUndefined();
    const plain = handlePrepareCodegenContext({ ...BASE }) as PrepareCodegenContextResultReadyFull;
    expect(plain.regulatory_overlay.mappings_scope).toBeUndefined();
    expect(plain.regulatory_overlay.mappings).toEqual([]);
  });
});
