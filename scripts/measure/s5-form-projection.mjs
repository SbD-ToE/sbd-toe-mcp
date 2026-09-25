/**
 * §5 — projecção da forma nova (linha 0.21) e, desde a §1, a MEDIÇÃO DA FORMA SERVIDA.
 *
 * Reprodutível: `npm run build && node scripts/measure/s5-form-projection.mjs`
 *
 * CORRECÇÃO 2026-09-25 (achado da §1): a versão de 2026-09-11 desta projecção fazia
 * o join verify/evidence a partir de `g2_context.evidence_patterns` do payload full —
 * um bloco CAPADO a 25. Só 25 requisitos levavam verify/evidence na projecção; a
 * partir dos 25 o custo por requisito ficava subestimado (81,0 tk/req medidos vs
 * ~132 tk/req reais na forma servida). Os tectos 83/88 ratificados no §5 foram
 * derivados dessa projecção. Esta versão faz o join sobre o catálogo publicado
 * COMPLETO (1:1 por requisito) e imprime, lado a lado, a projecção corrigida e a
 * forma servida (com o tecto levantado SÓ para medir o caso de 89).
 */
import { handlePrepareCodegenContext } from "../../dist/tools/prepare-codegen-context.js";
import { getOntologyData } from "../../dist/tools/ontology-loader.js";
import { buildDeclaredAdjacency } from "../../dist/serving/adjacency.js";
import * as ceilings from "../../dist/serving/payload-ceilings.js";

const tk = (x) => Math.round(JSON.stringify(x).length / 4);

/** Casos de medição: selecções reais de tamanhos diferentes (mesma máquina de selecção). */
const CASES = [
  ["auth/L2 (base da avaliação externa)", { task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"] }],
  ["auth+validation/L2", { task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", concerns: ["auth", "validation"] }],
  ["upload/L2 (fixture2 do EPIC)", { task: "Implement a secure endpoint for uploading documents with logging", risk_level: "L2", concerns: ["api", "auth", "files"] }],
  ["auth+val+log/L3", { task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "validation", "logging"] }],
  ["API pública/L3 + activadores", { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", exposure: "public", data_sensitivity: "personal", stack: "Python/FastAPI", concerns: ["api"] }],
];

const ont = getOntologyData();
const epByReq = new Map((ont.evidencePatterns ?? []).map((e) => [e.maps_to_requirement_id, e]));

/** O objecto da §1 (projecção corrigida): join sobre o catálogo completo, 1:1. */
function mergedRequirements(payload) {
  return (payload.activated_scope?.requirements ?? []).map((r) => {
    const id = r.id ?? r.requirement_id;
    const ep = epByReq.get(id);
    const out = { id, name: r.name, description: r.description ?? "" };
    if (ep?.verification_logic) out.verify = ep.verification_logic;
    if (ep?.evidence_expectation) out.evidence = ep.evidence_expectation;
    return out;
  });
}

/** §3: ids legais viram legenda + lista (a função é «estes ids são legais»). */
function citationsCompact(payload) {
  const map = payload.citation_map ?? {};
  const bySource = new Map();
  for (const [id, entry] of Object.entries(map)) {
    const key = `${entry?.source ?? "?"}|${entry?.source_data ?? ""}`;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(id);
  }
  return {
    legend: [...bySource.keys()].map((k, i) => ({ ref: `S${i + 1}`, source: k.split("|")[0], source_data: k.split("|")[1] })),
    ids: Object.fromEntries([...bySource.values()].map((ids, i) => [`S${i + 1}`, ids])),
  };
}

function adjacencySummary(args) { return buildDeclaredAdjacency(args); }
function adjacencyDetail(args) {
  const a = buildDeclaredAdjacency(args);
  const one = a.undeclared_that_would_change_the_set[0] ?? { signal: "x", kind: "concern", would_add: 1 };
  return { scanned: a.scanned, entries: Array.from({ length: a.would_change_the_set }, () => one) };
}

/** Constrói o payload projectado de um dos TRÊS níveis da forma-alvo do épico. */
export function projectLevel(level, payload, args) {
  const out = {
    status: payload.status,
    mode: payload.mode,
    input_echo: payload.input_echo,
    llm_codegen_instructions: payload.llm_codegen_instructions,
    security_rationale_template: payload.security_rationale_template,
    citations: citationsCompact(payload),
    requirements: mergedRequirements(payload),
    controls: payload.activated_scope?.controls ?? [],
    slices: payload.activated_scope?.slices ?? [],
    adjacency: adjacencySummary(args),
    completeness_report: payload.completeness_report,
    provenance: payload.provenance,
    next: payload.next,
    size_estimate: { tokens: 0 },
  };
  if (level === "lista") {
    out.adjacency_detail_ref = "select_sbd_toe_requirements(… + sinais)";
    out.manual_grounding_ref = "sbd://toe/manual-grounding/{call_id}";
  } else if (level === "standard") {
    out.adjacency_detail = adjacencyDetail(args);
    out.manual_grounding_ref = "sbd://toe/manual-grounding/{call_id}";
  } else {
    out.adjacency_detail = adjacencyDetail(args);
    out.manual_grounding = payload.manual_grounding;
    out.relations_ref = "resolve_entities(record_type=\"appsec_relation\", filters)";
  }
  return out;
}

const regression = (rows, key, a, b) => {
  const slope = (rows[b][key] - rows[a][key]) / (rows[b].n - rows[a].n);
  const base = Math.round(rows[a][key] - slope * rows[a].n);
  return { slope: Number(slope.toFixed(1)), base };
};

// ---- Projecção corrigida (forma-alvo do épico: §1 + §3 + §2) --------------
const proj = [];
for (const [name, args] of CASES) {
  const p = handlePrepareCodegenContext({ ...args, detail: "full" });
  if (p.status !== "ready_for_codegen") { console.log(`(saltado: ${name} → ${p.status})`); continue; }
  const n = (p.activated_scope?.requirements ?? []).length;
  const row = { name, n, full_served: tk(p) };
  for (const lvl of ["lista", "standard", "full"]) row[lvl] = tk(projectLevel(lvl, p, args));
  proj.push(row);
}
console.log("\n=== PROJECÇÃO CORRIGIDA da forma-alvo (§1+§3+§2; join 1:1 sobre o catálogo) — tokens ≈chars/4 ===");
console.log("caso".padEnd(38), "reqs", "   lista standard    full");
for (const r of proj) console.log(r.name.padEnd(38), String(r.n).padStart(4), String(r.lista).padStart(8), String(r.standard).padStart(8), String(r.full).padStart(8));
const pd = {};
for (const lvl of ["lista", "standard", "full"]) { pd[lvl] = regression(proj, lvl, 0, proj.length - 1); console.log(`   ${lvl.padEnd(9)} declive ≈ ${pd[lvl].slope} tk/req | base ≈ ${pd[lvl].base} tk`); }

// ---- Forma SERVIDA (§1 aterrada) — tecto levantado SÓ para medir o caso de 89 ---
const savedCeilings = { ...ceilings.REQUIREMENT_CEILING_BY_DETAIL };
for (const k of Object.keys(ceilings.REQUIREMENT_CEILING_BY_DETAIL)) delete ceilings.REQUIREMENT_CEILING_BY_DETAIL[k];
const served = [];
for (const [name, args] of CASES) {
  const row = { name, n: 0 };
  for (const lvl of ["lista", "standard", "full"]) {
    const p = handlePrepareCodegenContext({ ...args, detail: lvl });
    if (p.status !== "ready_for_codegen") { row[lvl] = p.status; continue; }
    row.n = p.activated_scope.requirements.length; row[lvl] = tk(p);
  }
  served.push(row);
}
Object.assign(ceilings.REQUIREMENT_CEILING_BY_DETAIL, savedCeilings);
console.log("\n=== FORMA SERVIDA (0.21 §1: requisito fundido; §3/§2 ainda não aterraram) ===");
console.log("caso".padEnd(38), "reqs", "   lista standard    full");
for (const r of served) console.log(r.name.padEnd(38), String(r.n).padStart(4), String(r.lista).padStart(8), String(r.standard).padStart(8), String(r.full).padStart(8));
const sd = {};
for (const lvl of ["lista", "standard"]) {
  sd[lvl] = regression(served, lvl, 0, served.length - 1);
  const env = ceilings.PAYLOAD_PROMISE_TK[lvl]; const ceil = ceilings.REQUIREMENT_CEILING_BY_DETAIL[lvl];
  console.log(`   ${lvl.padEnd(9)} declive ≈ ${sd[lvl].slope} tk/req | base ≈ ${sd[lvl].base} tk | envelope ${env} ⇒ tecto pela fórmula = ${Math.floor((env - sd[lvl].base) / sd[lvl].slope)} (ratificado: ${ceil}; custo em ${ceil} ≈ ${Math.round(sd[lvl].base + sd[lvl].slope * ceil)} tk)`);
}
console.log("\nDERIVED_JSON " + JSON.stringify({ projection_corrected: pd, served: sd, ceiling_fit: ceilings.CEILING_FIT }));
