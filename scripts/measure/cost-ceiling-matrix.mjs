/**
 * 0.21.2 (decisão 0004) — a MATRIZ DE 116 CASOS, antes e depois.
 *
 * Reprodutível:
 *   npm run build
 *   git worktree add --detach <dir> <sha-0.21.1> && (cd <dir> && npm run build)   # o «antes»
 *   node scripts/measure/cost-ceiling-matrix.mjs <dir>/dist [out.json]
 *
 * Casos (os mesmos da promessa §5): cada concern isolado em L2 e L3, os trios do vocabulário
 * (passo 3) em L3, o overlay RGPD (auth+logging/L2) e o caso da API pública/L3 — em `lista` e
 * `standard`. Para cada caso: o estado ANTES (tectos por contagem 52/55) e DEPOIS (regra de custo),
 * e, depois, as provas da promessa:
 *   - pronto ⇒ dentro do envelope, ou irredutível declarado;
 *   - needs_decomposition ⇒ cada lote EXECUTADO sai pronto (sem ciclo), com size_estimate = measured_tk,
 *     dentro do envelope salvo irredutível declarado, e a união cobre a selecção do full (recall 1).
 * E, por declaração, `full` byte-idêntico ao antes.
 *
 * Decisão 0005 (lotes com os activadores do pedido): mais quatro casos nomeados (auth/L2 + RGPD; o exemplo
 * dos docs auth+logging/L2 + jwt + exposure public; e duas variantes de overlay) — 120 casos — e, por
 * decomposição: nunca um lote único, e a união dos lotes executados devolve todas as fatias e entidades
 * AppSec Core do `full` do pedido original.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const beforeDist = process.argv[2];
if (!beforeDist) { console.error("uso: node scripts/measure/cost-ceiling-matrix.mjs <dist-0.21.1> [out.json]"); process.exit(2); }
const outPath = process.argv[3];
const load = (dist) => import(pathToFileURL(resolve(dist, "tools/prepare-codegen-context.js")).href);
const before = await load(beforeDist);
const after = await load(new URL("../../dist", import.meta.url).pathname);
const ENV = { lista: 8450, standard: 9200 };

const decls = [];
for (const L of ["L2", "L3"]) for (const c of after.VALID_CONCERNS) decls.push({ risk_level: L, concerns: [c] });
const cs = [...after.VALID_CONCERNS];
for (let i = 0; i < cs.length; i += 3) decls.push({ risk_level: "L3", concerns: cs.slice(i, i + 3) });
decls.push(
  { risk_level: "L2", concerns: ["auth", "logging"], regulatory_frameworks: ["RGPD"], include_regulatory_overlay: true },
  { risk_level: "L3", concerns: ["api"], exposure: "public", data_sensitivity: "personal" },
  { risk_level: "L2", concerns: ["auth"], regulatory_frameworks: ["RGPD"], include_regulatory_overlay: true },
  { risk_level: "L2", concerns: ["auth", "logging"], technologies: ["jwt"], exposure: "public" }
);
const G2 = ["control_objectives", "mechanisms", "practices", "artifacts"];
const g2OfFull = (p) => new Set(G2.flatMap((k) => (p.g2_context?.[k] ?? []).map((e) => e.entity_id)));
const g2OfDieted = (p) => new Set(G2.flatMap((k) => Object.values(p.g2_context?.[k] ?? {}).flatMap((e) => Object.keys(e))));
const slicesOf = (p) => new Set((p.activated_scope?.slices ?? []).map((x) => x.slice_id ?? x.id));
let singleBatch = 0; const g2Coverage = []; let slicesFull = 0;
const label = (d) => `${d.concerns.join("+")}${d.exposure ? `+${d.exposure}${d.data_sensitivity ? `/${d.data_sensitivity}` : ""}` : ""}${d.technologies ? `+${d.technologies.join("+")}` : ""}${d.regulatory_frameworks ? "+RGPD" : ""} ${d.risk_level}`;

const rows = [];
const violations = [];
let fullIdentical = 0;
let fullChangedBy0006 = 0;
const t0 = performance.now();
for (const d of decls) {
  const base = { task: "x", ...d };
  const fb = JSON.stringify(before.handlePrepareCodegenContext({ ...base, detail: "full" }));
  const fa = after.handlePrepareCodegenContext({ ...base, detail: "full" });
  // Decisão 0006: com exposure/data_sensitivity o full muda POR DESENHO (os activadores largos trazem fatias).
  const broad = d.exposure !== undefined || d.data_sensitivity !== undefined;
  if (fb === JSON.stringify(fa)) fullIdentical += 1;
  else if (broad) fullChangedBy0006 += 1;
  else violations.push(`${label(d)}: full difere do 0.21.1`);
  const fullIds = new Set((fa.activated_scope?.requirements ?? []).map((q) => q.id));
  const fullG2 = g2OfFull(fa), fullSlices = slicesOf(fa);
  for (const detail of ["lista", "standard"]) {
    const b = before.handlePrepareCodegenContext({ ...base, detail });
    const s0 = performance.now();
    const a = after.handlePrepareCodegenContext({ ...base, detail });
    const ms = Math.round(performance.now() - s0);
    const row = { case: label(d), detail, reqs: fullIds.size, before: b.status, after: a.status, ms };
    if (b.status === "ready_for_codegen") row.before_tk = b.size_estimate.approx_tokens;
    if (a.status === "ready_for_codegen") {
      row.after_tk = a.size_estimate.approx_tokens;
      row.irreducible = a.size_estimate.irreducible_note_id !== undefined;
      if (!(a.size_estimate.within_envelope || row.irreducible)) violations.push(`${row.case}@${detail}: pronto fora do envelope sem ser irredutível`);
    } else if (a.status === "needs_decomposition") {
      const rc = a.requirement_ceiling;
      row.after_tk = rc.projected_tk;
      row.batches = rc.batches.map((bt) => ({ categories: bt.with.categories, requirements: bt.requirements, measured_tk: bt.measured_tk, irreducible: bt.irreducible }));
      const union = new Set(), uG2 = new Set(), uSl = new Set();
      if (rc.batches.length < 2) { singleBatch += 1; violations.push(`${row.case}@${detail}: decomposição de um só lote`); }
      for (const bt of rc.batches) {
        const x = after.handlePrepareCodegenContext({ task: "x", risk_level: d.risk_level, detail, ...bt.with });
        if (x.status !== "ready_for_codegen") { violations.push(`${row.case}@${detail}: lote ${bt.with.categories} → ${x.status}`); continue; }
        if (x.size_estimate.approx_tokens !== bt.measured_tk) violations.push(`${row.case}@${detail}: lote ${bt.with.categories} declara ${bt.measured_tk}, recebe ${x.size_estimate.approx_tokens}`);
        if (!(x.size_estimate.within_envelope || (bt.irreducible && x.size_estimate.irreducible_note_id))) violations.push(`${row.case}@${detail}: lote ${bt.with.categories} fora do envelope`);
        for (const q of x.activated_scope.requirements) union.add(q.id);
        for (const i of g2OfDieted(x)) uG2.add(i);
        for (const i of slicesOf(x)) uSl.add(i);
      }
      row.g2_coverage = fullG2.size === 0 ? 1 : [...fullG2].filter((i) => uG2.has(i)).length / fullG2.size;
      row.slices_coverage = fullSlices.size === 0 ? 1 : [...fullSlices].filter((i) => uSl.has(i)).length / fullSlices.size;
      g2Coverage.push(row.g2_coverage); if (row.slices_coverage === 1) slicesFull += 1;
      if (row.g2_coverage !== 1) violations.push(`${row.case}@${detail}: união dos lotes perde contexto G2 (${row.g2_coverage.toFixed(2)})`);
      const covered = [...fullIds].filter((id) => union.has(id)).length;
      row.recall = fullIds.size === 0 ? 1 : covered / fullIds.size;
      if (row.recall !== 1) violations.push(`${row.case}@${detail}: recall ${row.recall}`);
    }
    rows.push(row);
  }
}
const ready = (s) => s === "ready_for_codegen";
const tally = {
  cases: rows.length,
  same_ready: rows.filter((r) => ready(r.before) && ready(r.after)).length,
  same_blocked: rows.filter((r) => !ready(r.before) && !ready(r.after)).length,
  ready_to_blocked: rows.filter((r) => ready(r.before) && !ready(r.after)).map((r) => `${r.case}@${r.detail} (${r.reqs} reqs, ${r.after_tk} tk)`),
  blocked_to_ready: rows.filter((r) => !ready(r.before) && ready(r.after)).map((r) => `${r.case}@${r.detail} (${r.reqs} reqs, ${r.after_tk} tk)`),
  irreducible_ready: rows.filter((r) => r.irreducible).map((r) => `${r.case}@${r.detail}`),
  before_ready_above_envelope: rows.filter((r) => ready(r.before) && r.before_tk > ENV[r.detail]).length,
  full_byte_identical: `${fullIdentical}/${decls.length - fullChangedBy0006}`,
  full_changed_by_design_0006: fullChangedBy0006,
  decompositions: g2Coverage.length,
  single_batch_decompositions: singleBatch,
  g2_coverage_mean: g2Coverage.length ? Number((g2Coverage.reduce((a, b) => a + b, 0) / g2Coverage.length).toFixed(4)) : 1,
  g2_coverage_min: g2Coverage.length ? Math.min(...g2Coverage) : 1,
  slices_full_union: `${slicesFull}/${g2Coverage.length}`,
  violations,
  max_ms: Math.max(...rows.map((r) => r.ms)),
  total_s: Number(((performance.now() - t0) / 1000).toFixed(1))
};
console.log(`casos ${tally.cases} · iguais prontos ${tally.same_ready} · iguais bloqueados ${tally.same_blocked}`);
console.log(`pronto → bloqueia: ${tally.ready_to_blocked.length}`); tally.ready_to_blocked.forEach((t) => console.log("   " + t));
console.log(`bloqueado → pronto: ${tally.blocked_to_ready.length}`); tally.blocked_to_ready.forEach((t) => console.log("   " + t));
console.log(`irredutíveis prontos: ${tally.irreducible_ready.length}`);
console.log(`antes: prontos ACIMA do envelope (promessa por cumprir): ${tally.before_ready_above_envelope}`);
console.log(`full byte-idêntico ao antes (sem activadores largos): ${tally.full_byte_identical} · full mudado por desenho (0006): ${tally.full_changed_by_design_0006}`);
console.log(`decomposições ${tally.decompositions} · de um só lote ${tally.single_batch_decompositions} · cobertura G2 da união média ${tally.g2_coverage_mean} (mín. ${tally.g2_coverage_min}) · fatias completas ${tally.slices_full_union}`);
console.log(`violações da promessa: ${violations.length}`); violations.forEach((v) => console.log("   " + v));
console.log(`latência máx. de uma chamada: ${tally.max_ms} ms · total ${tally.total_s} s`);
if (outPath) writeFileSync(outPath, JSON.stringify({ tally, rows }, null, 2) + "\n");
process.exit(violations.length === 0 ? 0 : 1);
