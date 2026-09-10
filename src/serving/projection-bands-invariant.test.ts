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
import { declaredAbsences, absenceModel } from "./declared-absences.js";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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

  it("o roteiro cobre os 15 (travessia + piso) e a banda de omissão fica a ZERO, servida", async () => {
    /*
     * 0.20.0-beta.40 — o contrato desta invariante MUDOU e é isso que ela passa a guardar.
     * Na b.39 a cobertura era parcial e o que se exigia era a banda de omissão. Com a
     * travessia N:M da v2.6 já não há nada de fora: exige-se cobertura COMPLETA (14
     * atravessados + o capítulo de PISO, que não é ausência) e a banda de omissão a zero
     * — servida, e não apagada, para que a passagem a zero seja verificável.
     */
    const roll = (await tool("plan_sbd_toe_rollout", {}))["data"] as Record<string, unknown>;
    const totals = roll["totals"] as {
      chapters_traversed?: number;
      chapters_in_manual?: number;
      chapters_covered_including_floor?: number;
    };
    expect(totals?.chapters_in_manual, "o roteiro não diz sobre quantos capítulos projecta").toBeGreaterThan(0);
    expect(
      totals.chapters_covered_including_floor,
      "o roteiro deixou de cobrir os capítulos todos — travessia + piso tem de dar o total"
    ).toBe(totals.chapters_in_manual);
    const omit = roll["chapters_not_in_roadmap"] as { count?: number } | undefined;
    expect(omit, "a banda de omissão foi APAGADA — a zero tem de continuar servida, para ser verificável").toBeTruthy();
    expect(omit?.count, "voltou a haver capítulos fora do roteiro").toBe(0);
    const cov = roll["chapter_coverage"] as
      | { traversed?: number; floor?: { species?: string; is_absence?: boolean; chapter?: string } }
      | undefined;
    expect(cov?.floor?.chapter, "o capítulo de piso não é identificado").toBeTruthy();
    expect(cov?.floor?.species, "o piso não se declara como espécie própria").toBe("piso");
    expect(cov?.floor?.is_absence, "o piso está a ser servido como se fosse uma ausência").toBe(false);
    // as escolhas falsas do escalar editorial têm de estar desfeitas
    const phases = (roll["phases"] as { phase_id: string; chapters?: string[] }[]) ?? [];
    const design = phases.find((p) => p.phase_id === "design")?.chapters ?? [];
    const develop = phases.find((p) => p.phase_id === "develop")?.chapters ?? [];
    expect(design.some((c) => c.startsWith("04-")), "o `design` voltou a não atravessar a arquitectura segura").toBe(true);
    expect(develop.some((c) => c.startsWith("06-")), "o `develop` voltou a não atravessar o desenvolvimento seguro").toBe(true);
  }, 20000);

  it("uma contagem de RELAÇÃO nunca é servida como total", async () => {
    const cap = await tool("get_sbd_toe_chapter_capability", { chapter: "01-classificacao-aplicacoes" });
    const art = cap["artifacts"] as Record<string, unknown> | undefined;
    expect(art, "a vista de capacidade deixou de servir artefactos").toBeTruthy();
    expect(Object.keys(art ?? {}), "voltou a servir `total`/`mandatory` sobre uma relação").not.toContain("total");
    expect(Object.keys(art ?? {})).not.toContain("mandatory");
    expect(art?.["content_type"], "a junção não se declara derivada").toBe("derived");
    // 0.20.0-beta.46: a base da citação passou a chamar-se `cited_by` (G1) — o nome antigo
    // trazia o verbo da vizinha e saiu com ele.
    const rel = (art?.["bases"] as Record<string, Record<string, unknown>>)?.["cited_by"];
    expect(String(rel?.["source_declares"] ?? ""), "a proibição da própria fonte não é servida verbatim").toMatch(
      /never for totals/i
    );
  }, 20000);

  it("o tipo da ausência VEM DO ÍNDICE — nenhuma superfície o carimba", () => {
    /*
     * 0.20.0-beta.40 — a regra de ouro do modelo de ausências: `out_of_scope` SÓ o programme
     * lead atribui, e é isso que impede uma lacuna incómoda de virar fronteira por
     * conveniência. Uma superfície que escrevesse o tipo à mão fazia exactamente o que o
     * modelo existe para impedir — por isso o literal só pode viver no módulo do índice.
     */
    const model = absenceModel();
    expect(Object.keys(model?.values ?? {}).sort(), "o modelo de ausências desapareceu da fonte").toEqual([
      "deferred",
      "elsewhere",
      "gap",
      "out_of_scope"
    ]);
    expect(declaredAbsences().length, "o índice central veio vazio — a sonda ou a fonte partiram").toBeGreaterThan(5);
    const root = process.cwd();
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel, out);
        else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) out.push(rel);
      }
      return out;
    };
    const offenders: string[] = [];
    for (const file of walk("src")) {
      if (file.endsWith("serving/declared-absences.ts")) continue; // é o índice: é lá que os valores vivem
      const text = readFileSync(join(root, file), "utf-8");
      // um literal de tipo ATRIBUÍDO (não citado em prosa) fora do módulo do índice
      for (const m of text.matchAll(/absence_type\s*:\s*["'`](gap|out_of_scope|deferred|elsewhere)["'`]/g))
        offenders.push(`${relative(root, join(root, file))}: absence_type: "${m[1]}"`);
    }
    expect(offenders, `tipo de ausência carimbado pela superfície:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("as bandas de ausência servidas trazem a espécie, e cada espécie a sua consequência", async () => {
    const cases: [string, Record<string, unknown>, (p: Record<string, unknown>) => unknown][] = [
      ["get_guide_by_role", { risk_level: "L2", role: "fornecedores-terceiros" }, (p) => (p["unsupported_role"] as Record<string, unknown>)?.["absence"]],
      ["get_sbd_toe_playbook", { framework: "PCI-DSS" }, (p) => p["absence"]],
      // 0.20.0-beta.41: a banda fundiu-se com o limite — era servida ao LADO do rótulo local
      // `unpublished_gap`, e a resposta dizia lacuna e fronteira ao mesmo tempo. Agora há uma
      // só declaração, e é aqui que ela vive.
      ["get_sbd_toe_macro_processes", {}, (p) => (p["declared_limits"] as Record<string, unknown>)?.["sdlc_phase_traversal"]]
    ];
    const seen = new Set<string>();
    for (const [name, args, pick] of cases) {
      const band = pick(await tool(name, args)) as
        | { absence_type?: string; is_debt?: boolean; is_boundary?: boolean; what_it_means?: string; absence_id?: string }
        | undefined;
      expect(band, `${name}: serve um vazio sem dizer de que espécie é`).toBeTruthy();
      expect(band?.absence_type, `${name}: espécie ausente`).toBeTruthy();
      expect(band?.what_it_means, `${name}: a espécie vem sem consequência para o consumidor`).toBeTruthy();
      // dívida e fronteira são exclusivas: nunca as duas, nunca nenhuma quando há id
      /*
       * 0.20.0-beta.48 — a exclusividade dívida/fronteira valia enquanto os estados eram
       * `open`/`closed`. Com `withdrawn` (KG v1.12.0) uma ausência pode ser NENHUM DOS DOIS:
       * a premissa era errada, não há dívida e não é fronteira. O que continua proibido é ser
       * as DUAS ao mesmo tempo — isso era o defeito da b.41.
       */
      const b2 = band as { is_debt?: boolean; is_boundary?: boolean; status?: string } | undefined;
      if (b2?.absence_id !== undefined || b2?.status !== undefined)
        expect(b2?.is_debt === true && b2?.is_boundary === true, `${name}: dívida E fronteira ao mesmo tempo`).toBe(false);
      // e uma ausência liquidada (fechada ou retirada) nunca é dívida em aberto
      if (b2?.status === "closed" || b2?.status === "withdrawn")
        expect(b2?.is_debt, `${name}: ausência ${b2.status} servida como dívida em aberto`).toBe(false);
      if (band?.absence_type !== undefined) seen.add(band.absence_type);
    }
    // controlo positivo: as três superfícies têm de mostrar ESPÉCIES DIFERENTES, senão a
    // tipagem não está a discriminar nada e o teste passaria em vazio.
    expect(seen.size, `as três ausências vieram todas do mesmo tipo (${[...seen].join(",")})`).toBeGreaterThanOrEqual(3);
    /*
     * 0.20.0-beta.41 — e NENHUMA pode ser as duas coisas. Era o único sítio do servidor onde
     * uma ausência era lacuna E fronteira: o rótulo local da fonte servido ao lado da tipagem
     * do índice. Um rótulo superseded vive DENTRO da banda, como história, nunca ao lado dela
     * como um segundo veredicto.
     */
    for (const [name, args, pick] of cases) {
      const band = pick(await tool(name, args)) as { is_debt?: boolean; is_boundary?: boolean } | undefined;
      expect(band?.is_debt === true && band?.is_boundary === true, `${name}: dívida E fronteira ao mesmo tempo`).toBe(false);
    }
  }, 30000);

  it("cada base traz a SUA asserção — nenhuma partilha a da vizinha", async () => {
    /*
     * 0.20.0-beta.46 (G1) — a classe do defeito, não a instância. O `chapter_relation`
     * publicava a asserção da base vizinha e por isso resolvia `verb: produced_or_operated_by`
     * para 31 artefactos quando só 7 o produzem. **Um bug num guarda-corpo é pior do que a
     * ausência de guarda-corpo, porque é lido como garantia.**
     *
     * Guarda: duas bases da mesma banda nunca podem trazer o mesmo `verb` publicado. E uma
     * base sem asserção na fonte tem de o DIZER (`published: false`), nunca herdar uma.
     */
    const cap = await tool("get_sbd_toe_chapter_capability", { chapter: "01-classificacao-aplicacoes" });
    const bases = (cap["artifacts"] as { bases?: Record<string, { asserts?: { verb?: string; published?: boolean } }> } | undefined)?.bases;
    expect(bases, "a vista de capacidade deixou de servir bases").toBeTruthy();
    const withAssert = Object.entries(bases ?? {}).filter(([, v]) => v?.asserts !== undefined);
    expect(withAssert.length, "nenhuma base traz asserção — a sonda ou a superfície partiram").toBeGreaterThan(1);
    const published = withAssert.filter(([, v]) => v.asserts?.published === true).map(([k, v]) => [k, v.asserts?.verb] as const);
    const verbs = published.map(([, verb]) => verb);
    expect(
      verbs.length,
      `duas bases publicam o MESMO verbo: ${published.map(([k, v]) => `${k}=${v}`).join(", ")}`
    ).toBe(new Set(verbs).size);
    // e a base sem asserção na fonte declara-o em vez de herdar
    for (const [name, v] of withAssert)
      if (v.asserts?.published === false)
        expect(String(v.asserts.verb), `${name}: sem asserção publicada mas com verbo aparente`).not.toMatch(
          /^(produced_or_operated_by|required_as_evidence_by|define|atravessa|consome)$/
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
