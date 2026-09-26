import { readFileSync, writeFileSync } from "node:fs";
// 0006 (PROPOSTA, sem código): mede as opções de contexto para exposure/data_sensitivity simulando-as com slice_families (0005).
// uso: node scripts/measure/broad-activator-context-matrix.mjs "$PWD" out.json
const root = process.argv[2];
const S = await import(root + "/dist/tools/select-requirements.js");
const P = await import(root + "/dist/tools/prepare-codegen-context.js");
const J = (p) => JSON.parse(readFileSync(root + "/data/publish/" + p, "utf-8"));
const Lj = (p) => readFileSync(root + "/data/publish/" + p, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const reqCtrl = new Map(); for (const l of J("runtime/requirement_control_links.json").items) (reqCtrl.get(l.source_id) ?? reqCtrl.set(l.source_id, new Set()).get(l.source_id)).add(l.target_id);
const coFam = new Map((J("runtime/v1/control_objectives.json")).map ? J("runtime/v1/control_objectives.json").map((c) => [c.entity_id, c.slice_family]) : []);
const ctrlFam = new Map(); for (const a of Lj("semantic/ctrl_acore_alignment.jsonl")) { if (a.record_type !== "alignment" || a.source_type !== "Control" || !["exact", "partial"].includes(a.alignment_type)) continue; const f = coFam.get(a.target_id); if (f) (ctrlFam.get(a.source_id) ?? ctrlFam.set(a.source_id, new Set()).get(a.source_id)).add(f); }
const chain = (ids) => { const s = new Set(); for (const id of ids) for (const c of reqCtrl.get(id) ?? []) for (const f of ctrlFam.get(c) ?? []) s.add(f); return [...s].sort(); };
const tab = P.__wp5Lexicon.CONCERN_TO_SLICE_FAMILY;
const sel = (a) => (S.handleSelectRequirements({ ...a, limit: 500 }).selection?.selected ?? []).map((x) => x.requirement_id);
const broadOnly = (d) => ({ risk_level: d.risk_level, ...(d.exposure ? { exposure: d.exposure } : {}), ...(d.data_sensitivity ? { data_sensitivity: d.data_sensitivity } : {}) });
const famB = (d) => [...new Set([...(P.EXPOSURE_CONCERNS[d.exposure] ?? []), ...(P.SENSITIVITY_CONCERNS[d.data_sensitivity] ?? [])].map((c) => tab[c]).filter(Boolean))].sort();
const famA = (d) => (d.exposure || d.data_sensitivity ? chain(sel(broadOnly(d))) : []);
const famAll = (d) => chain(sel(d));
const decls = [];
for (const L of ["L1", "L2", "L3"]) {
  for (const e of ["internal", "authenticated", "public"]) decls.push({ risk_level: L, exposure: e });
  for (const s of ["personal", "regulated", "secrets"]) decls.push({ risk_level: L, data_sensitivity: s });
  for (const e of ["internal", "authenticated", "public"]) for (const s of ["personal", "regulated", "secrets"]) decls.push({ risk_level: L, exposure: e, data_sensitivity: s });
}
decls.push({ risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI", task: "Expor API pública de consulta com chaves de cliente e rate limiting", _name: "avaliador" });
decls.push({ risk_level: "L2", concerns: ["auth", "logging"], technologies: ["jwt"], exposure: "public", _name: "docs" });
const g2n = (p) => ["control_objectives", "mechanisms", "practices", "artifacts"].reduce((n, k) => n + (p.g2_context?.[k]?.length ?? 0), 0);
const variants = { before: () => [], B_rule: famB, A_chain_broad: famA, A2_chain_all: famAll };
const T = {}; const rows = [];
for (const v of Object.keys(variants)) T[v] = { ready: 0, decomposed: 0, batches: 0, single: 0, violations: 0, irreducible_ready: 0, tk_sum: 0, g2_full_zero: 0, g2_full_sum: 0 };
for (const d0 of decls) {
  const { _name, ...d } = d0; const base = { task: "x", ...d };
  for (const [v, fam] of Object.entries(variants)) {
    const f = fam(d); const withF = f.length ? { slice_families: f } : {};
    const full = P.handlePrepareCodegenContext({ ...base, ...withF, detail: "full" });
    const n = g2n(full); T[v].g2_full_sum += n; if (n === 0) T[v].g2_full_zero++;
    const row = { case: _name ?? JSON.stringify(d), variant: v, families: f, g2_full: n };
    for (const detail of ["lista", "standard"]) {
      const r = P.handlePrepareCodegenContext({ ...base, ...withF, detail });
      if (r.status === "ready_for_codegen") { T[v].ready++; T[v].tk_sum += r.size_estimate.approx_tokens; if (r.size_estimate.irreducible_note_id) T[v].irreducible_ready++; row[detail] = r.size_estimate.approx_tokens; }
      else if (r.status === "needs_decomposition") {
        T[v].decomposed++; const bs = r.requirement_ceiling.batches; T[v].batches += bs.length; if (bs.length < 2) T[v].single++; T[v].tk_sum += r.requirement_ceiling.projected_tk; row[detail] = `dec ${r.requirement_ceiling.projected_tk} (${bs.length})`;
        for (const b of bs) { const x = P.handlePrepareCodegenContext({ task: base.task, risk_level: d.risk_level, detail, ...b.with }); if (x.status !== "ready_for_codegen" || !(x.size_estimate.within_envelope || x.size_estimate.irreducible_note_id) || x.size_estimate.approx_tokens !== b.measured_tk) T[v].violations++; }
      } else row[detail] = r.status;
    }
    rows.push(row);
  }
}
console.log("declarações", decls.length, "casos", decls.length * 2);
console.log(JSON.stringify(T, null, 0).replace(/\},/g, "},\n"));
for (const r of rows.filter((r) => r.case === "avaliador" || r.case === "docs")) console.log(r.case, r.variant, r.families.join(",") || "-", "G2full", r.g2_full, "lista", r.lista, "standard", r.standard);
for (const r of rows.filter((r) => /"risk_level":"L2","exposure":"public"}$|"risk_level":"L2","data_sensitivity":"personal"}$/.test(r.case))) console.log(r.case, r.variant, r.families.join(","), "G2full", r.g2_full, "lista", r.lista);
writeFileSync(process.argv[3], JSON.stringify({ totals: T, rows }, null, 1));
