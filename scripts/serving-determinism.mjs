/**
 * 0.20.0-beta.47 (R3) — DETERMINISMO DO SERVING, ENTRE PROCESSOS.
 *
 * PORQUÊ. O servidor promete-o na cara das tools — «Identical input returns this exact
 * payload (deterministic)» — e é a propriedade que sustenta toda a auditabilidade: um
 * resultado citável tem de ser reproduzível por outra pessoa, noutra máquina, noutro dia. O
 * Codex testa o determinismo do BUILD (run 1 ≡ run 2). **O do SERVING nunca foi testado**:
 * quatro auditorias e a promessa central por verificar.
 *
 * DESENHO. Dois PROCESSOS distintos do servidor, arrancados independentemente, sobre o mesmo
 * bundle pinado. A mesma chamada em cada um. Payloads comparados BYTE A BYTE. Dois processos
 * e não duas chamadas no mesmo processo, porque é o processo que carrega caches, ordena Maps
 * e Sets e fixa a ordem de iteração — repetir dentro do mesmo processo mediria a cache, não
 * o serving.
 *
 * RUÍDO LEGÍTIMO. Timestamps e ids de execução variam por construção. Este runner NÃO os
 * normaliza em silêncio: mede as duas coisas — a igualdade CRUA e a igualdade depois de
 * neutralizar campos declarados — e reporta as duas. Um campo que varie e não esteja na lista
 * declarada é ACHADO, não ruído.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const serverEntry = opt("--server") ?? "dist/index.js";
const outDir = path.resolve(repoRoot, opt("--out") ?? "docs/acceptance-runs");
const stamp = opt("--stamp") ?? new Date().toISOString().slice(0, 10);

/**
 * Campos cuja variação é ruído DECLARADO — e só estes. Cada um traz o motivo: sem motivo não
 * entra, que é a mesma disciplina dos falsos positivos da matriz.
 */
const DECLARED_VOLATILE = {
  generated_at: "carimbo temporal da própria resposta",
  timestamp: "carimbo temporal",
  run_id: "identificador de execução",
  duration_ms: "medição de tempo",
  elapsed_ms: "medição de tempo"
};

function startServer(entry) {
  const proc = spawn("node", [entry], { stdio: ["pipe", "pipe", "ignore"] });
  const pending = new Map();
  let buf = "";
  let seq = 0;
  proc.stdout.on("data", (d) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      } catch { /* stderr à parte */ }
    }
  });
  const rpc = (method, params) =>
    new Promise((res, rej) => {
      const id = ++seq;
      const t = setTimeout(() => { pending.delete(id); rej(new Error(`timeout ${method}`)); }, 90000);
      pending.set(id, (m) => { clearTimeout(t); res(m); });
      proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  return { proc, rpc };
}

async function handshake(s) {
  await s.rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "determinism", version: "0" } });
  s.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
}

/**
 * 0.20.0-beta.49 — voláteis que vivem em PROSA, não em campos JSON.
 *
 * O artefacto do `generate_sbd_toe_skill` passou a datar-se a si mesmo (P1), e a hora de
 * geração é markdown dentro de `content` — a neutralização por campo não lhe chega. É
 * volátil DECLARADO, com padrão preciso: neutraliza-se a linha «Gerado em: `<ISO>`» e mais
 * nada. Um padrão largo (qualquer ISO em qualquer sítio) esconderia divergências reais.
 */
const DECLARED_VOLATILE_PROSE = [
  {
    id: "artifact_generated_at",
    why: "hora de geração impressa no artefacto instalável (P1: o ficheiro data-se a si mesmo)",
    pattern: /(\*\*Gerado em:\*\* )\\?`[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\\?`/g,
    replacement: "$1`<volátil>`"
  },
  {
    id: "artifact_generated_at_json",
    why: "o mesmo carimbo, escapado dentro do JSON de `content`",
    pattern: /(Gerado em:\*\* )\\`[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\\`/g,
    replacement: "$1`<volátil>`"
  }
];

/** Neutraliza APENAS os campos declarados voláteis; devolve também quais encontrou. */
function neutralize(text) {
  const seen = new Set();
  let out = text;
  for (const v of DECLARED_VOLATILE_PROSE) {
    if (v.pattern.test(out)) seen.add(v.id);
    v.pattern.lastIndex = 0;
    out = out.replace(v.pattern, v.replacement);
  }
  for (const key of Object.keys(DECLARED_VOLATILE)) {
    const re = new RegExp(`("${key}"\\s*:\\s*)("[^"]*"|[0-9.]+|null)`, "g");
    if (re.test(out)) seen.add(key);
    out = out.replace(new RegExp(`("${key}"\\s*:\\s*)("[^"]*"|[0-9.]+|null)`, "g"), `$1"<volátil>"`);
  }
  return { text: out, neutralized: [...seen] };
}

/** O primeiro ponto onde dois textos divergem, com contexto — para o achado ser accionável. */
function firstDivergence(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  const from = Math.max(0, i - 90);
  return { offset: i, a: a.slice(from, i + 90), b: b.slice(from, i + 90) };
}

/* ------------------------------------------------------- as chamadas a comparar */
const A = await startServer(serverEntry);
const B = await startServer(serverEntry);
await handshake(A);
await handshake(B);

const listed = await A.rpc("tools/list", {});
const tools = (listed.result?.tools ?? []).map((t) => t.name);
if (tools.length < 20) { console.error("inventário vivo vazio — a sonda partiu"); process.exit(2); }

/** Argumentos representativos por tool; as que não constam correm sem argumentos. */
const ARGS = {
  select_sbd_toe_requirements: { risk_level: "L2", concerns: ["auth", "secrets"], detail: "full" },
  prepare_sbd_toe_codegen_context: { task: "Implementar login com sessões de utilizador", risk_level: "L2", concerns: ["auth"] },
  consult_security_requirements: { risk_level: "L2", concerns: ["auth"] },
  get_sbd_toe_chapter_capability: { chapter: "07-cicd-seguro", risk_level: "L2" },
  get_guide_by_role: { risk_level: "L2", role: "developer", include_detail: true },
  get_sbd_toe_macro_processes: {},
  plan_sbd_toe_rollout: {},
  get_threat_landscape: { risk_level: "L2", concerns: ["auth"] },
  explain_sbd_toe_topic: { concern: "secrets" },
  get_sbd_toe_playbook: {},
  trace_sbd_toe_graph: { lens: "slice_implementation" },
  resolve_entities: { record_type: "requirement", limit: 20 },
  assess_sbd_toe_implementation: { risk_level: "L2", kpi_values: { "CIC-K01": 90 } },
  map_sbd_toe_applicability: { riskLevel: "L2", projectRole: "developer" },
  get_sbd_toe_chapter_brief: { chapterId: "07-cicd-seguro" },
  get_sbd_toe_verification_matrix: { risk_level: "L2" },
  trace_sbd_toe_requirement_sources: { requirement_ids: ["VAL-001", "AUT-001"] },
  get_sbd_toe_chapter_implementation_checklist: { chapter: "07-cicd-seguro" },
  plan_sbd_toe_repo_governance: { riskLevel: "L2" },
  map_sbd_toe_review_scope: { changedFiles: ["src/auth/login.ts", "Dockerfile"], riskLevel: "L2" },
  list_sbd_toe_chapters: {},
  get_sbd_toe_operating_model: {},
  generate_sbd_toe_skill: { role: "developer", format: "skill" },
  query_sbd_toe_entities: { query: "VAL-001" },
  map_sbd_toe_regulatory_activation: { framework: "DORA" },
  // As superfícies de RECUPERAÇÃO são as de maior risco (scoring, vectores, ordenação) e
  // eram justamente as que ficavam de fora: chamadas sem `question`, devolviam 36 bytes de
  // erro e contavam como «byte-idênticas». Comparar dois erros não é testar determinismo.
  search_sbd_toe_manual: { question: "Como faço threat modeling de uma API pública?", topK: 5 },
  inspect_sbd_toe_retrieval: { question: "Como faço threat modeling de uma API pública?", topK: 5 },
  answer_sbd_toe_manual: { question: "Como faço threat modeling de uma API pública?", topK: 5 },
  read_sbd_toe_resource: { uri: "sbd://toe/quick-start" }
};

/**
 * Um payload minúsculo é quase sempre um erro disfarçado. Contá-lo como byte-idêntico daria
 * um resultado falso — foi o que aconteceu na primeira corrida deste runner com as três
 * superfícies de recuperação. Abaixo deste tamanho, a comparação declara-se inconclusiva.
 */
const MIN_COMPARABLE_BYTES = 200;

const results = [];
for (const name of tools) {
  const args = ARGS[name] ?? {};
  let ra, rb;
  try {
    ra = await A.rpc("tools/call", { name, arguments: args });
    rb = await B.rpc("tools/call", { name, arguments: args });
  } catch (e) {
    results.push({ tool: name, status: "erro", why: String(e.message ?? e).slice(0, 80) });
    continue;
  }
  const ta = ra.result?.content?.[0]?.text;
  const tb = rb.result?.content?.[0]?.text;
  if (typeof ta !== "string" || typeof tb !== "string") {
    results.push({ tool: name, status: "não comparável", why: ra.error ? `erro: ${String(ra.error.message).slice(0, 60)}` : "sem conteúdo de texto" });
    continue;
  }
  if (ta.length < MIN_COMPARABLE_BYTES || tb.length < MIN_COMPARABLE_BYTES) {
    results.push({
      tool: name,
      status: "não comparável",
      why: `payload de ${Math.min(ta.length, tb.length)} bytes — provavelmente erro; comparar dois erros não testa determinismo`
    });
    continue;
  }
  const raw = ta === tb;
  const na = neutralize(ta);
  const nb = neutralize(tb);
  const afterNeutral = na.text === nb.text;
  results.push({
    tool: name,
    status: raw ? "byte-idêntico" : afterNeutral ? "idêntico após neutralizar voláteis" : "DIVERGE",
    bytes: ta.length,
    ...(na.neutralized.length > 0 ? { volatile_fields_present: na.neutralized } : {}),
    ...(raw ? {} : { divergence: firstDivergence(na.text, nb.text) })
  });
}

A.proc.kill();
B.proc.kill();

const identical = results.filter((r) => r.status === "byte-idêntico");
const afterN = results.filter((r) => r.status === "idêntico após neutralizar voláteis");
const diverge = results.filter((r) => r.status === "DIVERGE");
const skipped = results.filter((r) => r.status === "não comparável" || r.status === "erro");

const md = [];
md.push(`# Determinismo do SERVING entre processos — ${stamp}`, "");
md.push("Dois **processos distintos** do servidor, arrancados independentemente sobre o mesmo bundle pinado.", "");
md.push("A mesma chamada em cada um; payloads comparados **byte a byte**. Repetir no mesmo processo mediria a cache, não o serving.", "");
md.push(`**${identical.length} byte-idênticos · ${afterN.length} idênticos após neutralizar voláteis · ${diverge.length} DIVERGEM · ${skipped.length} não comparáveis**`, "");
md.push("| Superfície | Resultado | Bytes | Voláteis presentes |");
md.push("|---|---|---|---|");
for (const r of results)
  md.push(`| \`${r.tool}\` | ${r.status === "DIVERGE" ? "**DIVERGE**" : r.status} | ${r.bytes ?? "—"} | ${(r.volatile_fields_present ?? []).join(", ") || "—"} |`);
if (diverge.length > 0) {
  md.push("", "## Divergências (ACHADO — não normalizadas)", "");
  for (const d of diverge)
    md.push(`### \`${d.tool}\` — primeiro ponto de divergência no offset ${d.divergence.offset}`, "", "```", `A: ${d.divergence.a}`, `B: ${d.divergence.b}`, "```", "");
}
md.push("", "## Campos voláteis declarados", "");
for (const [k, why] of Object.entries(DECLARED_VOLATILE)) md.push(`- \`${k}\` — ${why}`);
for (const v of DECLARED_VOLATILE_PROSE) md.push(`- \`${v.id}\` (prosa) — ${v.why}`);
md.push("", "Um campo que varie e **não** esteja nesta lista conta como DIVERGE: é achado, não ruído.");
if (skipped.length > 0) {
  md.push("", "## Não comparáveis", "");
  for (const s of skipped) md.push(`- \`${s.tool}\` — ${s.why}`);
}

const mdPath = path.join(outDir, `${stamp}-serving-determinism.md`);
writeFileSync(mdPath, md.join("\n") + "\n");
writeFileSync(mdPath.replace(/\.md$/, ".json"), JSON.stringify({ stamp, counts: { identical: identical.length, after_neutral: afterN.length, diverge: diverge.length, skipped: skipped.length }, results }, null, 2));
console.log(JSON.stringify({ tools: tools.length, identical: identical.length, after_neutral: afterN.length, diverge: diverge.length, skipped: skipped.length, report: mdPath }, null, 1));
