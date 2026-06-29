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

setTimeout(() => {
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

  console.log(`✓ MCP e2e OK — tools/list has trace_sbd_toe_graph; call total=${payload.total}, cursor=${payload.cursor}, rows[0]=${JSON.stringify(r0)} (no IRI leak)`);
  process.exit(0);
}, 6000);
