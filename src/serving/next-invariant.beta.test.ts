/**
 * 0.20.0-beta.20 — EXTENSÃO DA INVARIANTE À LINHA BETA.
 *
 * A invariante 0.19.3 (`next-invariant.test.ts`, absorvida verbatim da estável)
 * percorre os arrays `next`. Esta linha serve ADEMAIS *referências executáveis*
 * que a estável não tem — o preço da dieta v2: `relations_ref`, `descriptions_ref`,
 * `groups_ref`, `evidence_patterns_rest`, `v1_diagnostics_ref`, `narrowed_out_ref`,
 * `activation_trace_ref`, `codegen_instructions_ref` — e a tool só-beta
 * `trace_sbd_toe_graph`. A ronda 6 testou ESTA linha; o princípio fecha aqui.
 *
 * Cada referência é validada contra o schema REAL do destino (tools/list do próprio
 * servidor): a tool existe, os parâmetros nomeados existem, os valores com enum são
 * válidos (inclusive nas listas estruturadas tipo `lenses[]`), URIs só aparecem
 * acompanhados de `read_sbd_toe_resource`, e uma referência que manda re-chamar tem
 * de nomear a tool. Referência inválida PARTE a suite.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";
import { handleTraceGraph } from "../tools/trace-graph.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handleTraceRequirementSources } from "../tools/trace-requirement-sources.js";

type Prop = { enum?: string[]; maxItems?: number; type?: string };
const schemas: Record<string, Record<string, Prop>> = {};
let server: ChildProcess | null = null;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: { tools?: { name: string; inputSchema?: { properties?: Record<string, Prop> } }[] } }) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        pending.get(m.id)?.(m);
      } catch {
        /* parciais/log ignoram-se */
      }
    }
  });
  const rpc = (method: string, params: unknown) =>
    new Promise<{ result?: { tools?: { name: string; inputSchema?: { properties?: Record<string, Prop> } }[] } }>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "next-invariant-beta", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = await rpc("tools/list", {});
  for (const tool of t.result?.tools ?? []) schemas[tool.name] = tool.inputSchema?.properties ?? {};
  expect(schemas["trace_sbd_toe_graph"], "a tool só-beta tem de estar exposta").toBeDefined();
}, 20000);

afterAll(() => server?.kill());

type Ref = Record<string, unknown>;

/** Toda a referência executável do payload: objecto com `tool`, ou com `resource`/`note` que mande re-chamar. */
function harvest(node: unknown, path: string, out: { path: string; ref: Ref }[], depth = 0): { path: string; ref: Ref }[] {
  if (depth > 7 || node === null || typeof node !== "object") return out;
  if (!Array.isArray(node)) {
    const o = node as Ref;
    if (typeof o["tool"] === "string" || typeof o["resource"] === "string") out.push({ path, ref: o });
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (v && typeof v === "object") harvest(v, `${path}.${k}`, out, depth + 1);
  }
  return out;
}

const RECALL = /re-?call|re-?corre|re-?chama|execute each|volta a chamar/i;

function violations(path: string, ref: Ref): string[] {
  const out: string[] = [];
  const tool = typeof ref["tool"] === "string" ? (ref["tool"] as string) : undefined;
  const note = typeof ref["note"] === "string" ? (ref["note"] as string) : "";
  const blob = JSON.stringify(ref);

  if (tool !== undefined) {
    if (!(tool in schemas)) {
      out.push(`${path}: tool inexistente/URI-no-campo-tool: "${tool}"`);
      return out;
    }
    const props = schemas[tool]!;
    const w = ref["with"];
    if (w && typeof w === "object" && !Array.isArray(w)) {
      for (const [k, v] of Object.entries(w as Record<string, unknown>)) {
        if (!(k in props)) out.push(`${path} → ${tool}: parâmetro "${k}" não existe no destino`);
        else if (props[k]!.enum && typeof v === "string" && !props[k]!.enum!.includes(v))
          out.push(`${path} → ${tool}: ${k}="${v}" fora do enum [${props[k]!.enum!.join("|")}]`);
      }
    }
    // listas estruturadas de chamadas (ex.: relations_ref.lenses[])
    for (const key of ["lenses", "calls"]) {
      const list = ref[key];
      if (!Array.isArray(list)) continue;
      for (const [i, callRaw] of list.entries()) {
        if (!callRaw || typeof callRaw !== "object") continue;
        for (const [k, v] of Object.entries(callRaw as Record<string, unknown>)) {
          if (!(k in props)) out.push(`${path}.${key}[${i}] → ${tool}: parâmetro "${k}" não existe no destino`);
          else if (props[k]!.enum && typeof v === "string" && !props[k]!.enum!.includes(v))
            out.push(`${path}.${key}[${i}] → ${tool}: ${k}="${v}" fora do enum`);
        }
      }
    }
  }

  // URIs: só executáveis por read_sbd_toe_resource — a tool tem de estar nomeada algures na referência.
  if (blob.includes("sbd://") && tool !== "read_sbd_toe_resource" && !note.includes("read_sbd_toe_resource"))
    out.push(`${path}: URI servido sem nomear read_sbd_toe_resource`);

  // uma referência que manda re-chamar tem de nomear a tool (campo ou nota).
  if (tool === undefined && RECALL.test(note) && !/[a-z_]+_sbd_toe[a-z_]*|prepare_sbd_toe_codegen_context/.test(note))
    out.push(`${path}: nota manda re-chamar sem nomear a tool ("${note.slice(0, 60)}…")`);

  return out;
}

describe("invariante beta — referências executáveis da dieta v2 e da tool SPARQL", () => {
  /** Regra r6: um URI entregue ao agente vem sempre com a tool que o executa NO MESMO objecto. */
  function uriViolations(node: unknown, path: string, out: string[], depth = 0): string[] {
    if (depth > 8 || node === null || typeof node !== "object") return out;
    if (!Array.isArray(node)) {
      const own = Object.values(node as Record<string, unknown>)
        .filter((v) => typeof v === "string")
        .join(" ");
      if (own.includes("sbd://") && !JSON.stringify(node).includes("read_sbd_toe_resource"))
        out.push(`${path}: URI servido sem nomear read_sbd_toe_resource no mesmo objecto`);
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>))
      if (v && typeof v === "object") uriViolations(v, `${path}.${k}`, out, depth + 1);
    return out;
  }

  it("nenhum URI dos payloads só-beta é servido sem a tool que o executa", () => {
    const task = "Implement a secure endpoint for uploading documents with logging";
    const all: string[] = [];
    for (const detail of ["full", "standard", "minimal", "ultrathin"] as const)
      uriViolations(handlePrepareCodegenContext({ task, risk_level: "L2", mode: "codegen", detail }), `prepare(${detail})`, all);
    expect(all, all.join("\n")).toEqual([]);
  });

  it("todas as referências dos payloads só-beta são executáveis verbatim", () => {
    const task = "Implement a secure endpoint for uploading documents with logging";
    const payloads: [string, unknown][] = [
      ...(["full", "standard", "minimal", "ultrathin"] as const).map(
        (detail) => [`prepare(${detail})`, handlePrepareCodegenContext({ task, risk_level: "L2", mode: "codegen", detail })] as [string, unknown]
      ),
      ["prepare(minimal,include_relations)", handlePrepareCodegenContext({ task, risk_level: "L2", mode: "codegen", detail: "minimal", include_relations: true })],
      ["prepare(standard,debug)", handlePrepareCodegenContext({ task, risk_level: "L2", mode: "codegen", detail: "standard", debug: true })],
      ["trace(slice)", handleTraceGraph({ lens: "slice_implementation", pageSize: 5 })],
      ["trace(objective)", handleTraceGraph({ lens: "objective_realization", pageSize: 5 })],
      ["trace(mechanism)", handleTraceGraph({ lens: "mechanism_provenance", pageSize: 5 })],
      ["trace(anchor vazio)", handleTraceGraph({ lens: "slice_implementation", anchor: "REQ-AGN-001", pageSize: 5 })],
      ["select", handleSelectRequirements({ risk_level: "L2", task: "Upload de ficheiros com autenticação" })],
      ["traceSources", handleTraceRequirementSources({ requirement_ids: ["FIL-002", "DEP-001"] })],
    ];
    const all: string[] = [];
    let checked = 0;
    for (const [name, payload] of payloads) {
      for (const { path, ref } of harvest(payload, name, [])) {
        checked += 1;
        all.push(...violations(path.replace(/\.\d+/g, "[]"), ref));
      }
    }
    expect(checked, "nenhuma referência colhida — o harvest partiu-se").toBeGreaterThanOrEqual(15);
    expect(all, all.join("\n")).toEqual([]);
  });
});
