#!/usr/bin/env node
/**
 * run-axis-h-selection — Axis H measurement report: requirement selection of
 * prepare_sbd_toe_codegen_context and consult_security_requirements against the
 * programme lead's golden oracle (golden-selection-cases.md v1). Measurement only —
 * Axis E remains the only promotion gate; this runner always exits 0 unless it
 * cannot run at all.
 *
 * Usage: node scripts/run-axis-h-selection.mjs [--out <dir>] [--stamp YYYY-MM-DD]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startClient } from "./acceptance/client.mjs";
import { goldenCases, loadCatalogue, runGoldenCase, ORACLE_VERSION, ORACLE_PATH } from "./acceptance/axis-h.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const outDir = path.resolve(repoRoot, opt("--out") ?? "docs/acceptance-runs");
const stamp = opt("--stamp") ?? new Date().toISOString().slice(0, 10);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const pin = JSON.parse(readFileSync(path.join(repoRoot, "consumed-bundle.json"), "utf8"));

const catalogue = loadCatalogue();
const client = await startClient();
const results = [];
for (const gc of goldenCases) {
  const r = await runGoldenCase(client, gc, catalogue);
  results.push(r);
  process.stderr.write(`${r.status.padEnd(4)} ${r.case}  ${r.title}\n       ${r.note}\n`);
}
client.stop();

const pct = (v) => `${(v * 100).toFixed(0)}%`;
const counts = { PASS: 0, PART: 0, FAIL: 0 };
for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
const avg = (k, m) => results.filter((r) => !r[k] || r[k][m] === undefined ? false : true).reduce((a, r) => a + r[k][m], 0) / results.filter((r) => r[k] && r[k][m] !== undefined).length;

mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${stamp}-axis-h-selection-v${pkg.version}`);
const report = {
  generated_at: new Date().toISOString(), package_version: pkg.version,
  consumed_bundle: { release_tag: pin.kg_bundle.release_tag, source: pin.kg_bundle.source, sha256: pin.kg_bundle.release_sha256, contract: pin.consumer_contract_version },
  oracle: { version: ORACLE_VERSION, path: ORACLE_PATH },
  gate: "not-in-gate (Axis E remains the only promotion gate)",
  verdicts: counts, results,
};
writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + "\n");

const md = [];
md.push(`# Axis H — requirement-selection vs golden oracle — ${stamp} — @shiftleftpt/sbd-toe-mcp@${pkg.version}`, "");
md.push(`Oracle: \`golden-selection-cases.md\` **${ORACLE_VERSION}** (programme lead's; read-only). Bundle: **${pin.kg_bundle.release_tag}** (\`${pin.kg_bundle.source}\`, contract ${pin.consumer_contract_version}). Measurement only — **not part of the promotion gate**. "Discutíveis" lines are neutral; GC-01 carries the oracle's contamination note. Verdict measured on \`prepare\` (the selection instrument); \`consult\` (task-derived equivalent context, mapping documented in \`scripts/acceptance/axis-h.mjs\`) reported alongside.`, "");
md.push(`## Tabela — 10 casos × 2 tools × 3 métricas`, "", "| Caso | Nível | Verdict | prepare cob. | prepare prec. | prepare exc. | consult cob. | consult prec. | consult exc. |", "|---|---|---|---|---|---|---|---|---|");
for (const r of results) {
  const c = r.consult?.coverage !== undefined ? [pct(r.consult.coverage), pct(r.consult.strict_precision), r.consult.excess_count] : ["n/a", "n/a", "n/a"];
  md.push(`| ${r.case} | ${r.level ?? "—"} | ${r.status} | ${pct(r.prepare.coverage)} | ${pct(r.prepare.strict_precision)} | ${r.prepare.excess_count} | ${c[0]} | ${c[1]} | ${c[2]} |`);
}
md.push("", `Verdicts: **${counts.PASS} PASS · ${counts.PART} PART · ${counts.FAIL} FAIL**. Médias (prepare): cobertura ${pct(avg("prepare", "coverage"))}, precisão-estrita ${pct(avg("prepare", "strict_precision"))}.`, "");
md.push("## Faltas, violações e excessos por caso", "");
for (const r of results) {
  md.push(`### ${r.case} — ${r.title}`);
  md.push(`- oráculo: must-have ${r.oracle.must_have}, discutíveis ${r.oracle.debatable}, must-NOT ${r.oracle.must_not} · prepare status \`${r.prepare.status}\`, seleccionados ${r.prepare.selected_count}` + (r.prepare.overlay_obligations !== undefined ? ` · overlay obligations ${r.prepare.overlay_obligations}` : ""));
  if (r.prepare.missing?.length) md.push(`- **faltas (prepare):** ${r.prepare.missing.join(", ")}`);
  if (r.prepare.violations?.length) md.push(`- **must-NOT seleccionados (prepare):** ${r.prepare.violations.join(", ")}`);
  if (r.prepare.excess?.length) md.push(`- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ${r.prepare.excess.join(", ")}`);
  if (r.prepare.debatable_selected?.length) md.push(`- discutíveis seleccionados (neutros): ${r.prepare.debatable_selected.join(", ")}`);
  if (r.consult?.missing?.length || r.consult?.violations?.length) md.push(`- consult: faltas ${r.consult.missing?.length ?? 0} [${(r.consult.missing ?? []).slice(0, 12).join(", ")}${(r.consult.missing?.length ?? 0) > 12 ? ", …" : ""}], violações ${(r.consult.violations ?? []).length} [${(r.consult.violations ?? []).slice(0, 12).join(", ")}${(r.consult.violations?.length ?? 0) > 12 ? ", …" : ""}]`);
  if (r.causes?.length) { md.push(`- **causas:**`); for (const cz of r.causes) md.push(`  - \`${cz.id}\` → **${cz.cause}** — ${cz.note}`); }
  if (r.gap_note) md.push(`- lacuna registada no oráculo: ${r.gap_note}`);
  if (r.gap_transition) md.push(`- **transição lacuna → coberto:** ${r.gap_transition}`);
  md.push("");
}
md.push("## Leitura (Pontifex, 5 linhas)", "", "_preenchida na emissão do relatório — ver secção no espelho do hub._", "");
writeFileSync(`${base}.md`, md.join("\n") + "\n");
console.log(JSON.stringify({ verdicts: counts, report: `${base}.md` }, null, 1));
