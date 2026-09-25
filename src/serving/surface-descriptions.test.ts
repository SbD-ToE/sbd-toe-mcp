/**
 * 0.21 §6-d — AS DESCRIÇÕES SÃO O SCHEMA QUE O CLIENTE PAGA EM TODAS AS VOLTAS.
 *
 * Regra do despacho (2026-09-11 §6 (d)): descrições ≤600 chars, UMA língua, e o changelog fora
 * delas (vive em `sbd://toe/version.surface_history`, verbatim — nada se remove). Este teste lê a
 * superfície REAL (tools/list do servidor) e falha se uma descrição voltar a crescer, a misturar
 * línguas ou a carregar história de versões. Também prova que cada `note_id` servido pelo prepare
 * resolve no recurso de notas.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { NOTES } from "./notes.js";
import { SURFACE_HISTORY } from "./surface-history.js";

type Tool = { name: string; description: string; inputSchema?: { properties?: Record<string, { description?: string }> } };
let tools: Tool[] = [];
let server: ChildProcess | null = null;
let rpc: (method: string, params: unknown) => Promise<{ result?: unknown; error?: unknown }>;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: unknown; error?: unknown }) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try { const m = JSON.parse(line); pending.get(m.id)?.(m); } catch { /* parciais */ }
    }
  });
  rpc = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "surface-descriptions", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = (await rpc("tools/list", {})) as { result?: { tools?: Tool[] } };
  tools = t.result?.tools ?? [];
  expect(tools.length).toBeGreaterThanOrEqual(29);
}, 20000);

afterAll(() => server?.kill());

const VERSION_HISTORY = /\b0\.\d+\.\d+\b|\bbeta\.\d+\b|\bs3[a-c]?\b|\bcontract v1\.\d+/i;
// marcadores de português — a superfície fala UMA língua (inglês); nomes próprios como 'Fontes' são citados entre aspas
const PORTUGUESE = /\b(não|uma|que|para|tua|teu|são|nível|declarad[oa]s?|apenas|também)\b|ção|ções|ável/i;

describe("0.21 §6-d — descrições da superfície", () => {
  it("cada descrição de tool tem ≤600 caracteres", () => {
    const long = tools.filter((t) => t.description.length > 600).map((t) => `${t.name}(${t.description.length})`);
    expect(long, long.join(", ")).toEqual([]);
  });
  it("nenhuma descrição carrega histórico de versões (vive em sbd://toe/version.surface_history)", () => {
    const withHistory = tools.filter((t) => VERSION_HISTORY.test(t.description)).map((t) => t.name);
    expect(withHistory, withHistory.join(", ")).toEqual([]);
  });
  it("uma língua: nenhuma descrição mistura português", () => {
    const mixed = tools.filter((t) => PORTUGUESE.test(t.description.replace(/'[^']*'/g, ""))).map((t) => t.name);
    expect(mixed, mixed.join(", ")).toEqual([]);
  });
  it("cada descrição de parâmetro tem ≤600 caracteres", () => {
    const long: string[] = [];
    for (const t of tools) for (const [k, p] of Object.entries(t.inputSchema?.properties ?? {})) if ((p.description ?? "").length > 600) long.push(`${t.name}.${k}(${p.description!.length})`);
    expect(long, long.join(", ")).toEqual([]);
  });
  it("o histórico guarda VERBATIM a descrição anterior de cada tool (nada se remove — muda de sítio)", async () => {
    for (const t of tools) {
      const prev = (SURFACE_HISTORY.tools as Record<string, { previous_description: string }>)[t.name];
      expect(prev, `${t.name} sem histórico`).toBeDefined();
      expect(prev!.previous_description.length).toBeGreaterThan(0);
    }
    const v = (await rpc("resources/read", { uri: "sbd://toe/version" })) as { result?: { contents?: Array<{ text: string }> } };
    const payload = JSON.parse(v.result!.contents![0]!.text) as { surface_history?: { tools: Record<string, unknown> } };
    expect(Object.keys(payload.surface_history?.tools ?? {}).length).toBe(Object.keys(SURFACE_HISTORY.tools).length);
  });
  it("o schema inteiro (tools/list) custa menos do que antes desta fase (medido 13.809 tk @ 6ea4789; pós-§6-d ≈ 11.4k — o resto é inputSchema, não descrições)", () => {
    const tk = Math.round(JSON.stringify(tools).length / 4);
    expect(tk).toBeLessThan(12000);
    const descTk = Math.round(JSON.stringify(tools.map((t) => t.description)).length / 4);
    expect(descTk).toBeLessThan(3600); // 29 × ≤600 chars = 4.350 tk no limite; medido ≈ 3.3k
  });
});

describe("0.21 §6-c — notas por referência", () => {
  it("o índice sbd://toe/notes serve todos os ids e cada nota individual resolve; id desconhecido é erro declarado", async () => {
    const idx = (await rpc("resources/read", { uri: "sbd://toe/notes" })) as { result?: { contents?: Array<{ text: string }> } };
    const index = JSON.parse(idx.result!.contents![0]!.text) as { ids: string[]; notes: Record<string, string> };
    expect(index.ids.sort()).toEqual(Object.keys(NOTES).sort());
    for (const id of index.ids) {
      const one = (await rpc("resources/read", { uri: `sbd://toe/notes/${id}` })) as { result?: { contents?: Array<{ text: string }> } };
      const note = JSON.parse(one.result!.contents![0]!.text) as { id: string; text: string };
      expect(note.text).toBe((NOTES as Record<string, string>)[id]);
    }
    const bad = (await rpc("resources/read", { uri: "sbd://toe/notes/nope" })) as { error?: { message: string } };
    expect(bad.error?.message).toMatch(/Unknown note id/);
  });
  it("cada note_id servido pelo prepare (lista) resolve no registo, e o payload traz o cabeçalho `notes`", async () => {
    const r = (await rpc("tools/call", { name: "prepare_sbd_toe_codegen_context", arguments: { task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"], detail: "lista" } })) as { result?: { content: Array<{ text: string }> } };
    const text = r.result!.content[0]!.text;
    const payload = JSON.parse(text) as { notes?: { read_with: string; uri: string; index: string }; size_estimate?: { approx_tokens: number } };
    expect(payload.notes).toEqual({ read_with: "read_sbd_toe_resource", uri: "sbd://toe/notes/{id}", index: "sbd://toe/notes" });
    const ids = [...text.matchAll(/"note_id":"([^"]+)"/g)].map((m) => m[1]!);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of new Set(ids)) expect(id in NOTES, `note_id desconhecido: ${id}`).toBe(true);
    expect(payload.size_estimate?.approx_tokens).toBeGreaterThan(0);
  });
  it("0.21 §6 — size_estimate em todas as tools de resultado JSON (amostra pela superfície real)", async () => {
    for (const [name, args] of [["list_sbd_toe_chapters", {}], ["get_sbd_toe_verification_matrix", { risk_level: "L2", requirement_ids: ["AUT-001"] }], ["select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], limit: 5 }], ["get_threat_landscape", { risk_level: "L2", concerns: ["logging"] }], ["resolve_entities", { record_type: "requirement", limit: 1 }]] as const) {
      const r = (await rpc("tools/call", { name, arguments: args })) as { result?: { content: Array<{ text: string }> } };
      const text = r.result!.content[0]!.text;
      const payload = JSON.parse(text) as { size_estimate?: { chars: number; approx_tokens: number } };
      expect(payload.size_estimate?.chars, name).toBe(text.length);
    }
  });
});
