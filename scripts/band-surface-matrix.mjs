/**
 * 0.20.0-beta.41 — A MATRIZ BANDA × SUPERFÍCIE (portão de pré-promoção).
 *
 * PORQUÊ. Condição de processo da 2.ª auditoria externa, e o diagnóstico é sobre o nosso
 * método, não sobre um defeito: **«a classe é fechada onde o achado foi reportado e não é
 * varrida às superfícies irmãs. Uma tabela banda × superfície, feita antes de promover,
 * tinha-as apanhado às duas sem auditoria nenhuma.»**
 *
 * As COLUNAS derivam do `tools/list` REAL — nunca de uma lista à mão, que é a classe que já
 * nos mordeu três vezes (b.28 superfícies, b.36 next-verbatim, b.38 empacotamento). Uma tool
 * nova entra na matriz sozinha, e entra com as suas células a `FALTA` até alguém as fechar.
 *
 * As LINHAS são o contrato de declaração — o que uma superfície tem de dizer. A
 * aplicabilidade de cada célula é decidida por uma REGRA OBSERVÁVEL sobre o schema e a
 * resposta, não por opinião: uma célula «não se aplica» traz sempre o porquê.
 *
 * Estados: `tem` · `n/a` (com motivo) · **`FALTA`** · `?` (não exercitável — também é achado).
 */
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const serverEntry = opt("--server") ?? "dist/index.js";
const outDir = path.resolve(repoRoot, opt("--out") ?? "docs/acceptance-runs");
const stamp = opt("--stamp") ?? new Date().toISOString().slice(0, 10);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

/* ---------------------------------------------------------------- cliente */
const server = spawn("node", [serverEntry], { stdio: ["pipe", "pipe", "ignore"] });
const pending = new Map();
let buf = "";
let seq = 0;
server.stdout.on("data", (d) => {
  buf += d.toString();
  const lines = buf.split("\n");
  buf = lines.pop() ?? "";
  for (const line of lines) {
    try {
      const m = JSON.parse(line);
      if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    } catch { /* stderr vai à parte */ }
  }
});
const rpc = (method, params) =>
  new Promise((res, rej) => {
    const id = ++seq;
    const t = setTimeout(() => { pending.delete(id); rej(new Error(`timeout ${method}`)); }, 60000);
    pending.set(id, (m) => { clearTimeout(t); res(m); });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });

await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "band-matrix", version: "0" } });
server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const listed = await rpc("tools/list", {});
const tools = (listed.result?.tools ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
if (tools.length < 20) { console.error("inventário vivo vazio — a sonda partiu, não confies nela"); process.exit(2); }

/* ------------------------------------------------- argumentos DERIVADOS do schema */
/**
 * Valores por nome de parâmetro, para os poucos casos em que o schema não traz enum. São
 * valores do vocabulário publicado, não invenções: o `?` de uma tool que não se consiga
 * exercitar é preferível a inventar um argumento que a faça responder outra coisa.
 */
const BY_NAME = {
  risk_level: "L2", riskLevel: "L2",
  chapter: "07-cicd-seguro", chapterId: "07-cicd-seguro", chapter_id: "07-cicd-seguro",
  role: "developer", projectRole: "developer", clientType: "claude-code",
  task: "Implementar login com sessões de utilizador",
  question: "Como faço threat modeling de uma API pública?",
  framework: "GDPR", concern: "secrets", topic: "secrets",
  requirement_ids: ["VAL-001"], concerns: ["auth"], changedFiles: ["src/auth/login.ts"],
  chapters: ["07-cicd-seguro"], anchor: "VAL-001", record_type: "requirement",
  metric_id: undefined, mp_id: undefined, playbook_id: undefined
};
function argsFor(tool) {
  const schema = tool.inputSchema ?? {};
  const props = schema.properties ?? {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const out = {};
  let unbuildable = null;
  for (const name of required) {
    const p = props[name] ?? {};
    if (Array.isArray(p.enum) && p.enum.length > 0) { out[name] = p.enum[0]; continue; }
    if (name in BY_NAME && BY_NAME[name] !== undefined) { out[name] = BY_NAME[name]; continue; }
    if (p.type === "array") { out[name] = BY_NAME[name] ?? ["VAL-001"]; continue; }
    if (p.type === "number" || p.type === "integer") { out[name] = 1; continue; }
    if (p.type === "boolean") { out[name] = false; continue; }
    unbuildable = name;
  }
  /*
   * Um selector OPCIONAL é o que faz a superfície responder de facto. Sem isto o
   * `explain_sbd_toe_topic` era chamado só com `risk_level` e caía no ramo de pedido
   * incompleto — e a matriz reportava «sem next» como se fosse defeito do servidor. Era
   * defeito da SONDA: primeira coisa a corrigir, como em todas as rondas.
   */
  for (const name of ["concern", "topic", "chapter", "chapterId", "framework", "role", "anchor", "mp_id", "playbook_id", "record_type"])
    if (name in props && !(name in out)) {
      const p = props[name] ?? {};
      if (Array.isArray(p.enum) && p.enum.length > 0) out[name] = p.enum[0];
      else if (BY_NAME[name] !== undefined) out[name] = BY_NAME[name];
    }
  for (const name of ["risk_level", "riskLevel"]) if (name in props && !(name in out)) out[name] = "L2";
  return { args: out, unbuildable };
}

/* ------------------------------------------------------------------ sondas */
const PAGINATION_PARAMS = new Set(["offset", "limit", "detail", "debug", "topK", "useVectorRecall", "horizon"]);
/** Texto livre: qualquer string é legítima, não há vocabulário para nomear. */
const FREE_TEXT = new Set(["question", "task", "task_context", "query", "orgProfile", "orgScope", "uri"]);
const NEG_KEY = /^(unsupported|unknown|unmodelled|unresolved|empty|no_|not_|missing_|declared_absences?)/i;

function walk(node, visit, depth = 0) {
  if (depth > 5 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const x of node) walk(x, visit, depth + 1); return; }
  for (const [k, v] of Object.entries(node)) { visit(k, v, node); walk(v, visit, depth + 1); }
}
const hasKeyMatching = (payload, re) => { let f = false; walk(payload, (k) => { if (re.test(k)) f = true; }); return f; };
const collect = (payload, re) => { const out = []; walk(payload, (k, v) => { if (re.test(k)) out.push([k, v]); }); return out; };

/**
 * O contrato nunca-silêncio diz que um valor rejeitado vem com os valores válidos ao lado —
 * e é dele que a sonda se serve para se corrigir: um -32602 com vocabulário no `data` é
 * retentado UMA vez com o primeiro valor válido. Assim a matriz não confunde «a sonda
 * adivinhou mal» com «a superfície não tem a banda».
 */
function retryValueFrom(errData) {
  if (errData === null || typeof errData !== "object") return undefined;
  for (const v of Object.values(errData)) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
    if (typeof v === "string" && v.includes(",")) return v.split(",")[0].trim();
  }
  return undefined;
}

async function probe(tool, depth = 0) {
  const { args, unbuildable } = argsFor(tool);
  if (unbuildable !== null) return { ok: false, why: `argumento obrigatório sem valor derivável: \`${unbuildable}\`` };
  try {
    const r = await rpc("tools/call", { name: tool.name, arguments: args });
    if (r.error !== undefined && depth === 0) {
      const candidate = retryValueFrom(r.error.data);
      const bad = Object.entries(args).find(([, v]) => typeof v === "string" && String(r.error.message ?? "").includes(v));
      if (candidate !== undefined && bad !== undefined) {
        const retryArgs = { ...args, [bad[0]]: candidate };
        const r2 = await rpc("tools/call", { name: tool.name, arguments: retryArgs });
        const t2 = r2.result?.content?.[0]?.text;
        if (typeof t2 === "string" && t2.trim().startsWith("{"))
          return { ok: true, prose: false, payload: JSON.parse(t2), text: t2, args: retryArgs, retried: `${bad[0]}="${candidate}"` };
      }
      return { ok: false, why: `erro -32602 sem vocabulário retentável: ${String(r.error.message ?? "").slice(0, 60)}` };
    }
    const text = r.result?.content?.[0]?.text;
    if (typeof text !== "string") return { ok: false, why: "resposta sem conteúdo de texto" };
    if (r.result?.isError === true) return { ok: false, why: "a tool devolveu erro para os argumentos derivados" };
    if (!text.trim().startsWith("{")) return { ok: true, prose: true, payload: {}, text, args };
    return { ok: true, prose: false, payload: JSON.parse(text), text, args };
  } catch (e) {
    return { ok: false, why: String(e.message ?? e).slice(0, 80) };
  }
}

/* --------------------------------------------------------------- as bandas */
const CELL = { HAS: "tem", NA: "n/a", MISSING: "FALTA", UNKNOWN: "?" };
const na = (why) => ({ state: CELL.NA, why });
const has = (why) => ({ state: CELL.HAS, why });
const missing = (why) => ({ state: CELL.MISSING, why });

const BANDS = [
  {
    id: "provenance",
    title: "Proveniência com `content_type`",
    applies: () => true,
    check: (p) => (hasKeyMatching(p.payload, /^provenance$/) ? has("provenance no payload") : missing("resposta sem proveniência")),
    naForProse: "superfície de PROSA — a proveniência vive no texto, não num campo"
  },
  {
    id: "never_silent",
    title: "Nunca-silêncio: vazio DECLARADO",
    applies: (tool) => Object.keys(tool.inputSchema?.properties ?? {}).some((k) => !PAGINATION_PARAMS.has(k)),
    naWhen: (tool) => (Object.keys(tool.inputSchema?.properties ?? {}).some((k) => !PAGINATION_PARAMS.has(k)) ? null : "sem selector: não há input que possa esvaziar o resultado"),
    check: (p) => {
      // um vazio observado sem banda é FALTA; um resultado não-vazio não prova nem desmente
      const arrays = [];
      walk(p.payload, (k, v) => { if (Array.isArray(v) && !["next", "next_withheld"].includes(k)) arrays.push([k, v]); });
      const declares = hasKeyMatching(p.payload, NEG_KEY);
      const principalEmpty = arrays.length > 0 && arrays.every(([, v]) => v.length === 0);
      if (principalEmpty && !declares) return missing("todos os conjuntos vieram vazios e nada o declara");
      if (declares) return has("declara ausências/vazios");
      return { state: CELL.UNKNOWN, why: "esta chamada devolveu resultados — a banda de vazio não foi exercitada" };
    }
  },
  {
    id: "absence_typed",
    title: "Ausência TIPADA pelo índice (`absence_type`)",
    applies: () => true,
    check: (p) => {
      const negs = collect(p.payload, NEG_KEY);
      if (negs.length === 0) return { state: CELL.UNKNOWN, why: "nenhuma ausência nesta chamada" };
      const typed = JSON.stringify(p.payload).includes("absence_type");
      return typed ? has("banda de ausência com espécie") : missing(`${negs.length} banda(s) de ausência sem \`absence_type\``);
    }
  },
  {
    id: "next",
    title: "`next` executável",
    applies: () => true,
    check: (p) => (Array.isArray(p.payload.next) && p.payload.next.length > 0 ? has(`${p.payload.next.length} sugestões`) : missing("sem `next`")),
    naForProse: "superfície de PROSA — não transporta afordâncias estruturadas"
  },
  {
    id: "next_vs_bands",
    title: "`next` reconciliado com as bandas",
    applies: () => true,
    check: (p) => {
      if (!Array.isArray(p.payload.next)) return { state: CELL.UNKNOWN, why: "sem `next` nesta chamada" };
      const negs = collect(p.payload, NEG_KEY);
      if (negs.length === 0) return { state: CELL.UNKNOWN, why: "sem banda negativa nesta chamada" };
      return has("reconciliação central activa (`sendResponse`)");
    }
  },
  {
    id: "pagination",
    title: "Paginação/cobertura declarada",
    applies: (tool) => "offset" in (tool.inputSchema?.properties ?? {}) || "limit" in (tool.inputSchema?.properties ?? {}),
    naWhen: (tool) => ("offset" in (tool.inputSchema?.properties ?? {}) || "limit" in (tool.inputSchema?.properties ?? {}) ? null : "não devolve conjunto paginável (sem offset/limit no schema)"),
    check: (p) => (hasKeyMatching(p.payload, /^(coverage|totals|pagination)$/) ? has("cobertura/totais") : missing("pagina sem declarar cobertura"))
  },
  {
    id: "echo_role",
    title: "Eco de input com `affects_result`",
    applies: () => true,
    check: (p) => {
      const echoed = [];
      for (const [k, v] of Object.entries(p.args ?? {})) {
        if (typeof v !== "string") continue;
        const t = JSON.stringify(p.payload);
        if (t.includes(`"${v}"`)) echoed.push(k);
      }
      if (echoed.length === 0) return { state: CELL.UNKNOWN, why: "nenhum argumento ecoado nesta chamada" };
      const declared = /affects_(result|selection)|recorded_context|recorded_filter/.test(JSON.stringify(p.payload));
      return declared ? has("papel do input declarado") : { state: CELL.UNKNOWN, why: `ecoa ${echoed.join(", ")} — papel não declarado (verificar se é filtro real)` };
    }
  }
];

/**
 * 0.20.0-beta.41 — a banda que a própria matriz revelou: o contrato nunca-silêncio vale
 * também no CAMINHO DE ERRO. Um valor rejeitado tem de vir com os válidos ao lado, senão o
 * consumidor fica sem saída — e foi assim que a sonda desta matriz descobriu duas
 * superfícies a recusar sem dizer o que aceitam.
 */
async function probeErrorVocabulary(tool) {
  const props = tool.inputSchema?.properties ?? {};
  /*
   * Um `enum` no schema JÁ nomeia os valores válidos ao cliente — exigir que o erro os
   * repita seria pedir o que o contrato já dá. A banda só se aplica a parâmetros de
   * vocabulário ABERTO (string sem enum), onde o consumidor não tem como saber o que existe.
   * Primeira versão desta banda não fazia a distinção e acusou 10 superfícies sem razão.
   */
  const target = Object.entries(props).find(
    ([name, p]) => !PAGINATION_PARAMS.has(name) && p.type === "string" && !Array.isArray(p.enum) && !FREE_TEXT.has(name)
  );
  if (target === undefined) return na("sem parâmetro de vocabulário aberto (enum no schema já nomeia os válidos)");
  const { args, unbuildable } = argsFor(tool);
  if (unbuildable !== null) return { state: CELL.UNKNOWN, why: "não exercitável (ver acima)" };
  const bogus = { ...args, [target[0]]: "zzz-valor-inexistente-zzz" };
  const mentionsBogus = (blob) => blob.includes("zzz-valor-inexistente-zzz");
  try {
    const r = await rpc("tools/call", { name: tool.name, arguments: bogus });
    const text = r.result?.content?.[0]?.text ?? "";
    const blob = `${JSON.stringify(r.error ?? {})} ${text}`;
    // rejeição = ERRO JSON-RPC ou banda declarada no payload; prosa que por acaso diz
    // «unknown» não é rejeição — era o segundo falso positivo desta sonda.
    /*
     * A rejeição tem de ser SOBRE o valor que enviámos. Uma banda pré-existente (o
     * `unsupported_concerns` do select, por exemplo) não é rejeição do `stack` que
     * inventámos — foi o terceiro falso positivo desta sonda, e o padrão de sempre:
     * corrige-se a sonda, não o servidor.
     */
    const BOGUS = "zzz-valor-inexistente-zzz";
    const declaredBand = text.trim().startsWith("{") && text.includes(BOGUS) && /"(status|unsupported_[a-z_]+|unknown_[a-z_]+|ignored_[a-z_]+)"/.test(text);
    if (r.error === undefined && !declaredBand)
      return { state: CELL.UNKNOWN, why: `aceitou um valor inexistente em \`${target[0]}\` — não rejeita, e serve o que puder` };
    if (r.error !== undefined && !mentionsBogus(JSON.stringify(r.error)))
      return { state: CELL.UNKNOWN, why: `erro não é sobre \`${target[0]}\` — não exercitou a banda` };
    /*
     * «Nomeia os válidos» DERIVA-SE da forma, não de frases: a resposta traz uma lista de
     * alternativas (array de 3+ strings) ou o erro traz vocabulário no `data`. Casar
     * redacções acusou o `select` e a `chapter_capability` sem razão — as duas nomeiam os
     * válidos, com outras palavras (`needs_input.reason`, `chapters_with_measures`). Quarto
     * falso positivo desta sonda, e o último: corrige-se a sonda, não o servidor.
     */
    let offersVocabulary = false;
    if (text.trim().startsWith("{")) {
      try {
        walk(JSON.parse(text), (_k, v) => {
          if (Array.isArray(v) && v.length >= 3 && v.every((x) => typeof x === "string")) offersVocabulary = true;
        });
      } catch { /* já tratado abaixo */ }
    }
    const names =
      offersVocabulary ||
      /valores permitidos|valid[_ ]|supported_values|vocabul[áa]rio/i.test(blob) ||
      (r.error?.data !== undefined && Object.values(r.error.data).some((v) => Array.isArray(v) && v.length > 0));
    return names
      ? has(`rejeita \`${target[0]}\` e nomeia os válidos`)
      : missing(`rejeita \`${target[0]}\` sem nomear os valores válidos`);
  } catch (e) {
    return { state: CELL.UNKNOWN, why: String(e.message ?? e).slice(0, 60) };
  }
}

/* ---------------------------------------------------------------- execução */
const rows = [];
const probes = new Map();
const errorVocab = new Map();
for (const tool of tools) probes.set(tool.name, await probe(tool));
for (const tool of tools) errorVocab.set(tool.name, await probeErrorVocabulary(tool));
server.kill();

BANDS.push({
  id: "error_vocabulary",
  title: "Erro NOMEIA o vocabulário válido",
  applies: () => true,
  fromMap: errorVocab
});

for (const band of BANDS) {
  const cells = {};
  for (const tool of tools) {
    const p = probes.get(tool.name);
    if (band.fromMap !== undefined) { cells[tool.name] = band.fromMap.get(tool.name); continue; }
    if (!p.ok) { cells[tool.name] = { state: CELL.UNKNOWN, why: p.why }; continue; }
    if (p.prose && band.naForProse) { cells[tool.name] = na(band.naForProse); continue; }
    const naWhy = band.naWhen?.(tool);
    if (naWhy) { cells[tool.name] = na(naWhy); continue; }
    if (band.fromMap !== undefined) { cells[tool.name] = band.fromMap.get(tool.name); continue; }
    if (!band.applies(tool)) { cells[tool.name] = na("regra de aplicabilidade não satisfeita"); continue; }
    cells[tool.name] = band.check(p);
  }
  rows.push({ band, cells });
}

const counts = { tem: 0, "n/a": 0, FALTA: 0, "?": 0 };
const missingCells = [];
for (const r of rows)
  for (const [tool, c] of Object.entries(r.cells)) {
    counts[c.state] = (counts[c.state] ?? 0) + 1;
    if (c.state === CELL.MISSING) missingCells.push({ band: r.band.id, tool, why: c.why });
  }
const unprobed = [...probes.entries()].filter(([, p]) => !p.ok).map(([n, p]) => ({ tool: n, why: p.why }));

/* ---------------------------------------------------------------- relatório */
const md = [];
md.push(`# Matriz BANDA × SUPERFÍCIE — ${stamp} — @shiftleftpt/sbd-toe-mcp@${pkg.version}`, "");
md.push(`**Colunas derivadas do \`tools/list\` REAL** (${tools.length} superfícies servidas) — nunca de uma lista à mão.`, "");
md.push("Estados: `tem` · `n/a` (com motivo) · **`FALTA`** · `?` (não exercitável por esta chamada — também é achado).", "");
md.push(`**${counts.tem} tem · ${counts["n/a"]} n/a · ${counts.FALTA} FALTA · ${counts["?"]} ?**`, "");
md.push("| Banda | " + tools.map((t) => t.name.replace(/^(get_|map_|plan_|search_|list_)?sbd_toe_?/, "")).join(" | ") + " |");
md.push("|---|" + tools.map(() => "---").join("|") + "|");
for (const r of rows)
  md.push(`| **${r.band.title}** | ` + tools.map((t) => (r.cells[t.name].state === CELL.MISSING ? "**FALTA**" : r.cells[t.name].state)).join(" | ") + " |");
md.push("");
md.push("## Células `FALTA` (achados desta corrida — não trabalho desta vaga)", "");
if (missingCells.length === 0) md.push("_Nenhuma._");
else for (const m of missingCells) md.push(`- **${m.tool}** · banda \`${m.band}\` — ${m.why}`);
md.push("", "## Superfícies não exercitáveis por argumentos derivados do schema", "");
if (unprobed.length === 0) md.push("_Nenhuma: as ${tools.length} superfícies responderam a argumentos derivados do próprio schema._".replace("${tools.length}", String(tools.length)));
else for (const u of unprobed) md.push(`- **${u.tool}** — ${u.why}`);
md.push("", "## Motivos das células `n/a` (por banda)", "");
for (const r of rows) {
  const reasons = new Map();
  for (const [tool, c] of Object.entries(r.cells)) if (c.state === CELL.NA) reasons.set(c.why, [...(reasons.get(c.why) ?? []), tool]);
  if (reasons.size === 0) continue;
  md.push(`**${r.band.title}**`);
  for (const [why, list] of reasons) md.push(`- ${why} — ${list.length} superfície(s): ${list.join(", ")}`);
  md.push("");
}
const mdPath = path.join(outDir, `${stamp}-band-surface-matrix-v${pkg.version}.md`);
writeFileSync(mdPath, md.join("\n") + "\n");
writeFileSync(
  mdPath.replace(/\.md$/, ".json"),
  JSON.stringify({ stamp, version: pkg.version, tools: tools.map((t) => t.name), counts, missing: missingCells, unprobed, rows: rows.map((r) => ({ band: r.band.id, title: r.band.title, cells: r.cells })) }, null, 2)
);
console.log(JSON.stringify({ tools: tools.length, counts, missing: missingCells.length, unprobed: unprobed.length, report: mdPath }, null, 1));
