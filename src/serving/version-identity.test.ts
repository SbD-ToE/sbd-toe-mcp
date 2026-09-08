/**
 * 0.20.0-beta.46 (G5) — IDENTIDADE DE VERSÃO, verificada em vez de prometida.
 *
 * Três rondas de auditoria pediram isto, e a terceira foi a primeira em que PIOROU: numa
 * sessão conviviam três versões de Manual e duas de ontologia, e uma nota de superfície dizia
 * «ontologia v2.5 × Manual v1.8.1» com o pino em v1.9.0. O conteúdo não estava
 * desactualizado — o RÓTULO é que mentia. **Só se soube indo à fonte, e um consumidor não
 * pode ir à fonte.**
 *
 * `sbd://toe/version` é a autoridade. Este teste varre o que as superfícies servem e falha se
 * alguma disser uma versão de Manual diferente da dele — incluindo prosa. Não normaliza
 * discrepâncias do PINO (o `substrate_version` vs o `release_tag` é do bundle e reporta-se a
 * montante); guarda o que é nosso: nunca escrever uma versão à mão numa resposta.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

type Rpc = {
  result?: {
    content?: { type: string; text: string }[];
    contents?: { text: string }[];
    tools?: { name: string; description?: string }[];
  };
};
let server: ChildProcess | null = null;
let call: (method: string, params: unknown) => Promise<Rpc>;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: Rpc) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const m = JSON.parse(line) as Rpc & { id?: number };
        if (m.id !== undefined) pending.get(m.id)?.(m);
      } catch {
        /* linhas parciais */
      }
    }
  });
  call = (method, params) =>
    new Promise<Rpc>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "version-identity", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
}, 30000);

afterAll(() => server?.kill());

/** Versões de Manual citadas num texto: `v1.8.1`, `Manual v1.9.0`, `manual-v1.8.1`… */
function manualVersionsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/(?:manual[\s-]*)v?(\d+\.\d+\.\d+)/gi)].map((m) => m[1] ?? ""))].filter(Boolean);
}

describe("identidade de versão — `sbd://toe/version` é a autoridade", () => {
  it("nenhuma superfície serve uma versão de Manual diferente da autoritativa", async () => {
    const v = await call("resources/read", { uri: "sbd://toe/version" });
    const version = JSON.parse(v.result?.contents?.[0]?.text ?? "{}") as { manual?: { version?: string } };
    const authoritative = version.manual?.version;
    expect(authoritative, "`sbd://toe/version` não declara a versão do Manual").toBeTruthy();

    const listed = await call("tools/list", {});
    const tools = listed.result?.tools ?? [];
    expect(tools.length, "inventário vivo vazio — a sonda partiu").toBeGreaterThan(20);

    const divergences: string[] = [];
    // (a) as DESCRIÇÕES, que são contrato e são lidas antes de qualquer chamada
    for (const t of tools)
      for (const found of manualVersionsIn(String(t.description ?? "")))
        if (found !== authoritative) divergences.push(`descrição de ${t.name}: v${found}`);

    // (b) as RESPOSTAS das superfícies que citam substrato na prosa
    const probes: [string, Record<string, unknown>][] = [
      ["get_sbd_toe_macro_processes", {}],
      ["get_sbd_toe_chapter_capability", { chapter: "07-cicd-seguro" }],
      ["select_sbd_toe_requirements", { risk_level: "L2", concerns: ["auth"], detail: "minimal" }],
      ["get_guide_by_role", { risk_level: "L2", role: "developer" }],
      ["plan_sbd_toe_rollout", {}]
    ];
    for (const [name, args] of probes) {
      if (!tools.some((t) => t.name === name)) continue;
      const r = await call("tools/call", { name, arguments: args });
      const text = r.result?.content?.[0]?.text ?? "";
      for (const found of manualVersionsIn(text))
        if (found !== authoritative) divergences.push(`resposta de ${name}: v${found}`);
    }

    expect(
      divergences,
      `versões de Manual divergentes da autoritativa (v${authoritative}):\n  ${divergences.join("\n  ")}`
    ).toEqual([]);
  }, 60000);

  it("a versão do servidor é a mesma em `sbd://toe/version` e na proveniência das respostas", async () => {
    const v = await call("resources/read", { uri: "sbd://toe/version" });
    const version = JSON.parse(v.result?.contents?.[0]?.text ?? "{}") as { version?: string };
    const r = await call("tools/call", { name: "get_sbd_toe_macro_processes", arguments: {} });
    const payload = JSON.parse(r.result?.content?.[0]?.text ?? "{}") as { provenance?: { server?: string } };
    expect(payload.provenance?.server, "a proveniência não declara a versão do servidor").toBeTruthy();
    expect(payload.provenance?.server, "o servidor diz uma versão no recurso e outra na resposta").toBe(version.version);
  }, 30000);
});
