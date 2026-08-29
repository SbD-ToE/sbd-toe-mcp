/**
 * Minimal MCP stdio client for the acceptance runner: spawns `dist/index.js`,
 * speaks newline-delimited JSON-RPC, returns parsed tool results. No SDK dependency.
 */
import { spawn } from "node:child_process";
import readline from "node:readline";

export async function startClient(entry = "dist/index.js") {
  const server = spawn("node", [entry], { stdio: ["pipe", "pipe", "pipe"] });
  const stderr = [];
  server.stderr.on("data", (d) => stderr.push(String(d)));
  const rl = readline.createInterface({ input: server.stdout });
  const pending = new Map();
  rl.on("line", (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  let nextId = 1;
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout ${method}`)); }, 60000);
    pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
  const init = await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "sbd-toe-acceptance", version: "0" } });
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  /** Returns {ok:true,data,text,size} or {ok:false,error,rpc:boolean}. */
  const calls = new Map();
  const tool = async (name, args) => {
    calls.set(name, (calls.get(name) ?? 0) + 1);
    const res = await call("tools/call", { name, arguments: args });
    if (res.error) return { ok: false, rpc: true, error: res.error.message ?? String(res.error), code: res.error.code };
    const text = res.result?.content?.[0]?.text ?? "";
    if (res.result?.isError) return { ok: false, rpc: false, error: text };
    let data; try { data = JSON.parse(text); } catch { data = undefined; }
    return { ok: true, data, text, size: text.length };
  };
  const resource = async (uri) => {
    const res = await call("resources/read", { uri });
    const text = res.result?.contents?.[0]?.text ?? "";
    let data; try { data = JSON.parse(text); } catch { data = undefined; }
    return { data, text };
  };
  const tools = (await call("tools/list", {})).result?.tools ?? [];
  return { serverInfo: init.result?.serverInfo, tools, tool, resource, calls, stop: () => server.kill(), stderr };
}
