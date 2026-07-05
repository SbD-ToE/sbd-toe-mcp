#!/usr/bin/env node
// End-to-end MCP smoke test (functional, over real stdio JSON-RPC).
// Spawns the built server, runs the initialize handshake, then exercises the
// FULL dispatch path (schema + tools/list + tools/call) for trace_sbd_toe_graph.
// Complements the in-suite handler-level smoke (which bypasses the transport).
//
//   npm run build && npm run smoke:mcp
//
// Exits 0 on success, 1 on any failure.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const ENTRY = "dist/index.js";
if (!existsSync(ENTRY)) {
  console.error(`✗ ${ENTRY} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const child = spawn("node", [ENTRY], {
  env: { ...process.env, SBD_TOE_APP_ROOT: process.cwd() },
  stdio: ["pipe", "pipe", "ignore"],
});

let buf = "";
child.stdout.on("data", (d) => (buf += d.toString()));
const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke-mcp", version: "0" } } });
send({ jsonrpc: "2.0", method: "notifications/initialized" });
send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "trace_sbd_toe_graph", arguments: { lens: "slice_implementation", pageSize: 2 } } });
// v2 token diet s3 — the codegen-instructions resource must be listed, resolve
// over stdio and be byte-identical to the builder's content; a detail=standard
// tools/call must reference it.
send({ jsonrpc: "2.0", id: 4, method: "resources/list", params: {} });
send({ jsonrpc: "2.0", id: 5, method: "resources/read", params: { uri: "sbd://toe/codegen-instructions/codegen" } });
send({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "prepare_sbd_toe_codegen_context", arguments: { task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", mode: "codegen", detail: "standard" } } });

setTimeout(async () => {
  child.kill();
  const byId = new Map();
  for (const line of buf.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { const m = JSON.parse(t); if (m.id !== undefined) byId.set(m.id, m); } catch { /* skip non-JSON framing */ }
  }

  const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

  const list = byId.get(2);
  const names = list?.result?.tools?.map((t) => t.name) ?? [];
  if (!names.includes("trace_sbd_toe_graph")) fail("trace_sbd_toe_graph not in tools/list");

  const call = byId.get(3);
  if (!call?.result) fail("tools/call returned no result");
  const text = call.result.content?.[0]?.text ?? "";
  if (text.includes("sbd-toe.dev")) fail("internal IRI leaked into output");
  let payload;
  try { payload = JSON.parse(text); } catch { return fail("tool result text is not JSON"); }
  if (payload.lens !== "slice_implementation") fail(`unexpected lens: ${payload.lens}`);
  if (!(payload.total > 0)) fail(`expected total > 0, got ${payload.total}`);
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) fail("no rows returned");
  const r0 = payload.rows[0];
  if (!r0.slice || !r0.objective || !r0.target || !["mechanism", "practice"].includes(r0.kind)) {
    fail(`malformed row: ${JSON.stringify(r0)}`);
  }

  // --- v2 token diet s3: codegen-instructions resource over stdio ----------
  const resources = byId.get(4)?.result?.resources?.map((r) => r.uri) ?? [];
  if (!resources.includes("sbd://toe/codegen-instructions/{mode}")) {
    fail("sbd://toe/codegen-instructions/{mode} not in resources/list");
  }

  const read = byId.get(5);
  const resourceText = read?.result?.contents?.[0]?.text;
  if (typeof resourceText !== "string" || resourceText.length === 0) {
    fail("resources/read returned no text for sbd://toe/codegen-instructions/codegen");
  }
  const { buildCodegenInstructionsResourceContent } = await import(
    new URL("../dist/tools/prepare-codegen-context.js", import.meta.url)
  );
  const expectedResource = JSON.stringify(
    buildCodegenInstructionsResourceContent("codegen"),
    null,
    2
  );
  if (resourceText !== expectedResource) {
    fail("codegen-instructions resource text is not byte-identical to the builder content");
  }
  let resourceJson;
  try { resourceJson = JSON.parse(resourceText); } catch { return fail("codegen-instructions resource is not JSON"); }
  if (!Array.isArray(resourceJson.llm_codegen_instructions?.slots) || resourceJson.llm_codegen_instructions.slots.length === 0) {
    fail("codegen-instructions resource has no instruction slots");
  }

  const dietedCall = byId.get(6);
  const dietedText = dietedCall?.result?.content?.[0]?.text ?? "";
  let dieted;
  try { dieted = JSON.parse(dietedText); } catch { return fail("detail=standard tool result is not JSON"); }
  if (dieted.status !== "ready_for_codegen") fail(`detail=standard status: ${dieted.status}`);
  if (dieted.codegen_instructions_ref?.resource !== "sbd://toe/codegen-instructions/codegen") {
    fail(`codegen_instructions_ref does not point at the resource: ${JSON.stringify(dieted.codegen_instructions_ref)}`);
  }
  if (dieted.completeness_report?.evidence_pattern_cap !== 10) {
    fail(`expected evidence_pattern_cap 10, got ${dieted.completeness_report?.evidence_pattern_cap}`);
  }

  console.log(`✓ MCP e2e OK — tools/list has trace_sbd_toe_graph; call total=${payload.total}, cursor=${payload.cursor}, rows[0]=${JSON.stringify(r0)} (no IRI leak); codegen-instructions resource listed + resolves byte-identical; detail=standard references it (cap=10)`);
  process.exit(0);
}, 6000);
