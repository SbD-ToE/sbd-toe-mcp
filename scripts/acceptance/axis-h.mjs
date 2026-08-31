/**
 * Axis H — requirement-selection measurement against the programme lead's golden oracle.
 *
 * Oracle: DevelopmentGovernance/docs/golden-selection-cases.md — **v1 closed 2026-08-31**
 * (ratified in block; "Discutíveis" lines are NEUTRAL; GC-01 carries a contamination note).
 * The .md is canonical and owned by the programme lead — this module TRANSCRIBES its
 * inputs/expectations for execution and never amends them; on an oracle v1.1 the
 * transcription is refreshed, append-only.
 *
 * Expansion rules (dispatcher 2026-08-31): category wildcards (`TRN-*`, bare `AGN`) and
 * ranges (`AUT-001..004`) expand over the compiled catalogue AT THE CASE'S LEVEL;
 * concrete ids stay as written (a concrete id outside the level/catalogue surfaces as a
 * divergence with cause `oracle?`/`manual`, never silently dropped).
 *
 * Metrics per case × tool:
 *   coverage        = |must-have ∩ selected| / |must-have|
 *   strict-precision= 1 − |must-NOT ∩ selected| / |selected|   (1 when selected = ∅)
 *   excess          = selected − must-have − discutíveis − must-NOT   (reported as a list)
 * Verdict (per case, measured on `prepare` — the selection instrument; consult reported
 * alongside): PASS iff coverage = 1 ∧ must-NOT ∩ selected = ∅; PART otherwise;
 * FAIL only if coverage < 0.5, or the negative case dumps the catalogue.
 * Axis H is measurement — it never joins the promotion gate (Axis E stays the only gate).
 *
 * Cause per divergence: `mcp` (composition/activation), `manual` (catalogue lacks the
 * requirement — cross-checked with the gap notes of GC-01/02/06/08/10), `oracle?`
 * (expectation looks wrong — flagged for the lead, never "fixed" here).
 *
 * `consult` equivalent context: the concern list is Pontifex's mapping FROM THE TASK
 * WORDING (documented per case below), never from the oracle's expected sets. Cases whose
 * domains have no concern in the vocabulary run consult with risk level only — the
 * precision cost is the finding.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ORACLE_VERSION = "v1 (closed 2026-08-31, ratified in block)";
// Programme-relative reference only — never an absolute private path (the release-bundle
// guard rejects those, and the report ships in the bundle).
export const ORACLE_PATH = "DevelopmentGovernance/docs/golden-selection-cases.md";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadCatalogue() {
  const j = JSON.parse(readFileSync(path.join(repoRoot, "data/publish/runtime/requirements.json"), "utf8"));
  const arr = Array.isArray(j) ? j : Object.values(j).find(Array.isArray);
  return arr.map((r) => ({ id: r.requirement_id, category: r.category, levels: r.applicable_levels ?? {} }));
}

/** Expand one oracle token over the catalogue at the case level. */
function expandToken(token, level, catalogue) {
  token = token.trim();
  const atLevel = (r) => (level ? r.levels[level] === true : true);
  let m;
  if ((m = /^([A-Z]{3})-\*$/.exec(token)) || (m = /^([A-Z]{3})-\\\*$/.exec(token))) {
    return catalogue.filter((r) => r.category === m[1] && atLevel(r)).map((r) => r.id);
  }
  if (/^[A-Z]{3}$/.test(token)) {
    // bare category (e.g. AGN) — the whole category at level
    return catalogue.filter((r) => r.category === token && atLevel(r)).map((r) => r.id);
  }
  if ((m = /^((?:REQ-)?[A-Z]{3}-)(\d{3})\.\.(\d{3})$/.exec(token))) {
    const out = [];
    for (let n = Number(m[2]); n <= Number(m[3]); n++) out.push(m[1] + String(n).padStart(3, "0"));
    // ranges expand BY THE CATALOGUE at level: keep only ids the level activates
    return out.filter((id) => { const r = catalogue.find((x) => x.id === id); return r && atLevel(r); });
  }
  return [token]; // concrete id — stays as written
}

export function expandSet(tokens, level, catalogue) {
  const out = new Set();
  for (const t of tokens) for (const id of expandToken(t, level, catalogue)) out.add(id);
  return out;
}

/**
 * The ten golden cases — transcription of golden-selection-cases.md v1.
 * `concerns` = Pontifex's task-derived consult mapping (documented; not from the oracle).
 * `gapNote` = the case's own "Lacuna?" line (used to classify `manual` causes).
 */
export const goldenCases = [
  { id: "GC-01", title: "Upload de ficheiros com autenticação e RBAC (⚠ caso contaminado — nota do oráculo)",
    level: "L2",
    prepare: { task: "Implementar endpoint de upload de ficheiros com autenticação de utilizador e restrição de acesso por role", risk_level: "L2", stack: "Node.js/Express", exposure: "authenticated", data_sensitivity: "personal" },
    concerns: ["auth", "validation"], // task: autenticação + restrição por role; upload → input validation
    mustHave: ["AUT-003", "AUT-006", "AUT-009", "ACC-001", "ACC-002", "ACC-005", "ACC-006", "ACC-008", "SES-001..004", "SES-006", "VAL-001", "VAL-002", "VAL-004", "VAL-005", "VAL-006", "ERR-001", "ERR-002", "API-001", "API-003", "API-005", "ENC-001", "ENC-002", "ENC-005", "LOG-001", "LOG-002", "LOG-003"],
    debatable: ["AUT-001", "AUT-008", "SES-008", "VAL-003"],
    mustNot: ["TRN-*", "GOV-*", "CLA-*", "REQ-*", "THR-*", "IDE-*", "CIC-*", "IAC-*", "CNT-*", "DST-*", "DEP-*", "AGN", "OPS-*"],
    gapNote: "tratamento de ficheiros (tipo/magic bytes, tamanho, anti-malware, armazenamento, nomes) — sem categoria no catálogo" },
  { id: "GC-02", title: "API REST pública com rate limiting", level: "L3",
    prepare: { task: "Expor API pública de consulta com chaves de cliente e rate limiting", risk_level: "L3", stack: "Python/FastAPI", exposure: "public" },
    concerns: ["api", "auth", "validation"], // task: API pública + chaves de cliente
    mustHave: ["API-001..007", "VAL-001", "VAL-003", "VAL-004", "VAL-005", "VAL-006", "VAL-007", "ERR-001", "ERR-002", "ERR-003", "AUT-006", "ACC-005", "ENC-001", "LOG-001", "LOG-002", "ARC-002"],
    debatable: [],
    mustNot: ["SES-*", "TRN-*", "GOV-*", "CLA-*", "IDE-*", "CNT-*", "IAC-*", "CIC-*", "DST-*", "DEP-*", "AGN"],
    gapNote: "ciclo de vida de API keys (emissão/rotação/revogação) — parcialmente em CFG-006/ENC-007" },
  { id: "GC-03", title: "Serviço containerizado com deploy em Kubernetes", level: "L2",
    prepare: { task: "Empacotar o serviço em Docker e preparar deploy em K8s com admission control", risk_level: "L2", changed_files: ["Dockerfile", "deploy/k8s/service.yaml", "deploy/k8s/ingress.yaml"] },
    concerns: [], // vocabulary has no containers/deploy concern — consult runs level-only (finding)
    mustHave: ["CNT-001..011", "DPL-002", "DPL-003", "DPL-005", "DPL-006", "DPL-007", "DPL-008", "DST-006", "CFG-001", "CFG-002"],
    debatable: [],
    mustNot: ["AUT-*", "ACC-*", "SES-*", "VAL-*", "ERR-*", "TRN-*", "GOV-*", "AGN", "IAC-*"],
    gapNote: null },
  { id: "GC-04", title: "Módulo Terraform de rede + segredos", level: "L2",
    prepare: { task: "Criar módulo Terraform para a rede do serviço com gestão de segredos no cofre", risk_level: "L2", changed_files: ["infra/network.tf", "infra/vault.tf"] },
    concerns: ["iac", "config", "encryption"], // task: Terraform + segredos/cofre
    mustHave: ["IAC-001..008", "IAC-010", "IAC-011", "IAC-012", "CFG-006", "ENC-006", "ENC-007"],
    debatable: [],
    mustNot: ["AUT-*", "SES-*", "VAL-*", "API-*", "CNT-*", "TRN-*", "GOV-*", "AGN"],
    gapNote: null },
  { id: "GC-05", title: "Pipeline CI com build e push de imagem", level: "L2",
    prepare: { task: "Pipeline GitHub Actions: build, testes, SBOM, assinatura e push da imagem", risk_level: "L2", changed_files: [".github/workflows/ci.yml"] },
    concerns: ["distribution"], // vocabulary has no ci-cd concern; distribution ≈ supply chain (finding)
    mustHave: ["CIC-001..009", "DEP-001", "DEP-002", "DEP-003", "CNT-002", "CNT-007", "CNT-008", "DST-003", "DST-004", "DST-006", "ENC-006"],
    debatable: [],
    mustNot: ["AUT-*", "SES-*", "VAL-*", "TRN-*", "GOV-*", "AGN", "IAC-*"],
    gapNote: null },
  { id: "GC-06", title: "App com dados pessoais e overlay regulatório (AI Act)", level: "L3",
    prepare: { task: "Formulário de registo com dados pessoais; contexto AI Act aplicável", risk_level: "L3", data_sensitivity: "regulated", include_regulatory_overlay: true, regulatory_frameworks: ["EXT-AI-ACT"] },
    concerns: ["encryption", "validation", "logging", "auth"], // task: dados pessoais (crypto/masking), formulário (validation), registo
    mustHave: ["ENC-001", "ENC-002", "ENC-003", "ENC-005", "ENC-008", "VAL-001", "VAL-004", "VAL-005", "ACC-002", "ACC-006", "ERR-001", "ERR-007", "LOG-003", "LOG-005", "AUT-002", "AUT-006"],
    debatable: [],
    mustNot: ["CNT-*", "IAC-*", "CIC-*", "DST-*", "DEP-*", "AGN", "TRN-*"],
    expectsOverlay: true, // oracle: EXT-* activated obligations > 0, coherent, not enumerated
    gapNote: "minimização/consentimento/retenção de dados pessoais sem requisitos próprios (DAT-*/PRI-* eram ilustrativos)" },
  { id: "GC-07", title: "Agente AI com tool-calls e kill-switch", level: "L3",
    prepare: { task: "Worker agêntico que abre PRs e faz deploys, com mandate, kill-switch e audit por tool-call", risk_level: "L3" },
    concerns: ["agents"],
    mustHave: ["REQ-AGN-001..004", "ARC-014", "ARC-015", "OPS-011", "OPS-012", "OPS-013", "OPS-014", "DPL-010", "DPL-011", "DEP-011", "DEP-013", "DEP-014", "AUT-006", "ACC-002", "ENC-006"],
    debatable: [],
    mustNot: ["TRN-*", "GOV-*", "CLA-*", "SES-*", "CNT-*", "IAC-*"],
    gapNote: null },
  { id: "GC-08", title: "Frontend com sessões JWT — filtro de nível (L1)", level: "L1",
    prepare: { task: "SPA com login e sessão JWT; app interna de baixo risco", risk_level: "L1", exposure: "internal" },
    concerns: ["auth", "validation", "encryption", "logging"],
    mustHave: ["AUT-002", "AUT-003", "AUT-004", "AUT-005", "AUT-006", "AUT-009", "SES-001", "SES-002", "SES-003", "SES-004", "SES-006", "VAL-001", "VAL-002", "VAL-004", "VAL-005", "VAL-006", "VAL-008", "ERR-001..004", "ACC-001", "ACC-002", "ACC-004", "ACC-005", "ACC-006", "ACC-008", "ENC-001", "ENC-004", "ENC-005", "ENC-006", "LOG-001", "LOG-002", "LOG-003", "LOG-005"],
    debatable: [],
    // the case's point: nothing L2+/L3-only may appear — encoded as levelGuard below
    mustNot: [],
    levelGuard: true, // any selected requirement not applicable at L1 is a must-NOT hit
    gapNote: "paradoxo SES-008: guidance JWT para L1 não existe — lead decide" },
  { id: "GC-09", title: "Alteração só de documentação (caso NEGATIVO)", level: null,
    prepare: { task: "Actualizar README e docs de arquitectura; sem código", risk_level: "L1", changed_files: ["README.md", "docs/architecture.md"] },
    concerns: null, // consult n/a: the case defines no meaningful selection context
    negative: true, // any requirement returned = false positive; a scope-gate status = PASS
    mustHave: [], debatable: [], mustNot: [], gapNote: null },
  { id: "GC-10", title: "Integração serviço-a-serviço com mTLS e mensageria", level: "L2",
    prepare: { task: "Ligar o serviço A ao B por fila de mensagens com mTLS e assinatura de mensagens", risk_level: "L2" },
    concerns: ["integrity", "encryption", "config", "logging"],
    mustHave: ["INT-001..006", "ENC-001", "ENC-003", "CFG-006", "LOG-001"],
    debatable: [],
    mustNot: ["AUT-*", "SES-*", "VAL-008", "CNT-*", "IAC-*", "CIC-*", "TRN-*", "GOV-*", "AGN"],
    gapNote: "mensageria (poison messages, DLQ, replay) sem requisitos" },
];

function metrics(selected, mustHave, mustNot, debatable) {
  const sel = new Set(selected);
  const covered = [...mustHave].filter((id) => sel.has(id));
  const missing = [...mustHave].filter((id) => !sel.has(id));
  const violations = [...sel].filter((id) => mustNot.has(id));
  const excess = [...sel].filter((id) => !mustHave.has(id) && !mustNot.has(id) && !debatable.has(id));
  return {
    selected_count: sel.size,
    coverage: mustHave.size ? covered.length / mustHave.size : 1,
    strict_precision: sel.size ? 1 - violations.length / sel.size : 1,
    excess_count: excess.length,
    missing, violations, excess,
    debatable_selected: [...sel].filter((id) => debatable.has(id)),
  };
}

function causesFor(missing, level, catalogue, gapNote) {
  const byId = new Map(catalogue.map((r) => [r.id, r]));
  return missing.map((id) => {
    const r = byId.get(id);
    if (!r) return { id, cause: "manual", note: `id não existe no catálogo${gapNote ? " — coerente com a lacuna registada no caso" : ""}` };
    if (level && r.levels[level] !== true) return { id, cause: "oracle?", note: `existe mas não é aplicável a ${level} no catálogo — expectativa a rever pelo lead` };
    return { id, cause: "mcp", note: "aplicável ao nível e não seleccionado — composição/activação" };
  });
}

/** Run one golden case against both tools. Returns metrics + verdict + causes. */
export async function runGoldenCase(client, gc, catalogue) {
  const mustHave = expandSet(gc.mustHave, gc.level, catalogue);
  const debatable = expandSet(gc.debatable, gc.level, catalogue);
  let mustNot = expandSet(gc.mustNot, gc.level, catalogue);
  if (gc.levelGuard) {
    for (const r of catalogue) if (r.levels[gc.level] !== true) mustNot.add(r.id);
  }
  for (const id of debatable) mustNot.delete(id); // neutral wins over wildcard overlap
  for (const id of mustHave) mustNot.delete(id);

  // ── prepare ──
  const p = await client.tool("prepare_sbd_toe_codegen_context", gc.prepare);
  const pd = p.ok ? p.data : undefined;
  const pSelected = pd?.status === "ready_for_codegen" ? (pd.activated_scope?.requirements ?? []).map((r) => r.requirement_id) : [];
  const pM = metrics(pSelected, mustHave, mustNot, debatable);
  const overlayObligations = pd?.regulatory_overlay?.obligations?.length ?? 0;

  // ── consult (equivalent context) ──
  let cM = null, cStatus = "n/a";
  if (gc.concerns !== null) {
    const cArgs = { risk_level: gc.prepare.risk_level, ...(gc.concerns.length ? { concerns: gc.concerns } : {}), ...(gc.prepare.exposure ? { exposure: gc.prepare.exposure } : {}), ...(gc.prepare.data_sensitivity ? { data_sensitivity: gc.prepare.data_sensitivity } : {}) };
    const c = await client.tool("consult_security_requirements", cArgs);
    if (c.ok) { cM = metrics((c.data.requirements ?? []).map((r) => r.requirement_id), mustHave, mustNot, debatable); cStatus = "ok"; }
    else cStatus = c.error;
  }

  // ── verdict (on prepare, the selection instrument; consult reported alongside) ──
  let status, note;
  if (gc.negative) {
    const gated = pd && pd.status !== "ready_for_codegen";
    const clean = pSelected.length === 0;
    status = gated || clean ? "PASS" : pSelected.length > 20 ? "FAIL" : "PART";
    note = `negativo: prepare status=${pd?.status}, ${pSelected.length} requisitos devolvidos${gated ? " (scope-gate segurou)" : ""}`;
  } else {
    const clean = pM.violations.length === 0;
    if (pM.coverage === 1 && clean) status = "PASS";
    else if (pM.coverage < 0.5) status = "FAIL";
    else status = "PART";
    note = `prepare[${pd?.status}]: cobertura ${(pM.coverage * 100).toFixed(0)}% (${mustHave.size - pM.missing.length}/${mustHave.size}), precisão-estrita ${(pM.strict_precision * 100).toFixed(0)}%, excesso ${pM.excess_count}` +
      (cM ? `; consult: cobertura ${(cM.coverage * 100).toFixed(0)}%, precisão ${(cM.strict_precision * 100).toFixed(0)}%, excesso ${cM.excess_count}` : "") +
      (gc.expectsOverlay ? `; overlay obligations ${overlayObligations}${overlayObligations > 0 ? " ✓" : " ✗ (esperado >0)"}` : "");
    if (gc.expectsOverlay && overlayObligations === 0 && status === "PASS") status = "PART";
  }

  return {
    case: gc.id, title: gc.title, level: gc.level, status, note,
    oracle: { must_have: mustHave.size, debatable: debatable.size, must_not: mustNot.size },
    prepare: { status: pd?.status ?? (p.ok ? "?" : `error: ${p.error}`), ...pM, ...(gc.expectsOverlay ? { overlay_obligations: overlayObligations } : {}) },
    consult: cM ? { status: cStatus, ...cM } : { status: cStatus },
    causes: gc.negative
      ? pSelected.map((id) => ({ id, cause: "mcp", note: "falso positivo no caso negativo" }))
      : pd && pd.status !== "ready_for_codegen"
        ? [{ id: "(caso inteiro)", cause: "mcp", note: `prepare devolveu ${pd.status} para uma tarefa legítima do oráculo — o scope gate travou antes de seleccionar; reasons: ${(pd.reasons ?? []).join(" | ").slice(0, 160)}` }]
        : causesFor(pM.missing, gc.level, catalogue, gc.gapNote),
    ...(gc.gapNote ? { gap_note: gc.gapNote } : {}),
  };
}
