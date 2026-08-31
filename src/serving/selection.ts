/**
 * selection — the MP1 selection operation (G-mp1a, O2; ciclo MP1 P2, 2026-08-31).
 *
 * Implements the reference semantics DECLARED by the published ontology
 * (`requirement_selection_model`, sbdtoe-ontology v2.2, served since contract v1.14):
 *
 *   selection = baseline(cap. 02, `type: base`, by risk level)
 *             ∪ domain_specific(chapters activated by CONTEXT)
 *             ⊕ overlay(extend — the `replace` operator awaits ADR 0014)
 *
 * followed by deterministic, DECLARED narrowing by the task over that eligible set.
 * Two output bands, both listed (never-silent):
 *   - `selected[]`     — requirement with a declared signal (selection_trace per item)
 *   - `narrowed_out[]` — eligible without a signal, grouped by category with reason.
 *
 * The engine consumes the activation machinery of prepare-codegen-context (one
 * audited signal table for the whole serving layer — D4: the concern lexicon is ONE
 * signal among task terms, compound phrases, changed_files, stack, exposure,
 * data_sensitivity and explicit concerns) and the path→chapter knowledge of
 * map_sbd_toe_review_scope. It never invents requirements and never consults a model.
 */
import { getOntologyData, type Requirement } from "../tools/ontology-loader.js";
import {
  activate,
  categoriesForConcerns,
  normalizeInput,
  type ActivationResult,
  type ActivationTraceEntry,
  type Concern,
  type NormalizedInput
} from "../tools/prepare-codegen-context.js";
import { bundlesForChangedFiles } from "../tools/map-review-scope.js";

export type SelectionRiskLevel = "L1" | "L2" | "L3";

/** Concern → the domain chapter(s) whose catalogue it activates (aligned with the
 * ontology's `activation_examples` and the applicability model; audited table). */
const CONCERN_TO_DOMAIN_CHAPTERS: Readonly<Partial<Record<Concern, readonly string[]>>> = {
  deployment: ["09-containers-imagens", "11-deploy-seguro"],
  iac: ["08-iac-infraestrutura"],
  build: ["07-cicd-seguro"],
  release: ["11-deploy-seguro"],
  supply_chain: ["05-dependencias-sbom-sca"],
  testing: ["10-testes-seguranca"],
  threat_modeling: ["03-threat-modeling"],
  monitoring: ["12-monitorizacao-operacoes"],
  architecture: ["04-arquitetura-segura"],
};

/** Technology vocabulary → chapters (mirrors map_sbd_toe_applicability). */
const TECHNOLOGY_TO_CHAPTERS: Readonly<Record<string, readonly string[]>> = {
  containers: ["08-iac-infraestrutura", "09-containers-imagens"],
  kubernetes: ["08-iac-infraestrutura", "09-containers-imagens"],
  iac: ["08-iac-infraestrutura"],
  "ci-cd": ["07-cicd-seguro"],
  "sca-sbom": ["05-dependencias-sbom-sca"],
  sast: ["10-testes-seguranca"],
  dast: ["10-testes-seguranca"],
  monitoring: ["12-monitorizacao-operacoes"],
};

/**
 * The agentic-governance wave: `agents` selects the domain-specific requirements
 * whose published name/description carries the agentic vocabulary (mandate,
 * autonomy, kill-switch, tool-call, AI agent). Deterministic lexical rule over
 * published fields — declared per match, never a model call.
 */
/**
 * R1 (decisão pós-P2 do programme lead, 2026-08-31, GC-07): o concern `agents` activa,
 * como regra NOMEADA e declarada no selection_trace, o conjunto "principal não-humano" —
 * o agente é um principal (ARC-015: least privilege para agentes): {ACC-002 menor
 * privilégio, AUT-006 credenciais em claro, ENC-006 segredos expostos} ∪ {DEP-011,
 * DEP-013, DEP-014 — supply chain AI do cap. 05}.
 */
const R1_RULE_ID = "R1:principal-nao-humano";
const R1_PRINCIPAL_SET: readonly string[] = ["ACC-002", "AUT-006", "ENC-006", "DEP-011", "DEP-013", "DEP-014"];

/**
 * R2 (decisão pós-P2 do programme lead, 2026-08-31, GC-02): SES-* resolve-se por
 * narrowing de sinais — sem sinais de sessão/login/token DE UTILIZADOR na tarefa, a
 * categoria SES sai para `narrowed_out` com razão declarada; com eles, fica. O
 * `concernsMap` do loader (`auth → [AUT, ACC, SES]`) NÃO é alterado neste ciclo; a via
 * de dados fica anotada para avaliação futura no loader.
 */
const R2_RULE_ID = "R2:narrowing-de-sinais-SES";
const SESSION_SIGNAL_PATTERN =
  /sess[ãa]o|session|login|logout|sign.?in|\bjwt\b|cookie|token de utilizador|user token|refresh token|autentica[çc][ãa]o de utilizador|user authentication|utilizador(es)? autenticado/i;

const AGENTIC_WAVE_PATTERN = /\bagente|\bagent\b|agêntic|agentic|autonom|kill.?switch|mandate|tool.?call/i;

export interface SelectionTraceEntry {
  layer: "baseline" | "domain_specific" | "agents_wave" | "named_rule";
  source: ActivationTraceEntry["source"] | "context_chapter" | "agents_wave" | "named_rule";
  trigger: string;
  score: number;
  reason: string;
}

export interface SelectedRequirement {
  requirement_id: string;
  name: string;
  category: string;
  type: string;
  source_chapter: number;
  selection_trace: SelectionTraceEntry[];
}

export interface NarrowedOutGroup {
  category: string;
  count: number;
  requirement_ids: string[];
  reason: string;
}

export interface ActivatedChapter {
  chapter: string;
  source: "changed_file" | "technology" | "concern" | "stack";
  trigger: string;
}

export interface SelectionResult {
  risk_level: SelectionRiskLevel;
  eligible_count: number;
  selected: SelectedRequirement[];
  narrowed_out: NarrowedOutGroup[];
  activated_chapters: ActivatedChapter[];
  activated_categories: string[];
  activation: ActivationResult;
  input: NormalizedInput;
  notes: string[];
}

export interface SelectionContextInput {
  task?: string;
  risk_level: SelectionRiskLevel;
  stack?: string;
  exposure?: string;
  data_sensitivity?: string;
  concerns?: string[];
  changed_files?: string[];
  technologies?: string[];
}

/** Chapters activated by the CONTEXT (changed files, technologies, stack, concerns). */
function activateChapters(
  input: NormalizedInput,
  technologies: readonly string[],
  activation: ActivationResult
): ActivatedChapter[] {
  const out: ActivatedChapter[] = [];
  const seen = new Set<string>();
  const push = (chapter: string, source: ActivatedChapter["source"], trigger: string) => {
    const key = `${chapter}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ chapter, source, trigger });
  };
  const fileMap = bundlesForChangedFiles(input.changed_files);
  for (const [file, bundles] of fileMap) {
    for (const bundle of bundles) push(bundle, "changed_file", file);
  }
  for (const tech of technologies) {
    for (const chapter of TECHNOLOGY_TO_CHAPTERS[tech] ?? []) push(chapter, "technology", tech);
  }
  const stackLower = (input.stack ?? "").toLowerCase();
  for (const [token, chapters] of Object.entries(TECHNOLOGY_TO_CHAPTERS)) {
    if (stackLower.includes(token)) for (const chapter of chapters) push(chapter, "stack", token);
  }
  for (const concern of activation.concerns) {
    for (const chapter of CONCERN_TO_DOMAIN_CHAPTERS[concern] ?? []) push(chapter, "concern", concern);
  }
  return out;
}

/**
 * Run the MP1 selection. Deterministic; every inclusion carries a trace and every
 * eligible exclusion is listed with a reason.
 */
export function runSelection(context: SelectionContextInput): SelectionResult {
  const input = normalizeInput({
    task: context.task ?? "",
    risk_level: context.risk_level,
    ...(context.stack ? { stack: context.stack } : {}),
    ...(context.exposure ? { exposure: context.exposure } : {}),
    ...(context.data_sensitivity ? { data_sensitivity: context.data_sensitivity } : {}),
    ...(context.concerns ? { concerns: context.concerns } : {}),
    ...(context.changed_files ? { changed_files: context.changed_files } : {}),
  });
  const activation = activate(input);
  return runSelectionWithActivation(input, activation, context.technologies ?? []);
}

/** Variant for callers that already ran the activation engine (prepare). */
export function runSelectionWithActivation(
  input: NormalizedInput,
  activation: ActivationResult,
  technologies: readonly string[] = []
): SelectionResult {
  const level = (input.risk_level ?? "L2") as SelectionRiskLevel;
  const ontology = getOntologyData();
  const atLevel = (r: Requirement) => r.applicable_levels?.[level] === true;

  const activatedChapters = activateChapters(input, technologies, activation);
  const chapterSet = new Set(activatedChapters.map((c) => c.chapter));
  const activatedCategories = categoriesForConcerns(activation.concerns);
  const concernByCategory = new Map<string, ActivationTraceEntry>();
  for (const entry of activation.trace) {
    const produced = entry.produced as Concern;
    for (const category of categoriesForConcerns([produced])) {
      const existing = concernByCategory.get(category);
      if (!existing || entry.score > existing.score) concernByCategory.set(category, entry);
    }
  }

  // Layer 1 — eligibility.
  const baselineEligible = ontology.requirements.filter((r) => r.type === "base" && atLevel(r));
  const domainEligible = ontology.requirements.filter(
    (r) => r.type !== "base" && atLevel(r) && r.source_bundle !== undefined && chapterSet.has(r.source_bundle)
  );
  const agentsActive = activation.concerns.includes("agents" as Concern);
  const agentsWave = agentsActive
    ? ontology.requirements.filter(
        (r) =>
          r.type !== "base" &&
          atLevel(r) &&
          !domainEligible.includes(r) &&
          AGENTIC_WAVE_PATTERN.test(`${r.name} ${r.description ?? ""}`)
      )
    : [];

  // Layer 2 — narrowing into the two declared bands.
  const selected: SelectedRequirement[] = [];
  const narrowedByCategory = new Map<string, string[]>();
  const pushSelected = (r: Requirement, trace: SelectionTraceEntry[]) => {
    selected.push({
      requirement_id: r.requirement_id,
      name: r.name,
      category: r.category,
      type: r.type,
      source_chapter: r.source_chapter,
      selection_trace: trace,
    });
  };

  const sessionSignals = SESSION_SIGNAL_PATTERN.test(input.task ?? "");
  let r2Applied = false;
  for (const r of baselineEligible) {
    const signal = concernByCategory.get(r.category);
    if (r.category === "SES" && !sessionSignals && (signal || activatedCategories.has(r.category))) {
      // R2: SES elegível com sinal de categoria (via auth) mas SEM sinal de sessão na tarefa.
      r2Applied = true;
      const list = narrowedByCategory.get(r.category) ?? [];
      list.push(r.requirement_id);
      narrowedByCategory.set(r.category, list);
      continue;
    }
    if (signal || activatedCategories.has(r.category)) {
      const entry = signal ?? {
        source: "explicit_concern" as const,
        produced: r.category,
        trigger: r.category,
        score: 1,
        confidence: "deterministic" as const,
        reason: "categoria activada",
      };
      pushSelected(r, [
        {
          layer: "baseline",
          source: entry.source,
          trigger: entry.trigger,
          score: entry.score,
          reason: `baseline cap. 02 (${level}); categoria ${r.category} com sinal: ${entry.reason}`,
        },
      ]);
    } else {
      const list = narrowedByCategory.get(r.category) ?? [];
      list.push(r.requirement_id);
      narrowedByCategory.set(r.category, list);
    }
  }

  for (const r of domainEligible) {
    const via = activatedChapters.find((c) => c.chapter === r.source_bundle);
    pushSelected(r, [
      {
        layer: "domain_specific",
        source: via && via.source === "changed_file" ? "changed_file" : "context_chapter",
        trigger: via?.trigger ?? r.source_bundle ?? "",
        score: 0.9,
        reason: `capítulo ${r.source_bundle} activado pelo contexto (${via?.source ?? "context"}: ${via?.trigger ?? ""})`,
      },
    ]);
  }

  for (const r of agentsWave) {
    pushSelected(r, [
      {
        layer: "agents_wave",
        source: "agents_wave",
        trigger: "agents",
        score: 0.85,
        reason:
          "concern `agents`: requisito domain-specific da onda agêntica (nome/descrição publicados casam o vocabulário mandate/autonomia/kill-switch/tool-call)",
      },
    ]);
  }

  // R1 — named rule: the agent is a non-human principal.
  let extraEligible = 0;
  let r1Added = 0;
  if (agentsActive) {
    const already = new Set(selected.map((s) => s.requirement_id));
    for (const rid of R1_PRINCIPAL_SET) {
      if (already.has(rid)) continue;
      const r = ontology.requirements.find((x) => x.requirement_id === rid);
      if (!r || !atLevel(r)) continue;
      pushSelected(r, [
        {
          layer: "named_rule",
          source: "named_rule",
          trigger: R1_RULE_ID,
          score: 0.95,
          reason:
            `regra nomeada ${R1_RULE_ID} (decisão pós-P2 2026-08-31): o agente é um principal não-humano (ARC-015 — least privilege para agentes); conjunto {ACC-002, AUT-006, ENC-006} ∪ {DEP-011, DEP-013, DEP-014}`,
        },
      ]);
      r1Added += 1;
      const parked = narrowedByCategory.get(r.category);
      if (parked) {
        const at = parked.indexOf(rid);
        if (at >= 0) parked.splice(at, 1);
        if (parked.length === 0) narrowedByCategory.delete(r.category);
      }
      if (!baselineEligible.includes(r) && !domainEligible.includes(r)) extraEligible += 1;
    }
  }

  selected.sort((a, b) => a.requirement_id.localeCompare(b.requirement_id));
  const narrowed_out: NarrowedOutGroup[] = [...narrowedByCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, ids]) => ({
      category,
      count: ids.length,
      requirement_ids: ids.sort(),
      reason:
        category === "SES" && r2Applied
          ? `${R2_RULE_ID} (decisão pós-P2 2026-08-31): sem sinais de sessão/login/token de utilizador na tarefa, SES-* sai por narrowing declarado (o concernsMap do loader mantém auth → [AUT, ACC, SES]); com esses sinais na tarefa, fica`
          : `elegível na baseline ${level} (cap. 02) sem sinal na tarefa/contexto — excluído pelo narrowing, nunca em silêncio`,
    }));

  const notes: string[] = [];
  if (r1Added > 0) {
    notes.push(`${R1_RULE_ID}: ${r1Added} requisitos do principal não-humano seleccionados por regra nomeada (decisão pós-P2 2026-08-31).`);
  }
  if (r2Applied) {
    notes.push(`${R2_RULE_ID}: categoria SES excluída por narrowing de sinais — sem sinais de sessão/login/token de utilizador na tarefa.`);
  }
  if (agentsActive && agentsWave.length > 0) {
    notes.push(`agents_wave: ${agentsWave.length} requisitos domain-specific seleccionados pelo vocabulário agêntico publicado.`);
  }

  return {
    risk_level: level,
    eligible_count: baselineEligible.length + domainEligible.length + agentsWave.length + extraEligible,
    selected,
    narrowed_out,
    activated_chapters: activatedChapters,
    activated_categories: [...new Set([...activatedCategories, ...selected.map((s) => s.category)])].sort(),
    activation,
    input,
    notes,
  };
}
