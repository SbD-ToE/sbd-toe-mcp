/**
 * 0.21.2 (decisão 0006) — matriz dos activadores largos: ANTES (build sem a decisão) vs DEPOIS (esta build).
 *
 * uso: node scripts/measure/broad-activator-context-matrix.mjs <root-antes> [out.json]
 *   <root-antes> = raiz de um worktree construído no commit anterior à 0006 (ex.: 89fa703), com dist/.
 *
 * 47 declarações (L1–L3: cada exposure, cada data_sensitivity e as 9 combinações; o caso do avaliador; o
 * exemplo dos docs) × lista/standard = 94 casos. Por caso e por build: estado, custo medido, lotes executados
 * (com o task original: o custo declarado tem de ser o recebido) e entidades G2 no full. Depois da 0006,
 * também: a união das fatias dos lotes é EXACTAMENTE a do full do pedido.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const beforeRoot = process.argv[2];
if (!beforeRoot) { console.error("uso: node scripts/measure/broad-activator-context-matrix.mjs <root-antes> [out.json]"); process.exit(2); }
const outPath = process.argv[3];
const load = (root) => import(pathToFileURL(resolve(root, "dist/tools/prepare-codegen-context.js")).href);
const builds = { before: await load(beforeRoot), after: await load(new URL("../..", import.meta.url).pathname) };

const decls = [];
for (const L of ["L1", "L2", "L3"]) {
  for (const e of ["internal", "authenticated", "public"]) decls.push({ risk_level: L, exposure: e });
  for (const s of ["personal", "regulated", "secrets"]) decls.push({ risk_level: L, data_sensitivity: s });
  for (const e of ["internal", "authenticated", "public"]) for (const s of ["personal", "regulated", "secrets"]) decls.push({ risk_level: L, exposure: e, data_sensitivity: s });
}
decls.push({ _name: "avaliador", task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI" });
decls.push({ _name: "docs", risk_level: "L2", concerns: ["auth", "logging"], technologies: ["jwt"], exposure: "public" });

const G2 = ["control_objectives", "mechanisms", "practices", "artifacts"];
const g2n = (p) => G2.reduce((n, k) => n + (p.g2_context?.[k]?.length ?? 0), 0);
const slicesOf = (p) => new Set((p.activated_scope?.slices ?? []).map((s) => s.slice_id));
const T = {}; const rows = []; const violations = { before: [], after: [] };
for (const b of Object.keys(builds)) T[b] = { ready: 0, decomposed: 0, batches: 0, single: 0, tk_sum: 0, g2_zero_full: 0, g2_full_sum: 0, slices_union_exact: 0, max_ms: 0 };
for (const d0 of decls) {
  const { _name, ...d } = d0; const base = { task: "x", ...d };
  const name = _name ?? JSON.stringify(d);
  for (const [b, P] of Object.entries(builds)) {
    const full = P.handlePrepareCodegenContext({ ...base, detail: "full" });
    const n = g2n(full); T[b].g2_full_sum += n; if (n === 0) T[b].g2_zero_full++;
    const want = slicesOf(full);
    const row = { case: name, build: b, g2_full: n, slices_full: [...want].sort() };
    for (const detail of ["lista", "standard"]) {
      const t0 = performance.now(); const r = P.handlePrepareCodegenContext({ ...base, detail }); T[b].max_ms = Math.max(T[b].max_ms, Math.round(performance.now() - t0));
      if (r.status === "ready_for_codegen") { T[b].ready++; T[b].tk_sum += r.size_estimate.approx_tokens; row[detail] = r.size_estimate.approx_tokens; if (!(r.size_estimate.within_envelope || r.size_estimate.irreducible_note_id)) violations[b].push(`${name}@${detail}: pronto fora do envelope`); continue; }
      if (r.status !== "needs_decomposition") { row[detail] = r.status; continue; }
      const rc = r.requirement_ceiling; T[b].decomposed++; T[b].batches += rc.batches.length; T[b].tk_sum += rc.projected_tk;
      if (rc.batches.length < 2) { T[b].single++; violations[b].push(`${name}@${detail}: lote único`); }
      row[detail] = `${rc.projected_tk} → ${rc.batches.length} lotes`;
      const got = new Set();
      for (const bt of rc.batches) {
        const x = P.handlePrepareCodegenContext({ task: base.task, risk_level: d.risk_level, detail, ...bt.with });
        if (x.status !== "ready_for_codegen") { violations[b].push(`${name}@${detail}: lote → ${x.status}`); continue; }
        if (x.size_estimate.approx_tokens !== bt.measured_tk) violations[b].push(`${name}@${detail}: declarado ${bt.measured_tk} ≠ recebido ${x.size_estimate.approx_tokens}`);
        if (!(x.size_estimate.within_envelope || (bt.irreducible && x.size_estimate.irreducible_note_id))) violations[b].push(`${name}@${detail}: lote fora do envelope`);
        for (const s of slicesOf(x)) got.add(s);
      }
      const exact = got.size === want.size && [...want].every((s) => got.has(s));
      if (exact) T[b].slices_union_exact++; else if (b === "after") violations.after.push(`${name}@${detail}: fatias da união ≠ pedido`);
    }
    rows.push(row);
  }
}
const pct = (a, b) => `${(((a - b) / b) * 100).toFixed(1)}%`;
console.log(`declarações ${decls.length} · casos ${decls.length * 2}`);
for (const b of Object.keys(builds)) console.log(b.padEnd(6), JSON.stringify(T[b]));
console.log(`tokens: ${pct(T.after.tk_sum, T.before.tk_sum)} · violações antes ${violations.before.length} · depois ${violations.after.length}`);
[...violations.before, ...violations.after].slice(0, 10).forEach((v) => console.log("  ", v));
for (const r of rows.filter((r) => r.case === "avaliador" || r.case === "docs")) console.log(r.case, r.build, "G2", r.g2_full, "lista", r.lista, "standard", r.standard);
if (outPath) writeFileSync(outPath, JSON.stringify({ totals: T, violations, rows }, null, 1) + "\n");
process.exit(violations.after.length === 0 ? 0 : 1);
