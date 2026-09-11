/**
 * §5 — projecção da forma nova (linha 0.21), para DERIVAR os tectos da promessa escrita.
 *
 * Não altera o servidor: reconstrói, a partir dos MESMOS dados publicados que o prepare
 * serve hoje, o payload que a forma nova terá (fusão §1 + cortes §3 + adjacência §2) e
 * mede-o. Os números que saem daqui são a base e o declive usados em
 * `floor((promessa − base) / custo)`. Reprodutível: `node scripts/measure/s5-form-projection.mjs`
 */
import { handlePrepareCodegenContext } from "../../dist/tools/prepare-codegen-context.js";
import { getOntologyData } from "../../dist/tools/ontology-loader.js";
import { buildDeclaredAdjacency } from "../../dist/serving/adjacency.js";

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
const reqById = new Map(ont.requirements.map((r) => [r.requirement_id, r]));

/** O objecto da §1: um requisito é uma coisa só, e a descrição nunca sai. */
function mergedRequirements(payload) {
  const eps = payload.g2_context?.evidence_patterns ?? [];
  const epByReq = new Map();
  for (const ep of eps) if (ep.maps_to_requirement_id && !epByReq.has(ep.maps_to_requirement_id)) epByReq.set(ep.maps_to_requirement_id, ep);
  return (payload.activated_scope?.requirements ?? []).map((r) => {
    const src = reqById.get(r.requirement_id) ?? {};
    const ep = epByReq.get(r.requirement_id);
    const out = { id: r.requirement_id, name: r.name, description: src.description ?? "" };
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

/** §2: resumo sempre presente — o módulo real (a32ca44), topo por impacto + denominador. */
function adjacencySummary(args) {
  return buildDeclaredAdjacency(args);
}
/** §2 detalhe: a lista completa dos sinais que mudariam o conjunto (mesma forma). */
function adjacencyDetail(args) {
  const a = buildDeclaredAdjacency(args);
  const one = a.undeclared_that_would_change_the_set[0] ?? { signal: "x", kind: "concern", would_add: 1 };
  return { scanned: a.scanned, entries: Array.from({ length: a.would_change_the_set }, () => one) };
}

/** Constrói o payload projectado de um dos TRÊS níveis da forma nova. */
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

const rows = [];
for (const [name, args] of CASES) {
  const p = handlePrepareCodegenContext({ ...args, detail: "full" });
  if (p.status !== "ready_for_codegen") { console.log(`(saltado: ${name} → ${p.status})`); continue; }
  const n = (p.activated_scope?.requirements ?? []).length;
  const row = { name, n, now: { ultrathin: 0, minimal: 0, standard: 0, full: tk(p) }, next: {} };
  for (const d of ["ultrathin", "minimal", "standard"]) row.now[d] = tk(handlePrepareCodegenContext({ ...args, detail: d }));
  for (const lvl of ["lista", "standard", "full"]) row.next[lvl] = tk(projectLevel(lvl, p, args));
  rows.push(row);
}

console.log("\n=== FORMA ACTUAL (0.20.0) vs FORMA NOVA (projectada) — tokens ≈chars/4 ===");
console.log("caso".padEnd(38), "reqs", " ultrathin minimal standard   full  ||   lista standard    full  (nova)");
for (const r of rows) {
  console.log(r.name.padEnd(38), String(r.n).padStart(4),
    String(r.now.ultrathin).padStart(9), String(r.now.minimal).padStart(7), String(r.now.standard).padStart(8), String(r.now.full).padStart(6),
    " ||", String(r.next.lista).padStart(7), String(r.next.standard).padStart(8), String(r.next.full).padStart(7));
}

console.log("\n=== REGRESSÃO da forma nova (dois extremos) → base e declive ===");
const a = rows[0], b = rows[rows.length - 1];
const derived = {};
for (const lvl of ["lista", "standard", "full"]) {
  const slope = (b.next[lvl] - a.next[lvl]) / (b.n - a.n);
  const base = Math.round(a.next[lvl] - slope * a.n);
  derived[lvl] = { slope: Number(slope.toFixed(1)), base };
  console.log(`   ${lvl.padEnd(9)} declive ≈ ${slope.toFixed(1)} tk/req | base ≈ ${base} tk   (${a.n}→${a.next[lvl]} tk, ${b.n}→${b.next[lvl]} tk)`);
}
console.log("\nDERIVED_JSON " + JSON.stringify(derived));
