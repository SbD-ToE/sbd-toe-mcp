#!/usr/bin/env node
/**
 * smoke-new-features — exercise this session's new capabilities against the local
 * build over a real JSON-RPC stdio round-trip (no MCP-client reconnect needed).
 *
 *   npm run build && node scripts/smoke-new-features.mjs
 *
 * Covers: sbd://toe/version provenance (Manual + KG), RF-S role skill / sub-agent
 * (harnessed + skilled flavours), the role resources, and unknown-role rejection.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn("node", [path.join(repoRoot, "dist/index.js")], { stdio: ["pipe", "pipe", "ignore"] });

const requests = [
  { id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } },
  { id: 2, method: "resources/read", params: { uri: "sbd://toe/version" } },
  { id: 3, method: "tools/call", params: { name: "generate_sbd_toe_skill", arguments: { role: "devops-sre", format: "subagent", flavour: "harnessed" } } },
  { id: 4, method: "tools/call", params: { name: "generate_sbd_toe_skill", arguments: { role: "sre", format: "subagent", flavour: "skilled" } } },
  { id: 5, method: "resources/read", params: { uri: "sbd://toe/skill/qa" } },
  { id: 6, method: "resources/read", params: { uri: "sbd://toe/skill/pentester" } },
];
for (const r of requests) server.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...r }) + "\n");
server.stdin.end();

let buf = "";
server.stdout.on("data", (c) => (buf += c));
server.stdout.on("end", () => {
  const byId = {};
  for (const line of buf.split("\n")) {
    if (!line.trim()) continue;
    try { const m = JSON.parse(line); if (m.id) byId[m.id] = m; } catch { /* ignore */ }
  }
  const txt = (m) => m?.result?.contents?.[0]?.text ?? m?.result?.content?.[0]?.text ?? "";
  const v = JSON.parse(txt(byId[2]) || "{}");
  console.log("① version resource:");
  console.log(`   server ${v.version} | manual ${v.manual?.version} (${v.manual?.commit?.slice(0,8)}) | kg ${v.kg?.release_tag} | contract ${v.kg?.consumer_contract_version}`);

  const sub = JSON.parse(txt(byId[3]) || "{}");
  console.log("\n② RF-S subagent devops-sre (harnessed):");
  console.log(`   coverage: ${JSON.stringify(sub.meta?.coverage)} | path: ${sub.suggested_path}`);
  console.log(`   grants MCP tools? ${/mcp__sbd-toe__/.test((sub.content || "").split("\\n---")[0]) ? "YES (harnessed)" : "no"}`);

  const skilled = JSON.parse(txt(byId[4]) || "{}");
  const skilledFm = (skilled.content || "").split("\n---")[0];
  console.log("\n③ RF-S subagent sre→skilled:");
  console.log(`   alias resolved to: ${skilled.meta?.canonical_role} | MCP tools in frontmatter? ${/mcp__sbd-toe__/.test(skilledFm) ? "YES (BUG!)" : "NO (correct — offline)"}`);

  console.log("\n④ resource sbd://toe/skill/qa:", (txt(byId[5]) || "").split("\n")[1] || "(empty)");
  console.log("⑤ resource sbd://toe/skill/pentester:", byId[6]?.error ? `rejected → ${byId[6].error.message.slice(0,55)}…` : "UNEXPECTED OK");
  console.log("\n✓ smoke complete.");
});
