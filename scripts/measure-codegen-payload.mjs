#!/usr/bin/env node
// Measures the per-section token weight of prepare_sbd_toe_codegen_context.
// Baseline instrument for the v2-token-diet epic (agentic/planeado/v2-token-diet/EPIC.md, s0).
//
//   npm run build && node scripts/measure-codegen-payload.mjs
//
// Token estimate is JSON.stringify(value).length / 4 — the same method used to
// record the EPIC baselines (fixture 1 ⇒ ≈18.903 tokens / 111 citation ids,
// fixture 2 ⇒ ≈24.731 / 150, measured 2026-07-05 on 0.20.0-beta.1). Regressions
// are judged against those numbers; do not change the method or the fixtures
// without updating the EPIC.

import { existsSync } from "node:fs";

const ENTRY = "./dist/tools/prepare-codegen-context.js";
if (!existsSync(new URL(`../dist/tools/prepare-codegen-context.js`, import.meta.url))) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}
const { handlePrepareCodegenContext } = await import(
  new URL(`../dist/tools/prepare-codegen-context.js`, import.meta.url)
);

// EPIC baseline fixtures — keep byte-identical to the EPIC's "Fixtures baseline" block.
const TASKS = [
  {
    label: "BASELINE 1 — auth+validation endpoint (typical)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    label: "BASELINE 2 — secure endpoint compound (3 families)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    label: "blocked-path sample (needs_decomposition)",
    input: {
      task: "Add SBOM generation to the CI build pipeline for the release workflow",
      risk_level: "L2",
      mode: "codegen"
    }
  }
];

const tok = (v) => Math.round(JSON.stringify(v).length / 4);

for (const { label, input } of TASKS) {
  const r = handlePrepareCodegenContext(input);
  console.log(`\n=== ${label} — status: ${r.status} ===`);
  const total = tok(r);
  const rows = [];
  for (const [k, v] of Object.entries(r)) {
    const t = tok(v);
    const count = Array.isArray(v)
      ? v.length
      : v && typeof v === "object"
        ? Object.keys(v).length
        : "";
    rows.push({ section: k, items: count, approx_tokens: t, pct: ((100 * t) / total).toFixed(1) + "%" });
  }
  rows.sort((a, b) => b.approx_tokens - a.approx_tokens);
  console.table(rows);
  console.log(`TOTAL ≈ ${total} tokens (${JSON.stringify(r).length} chars)`);
  if (r.status === "ready_for_codegen") {
    console.log("g2_context breakdown:");
    for (const [k, v] of Object.entries(r.g2_context)) {
      console.log(`  ${k}: ${Array.isArray(v) ? v.length : "?"} items ≈ ${tok(v)} tokens`);
    }
    console.log(`citation_map ids: ${Object.keys(r.citation_map).length}`);
  }
}
