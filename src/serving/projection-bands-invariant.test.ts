/**
 * 0.20.0-beta.39 — INVARIANTES DAS SUPERFÍCIES DE PROJECÇÃO.
 *
 * A tese que originou a vaga: **as bandas de silêncio existiam onde o servidor CALCULA e
 * faltavam onde PROJECTA.** `select`/`consult`/`playbook` eram exemplares; `rollout`,
 * `operating_model`, `search` e `chapter_capability` afirmavam ou omitiam sem declarar.
 * Estes testes fecham a CLASSE, não as três instâncias:
 *
 *   1. O `next` nunca contradiz uma banda da própria resposta — verificado sobre o SERVIDOR
 *      VIVO, porque a reconciliação vive no `sendResponse` e é aí que tem de valer.
 *   2. A autoridade de uma fonte é a MESMA em todas as superfícies que a servem. Foi ao
 *      divergir daqui que o `operating_model` promoveu material ilustrativo a canónico.
 *   3. Uma projecção parcial declara o que ficou de fora.
 *   4. Uma contagem de RELAÇÃO nunca é servida como total (a fonte proíbe-o por escrito).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { reconcileNextWithBands } from "./next-band-reconciliation.js";

type Rpc = { result?: { content?: { type: string; text: string }[]; tools?: { name: string }[] } };
let server: ChildProcess | null = null;
let call: (method: string, params: unknown) => Promise<Rpc>;
let toolNames: string[] = [];

async function tool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await call("tools/call", { name, arguments: args });
  const text = r.result?.content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { _text: text };
  }
}

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build` antes da suite").toBe(true);
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
        /* stderr vai à parte; linhas parciais ignoram-se */
      }
    }
  });
  call = (method, params) =>
    new Promise<Rpc>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "bands", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = await call("tools/list", {});
  toolNames = (t.result?.tools ?? []).map((x) => x.name);
  expect(toolNames.length, "inventário vivo vazio — a sonda partiu").toBeGreaterThan(20);
}, 30000);

afterAll(() => server?.kill());

describe("invariante beta.39 — o `next` lê as bandas da resposta que o transporta", () => {
  it("uma resposta com banda negativa não oferece um `next` que a contradiga (servidor vivo)", async () => {
    // Casos que PRODUZEM banda negativa. Se algum deixar de a produzir, o teste diz-o em vez
    // de passar em vazio — é o controlo positivo do costume.
    const cases: [string, Record<string, unknown>, string][] = [
      ["get_guide_by_role", { risk_level: "L2", role: "fornecedores-terceiros" }, "unsupported_role"],
      ["get_sbd_toe_macro_processes", { mp_id: "MP-99" }, "unknown_macro_process"]
    ];
    for (const [name, args, expectedBand] of cases) {
      if (!toolNames.includes(name)) continue;
      const payload = await tool(name, args);
      const text = JSON.stringify(payload);
      expect(text, `${name}: deixou de produzir a banda ${expectedBand} — o caso ficou sem controlo`).toContain(
        expectedBand
      );
      // O servidor já reconciliou: aplicar de novo não pode encontrar nada por retirar.
      expect(
        reconcileNextWithBands(payload),
        `${name}: o \`next\` servido ainda contradiz uma banda da própria resposta`
      ).toBe(false);
    }
  }, 30000);

  it("a retirada é DECLARADA, nunca silenciosa", async () => {
    const payload = await tool("get_guide_by_role", { risk_level: "L2", role: "fornecedores-terceiros" });
    const withheld = payload["next_withheld"] as { count?: number; values?: { contradicts_band?: string }[] } | undefined;
    expect(withheld?.count, "uma sugestão foi retirada e não foi declarada").toBeGreaterThan(0);
    expect(withheld?.values?.[0]?.contradicts_band, "a retirada não nomeia a banda que a bloqueou").toBeTruthy();
  }, 20000);
});

describe("invariante beta.39 — autoridade e projecção parcial", () => {
  it("a mesma fonte tem a MESMA autoridade em todas as superfícies que a servem", async () => {
    const om = await tool("get_sbd_toe_operating_model", {});
    const authority = (om["data"] as Record<string, unknown> | undefined)?.["authority"] as
      | { authority_class?: string[]; adoption_status?: string[]; tier?: string }
      | undefined;
    expect(authority, "o operating_model serve o bundle `exemplo-playbook` sem declarar autoridade").toBeTruthy();
    // O `get_sbd_toe_playbook` é a superfície de referência para esta fonte.
    const pb = await tool("get_sbd_toe_playbook", { playbook_id: "OVR-EXEMPLO-PLAYBOOK-exemplo-raci-governance" });
    const ref = (pb["playbook"] as Record<string, unknown> | undefined)?.["authority"] as
      | { authority_class?: string; adoption_status?: string; tier?: string }
      | undefined;
    expect(ref, "fixture mudou: o playbook de referência deixou de declarar autoridade").toBeTruthy();
    expect(authority?.tier, "as duas superfícies discordam sobre o TIER da mesma fonte").toBe(ref?.tier);
    expect(
      authority?.authority_class,
      "as duas superfícies discordam sobre a authority_class da mesma fonte"
    ).toContain(ref?.authority_class);
    expect(
      authority?.adoption_status,
      "as duas superfícies discordam sobre o adoption_status da mesma fonte"
    ).toContain(ref?.adoption_status);
    expect(authority?.tier, "a fonte é ilustrativa e a superfície não o diz").toBe("illustrative");
  }, 20000);

  it("uma projecção PARCIAL declara o que ficou de fora, com como lá chegar", async () => {
    const roll = (await tool("plan_sbd_toe_rollout", {}))["data"] as Record<string, unknown>;
    const totals = roll["totals"] as { chapters_covered?: number; chapters_in_manual?: number };
    expect(totals?.chapters_in_manual, "o roteiro não diz sobre quantos capítulos projecta").toBeGreaterThan(0);
    if ((totals.chapters_covered ?? 0) < (totals.chapters_in_manual ?? 0)) {
      const band = roll["chapters_not_in_roadmap"] as
        | { count?: number; mandatory_at_some_level?: number; chapters?: { reach_with?: string }[] }
        | undefined;
      expect(band?.count, "cobertura parcial sem banda de omissão — o silêncio que a vaga veio fechar").toBeGreaterThan(0);
      expect(
        band?.chapters?.every((c) => typeof c.reach_with === "string" && c.reach_with.includes("(")),
        "a banda de omissão não dá caminho CONCRETO por capítulo"
      ).toBe(true);
      expect(band?.mandatory_at_some_level, "a banda não diz quantos dos omitidos são obrigatórios").toBeGreaterThan(0);
    }
  }, 20000);

  it("uma contagem de RELAÇÃO nunca é servida como total", async () => {
    const cap = await tool("get_sbd_toe_chapter_capability", { chapter: "01-classificacao-aplicacoes" });
    const art = cap["artifacts"] as Record<string, unknown> | undefined;
    expect(art, "a vista de capacidade deixou de servir artefactos").toBeTruthy();
    expect(Object.keys(art ?? {}), "voltou a servir `total`/`mandatory` sobre uma relação").not.toContain("total");
    expect(Object.keys(art ?? {})).not.toContain("mandatory");
    expect(art?.["content_type"], "a junção não se declara derivada").toBe("derived");
    const rel = (art?.["bases"] as Record<string, Record<string, unknown>>)?.["chapter_relation"];
    expect(String(rel?.["source_declares"] ?? ""), "a proibição da própria fonte não é servida verbatim").toMatch(
      /never for totals/i
    );
  }, 20000);

  it("a recuperação declara o que da pergunta NÃO tem âncora no corpus", async () => {
    const r = await call("tools/call", {
      name: "search_sbd_toe_manual",
      arguments: { question: "segurança física dos datacenters e controlo de acesso às instalações", topK: 3 }
    });
    const text = r.result?.content?.[0]?.text ?? "";
    expect(text, "o search deixou de marcar que é recuperação e não âmbito").toMatch(/RECUPERAÇÃO, NÃO ÂMBITO/);
    expect(text, "termos sem âncora no corpus não são declarados").toMatch(/SEM ÂNCORA NO MANUAL/);
    expect(text, "os termos concretos que não ocorrem no Manual não são nomeados").toMatch(/datacenters/);
  }, 60000);
});
