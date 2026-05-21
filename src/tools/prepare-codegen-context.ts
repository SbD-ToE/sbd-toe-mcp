/**
 * prepare_sbd_toe_codegen_context
 *
 * Prepares deterministic, bite-sized grounded context for a downstream LLM to
 * generate, review or plan tests for code. **This tool does not generate code
 * and does not edit files.**
 *
 * Pipeline:
 *   1. Validate input + scope gate.
 *   2. Activation: map task text + concerns to concerns -> slice families
 *      and (if requested) regulatory frameworks. Activation is auditable via
 *      `activation_trace`.
 *   3. Resolution: pull deterministic data from the three published sources
 *      (runtime v0, runtime v1, overlay).
 *   4. Output: produce `activated_scope`, `g2_context`, `manual_grounding`,
 *      `regulatory_overlay`, `citation_map`, `completeness_report`,
 *      `llm_codegen_instructions` and `security_rationale_template`.
 *
 * Strict rules:
 *   - No canonical IDs are invented. Every ID surfaces only when the
 *     deterministic source publishes it.
 *   - Names are surfaced only when `manual_rastreabilidade.jsonl` carries
 *     them. Otherwise the entity is returned without a name.
 *   - If `runtime/v1` is missing, the tool returns `unsupported_scope` with
 *     a clear reason — it never falls back to invented data.
 *   - If overlay is requested but absent, the tool returns
 *     `unsupported_scope` for the overlay branch — never silently empty.
 */

import {
  RuntimeV1AssetMissingError,
  getG2Runtime,
  getV1EntityDisplayName,
  type AppSecRelation,
  type AppSecSlice,
  type ArtifactV1,
  type ControlObjectiveV1,
  type G2RuntimeData,
  type MechanismV1,
  type PracticeV1
} from "./g2-runtime-loader.js";
import {
  getOntologyData,
  type Control,
  type EvidencePattern,
  type Requirement
} from "./ontology-loader.js";
import {
  getRegulatoryOverlay,
  type RegulatoryFramework,
  type RegulatoryMapping,
  type RegulatoryObligation,
  type RegulatoryOverlayData,
  type RegulatoryPlaybook,
  resolveRegulatoryFramework
} from "./regulatory-overlay-loader.js";
import { expandQueryWithAliases } from "../backend/semantic-index-gateway.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CodegenMode = "codegen" | "review" | "test-plan";
export type RiskLevel = "L1" | "L2" | "L3";

export interface PrepareCodegenContextInput {
  task: string;
  risk_level?: RiskLevel;
  mode?: CodegenMode;
  stack?: string;
  exposure?: "local" | "internal" | "authenticated" | "public";
  data_sensitivity?: "low" | "personal" | "regulated" | "secrets";
  concerns?: string[];
  changed_files?: string[];
  regulatory_frameworks?: string[];
  include_regulatory_overlay?: boolean;
  debug?: boolean;
}

export type PrepareCodegenStatus =
  | "ready_for_codegen"
  | "needs_clarification"
  | "needs_decomposition"
  | "unsupported_scope";

export interface ActivationTraceEntry {
  /** Triggered by: explicit concern, task term, changed file, framework hint, semantic alias, compound term, or intent keyword. */
  source:
    | "explicit_concern"
    | "task_term"
    | "compound_term"
    | "alias_expansion"
    | "intent_keyword"
    | "changed_file"
    | "regulatory_framework"
    | "risk_level"
    | "scope_gate";
  /** What the activation produced (concern, slice_family, framework_id, decision). */
  produced: string;
  /** The literal token or input that triggered the activation. */
  trigger: string;
  /**
   * Deterministic score for the activation, in [0,1].
   * 1.0 = explicit input (concern, risk_level, framework).
   * 0.8 = task term direct match.
   * 0.7 = compound term match.
   * 0.6 = task term via alias expansion.
   * 0.5 = intent keyword or changed_file heuristic.
   * Scores are auditable and never used to invent entities — they only rank
   * what the deterministic resolvers already returned.
   */
  score: number;
  /** Confidence band — `deterministic` for explicit/lexicon, `semantic` for alias/intent activations. */
  confidence: "deterministic" | "semantic";
  /** Auditable reason explaining why the activation fired. */
  reason: string;
}

export interface ActivatedScope {
  requirements: Array<{
    requirement_id: string;
    name: string;
    category: string;
    source: "runtime_v0";
  }>;
  controls: Array<{
    control_id: string;
    name: string;
    domain: string;
    control_type: string;
    source: "runtime_v0";
    confidence: "direct" | "derived";
  }>;
  slices: Array<{
    slice_id: string;
    objective_family: string;
    scope: string;
    contract_status: string;
    source: "runtime_v1";
  }>;
  regulatory_obligations: Array<{
    obligation_id: string;
    framework_id: string;
    title: string;
    source: "overlay";
  }>;
}

export interface G2ContextEntity {
  entity_id: string;
  entity_type: "ControlObjective" | "Mechanism" | "Practice" | "Artifact";
  slice_id: string;
  slice_family: string;
  /** Surfaced only when `manual_rastreabilidade.jsonl` publishes a v1_entity_name. */
  name?: string;
  source: "runtime_v1";
}

export interface G2ContextRelation {
  subject_id: string;
  subject_type: string | null;
  predicate: string;
  object_id: string;
  object_type: string | null;
  source: "runtime_v1";
}

export interface G2ContextEvidencePattern {
  id: string;
  maps_to_requirement_id?: string;
  maps_to_control_id?: string;
  evidence_expectation?: string;
  verification_logic?: string;
  expected_artifact_type_ids?: string[];
  /** Score in [0,1] driving cap order. 1.0 = direct control match, 0.7 = active requirement, 0.5 = derived control match. */
  relevance_score: number;
  source: "runtime_v0";
}

const EVIDENCE_PATTERN_CAP = 25;

export interface G2Context {
  control_objectives: G2ContextEntity[];
  mechanisms: G2ContextEntity[];
  practices: G2ContextEntity[];
  artifacts: G2ContextEntity[];
  relations: G2ContextRelation[];
  evidence_patterns: G2ContextEvidencePattern[];
}

export interface ManualGroundingEntry {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  manual_commit_sha?: string;
  manual_v2_entity_id?: string;
  manual_v2_entity_label?: string;
  manual_v2_entity_type?: string;
  v1_entity_id?: string;
  v1_entity_name?: string;
  source: "runtime_v1";
}

export interface RegulatoryOverlayContext {
  frameworks: Array<{
    framework_id: string;
    short_code: string;
    name: string;
    scope_summary: string;
    source: "overlay";
  }>;
  obligations: Array<{
    obligation_id: string;
    framework_id: string;
    title: string;
    citation?: string;
    obligation_kind: string;
    source: "overlay";
  }>;
  mappings: Array<{
    mapping_id: string;
    framework_id: string;
    obligation_id: string;
    mapping_type: string;
    target_id: string;
    target_type: string;
    confidence?: number;
    source: "overlay";
  }>;
  playbooks: Array<{
    playbook_id: string;
    framework_ids: string[];
    title: string;
    source: "overlay";
  }>;
}

export interface CitationMapEntry {
  source:
    | "runtime_v0"
    | "runtime_v1"
    | "overlay"
    | "manual"
    | "manual_rastreabilidade";
  source_data: string;
}

export interface CompletenessReport {
  expected_objectives: number;
  returned_objectives: number;
  m_recall: number;
  expected_mechanisms: number;
  returned_mechanisms: number;
  expected_practices: number;
  returned_practices: number;
  expected_artifacts: number;
  returned_artifacts: number;
  named_v1_entities: number;
  unnamed_v1_entities: number;
  v1_consistency_mismatches: string[];
  v1_manifest_warnings: string[];
  /** Total evidence patterns matched before the relevance cap was applied. */
  evidence_patterns_total: number;
  /** Patterns retained in `g2_context.evidence_patterns` after the cap. */
  evidence_patterns_returned: number;
  /** Patterns dropped because of the cap (visible in debug.rejected_candidates). */
  evidence_patterns_capped: number;
  /** Cap value applied during this resolution. */
  evidence_pattern_cap: number;
}

export interface SecurityRationaleTemplate {
  task: string;
  decisions: Array<{
    decision: "<fill: what design choice was made>";
    rationale: "<fill: why, citing IDs from citation_map>";
    cited_ids: ["<requirement_id|control_id|slice_id|obligation_id>"];
  }>;
  validations: Array<{
    surface: "<fill: code path being validated>";
    rule: "<fill: validation rule>";
    rejection_behaviour: "<fill: how invalid input is rejected>";
  }>;
  expected_evidence: Array<{
    artefact: "<fill: test, log, doc, sbom, scan, attestation, ...>";
    location: "<fill: where to find it>";
    verifies: "<fill: which control/requirement id>";
  }>;
  residual_risk: "<fill: anything NOT addressed by this change>";
}

export interface PrepareCodegenContextResultReady {
  status: "ready_for_codegen";
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task">;
  activation_trace: ActivationTraceEntry[];
  activated_scope: ActivatedScope;
  g2_context: G2Context;
  manual_grounding: ManualGroundingEntry[];
  regulatory_overlay: RegulatoryOverlayContext;
  citation_map: Record<string, CitationMapEntry>;
  completeness_report: CompletenessReport;
  llm_codegen_instructions: string[];
  security_rationale_template: SecurityRationaleTemplate;
  provenance: {
    runtime_v0: string;
    runtime_v1: string;
    overlay: string | "absent";
  };
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

export interface PrepareCodegenContextResultBlocked {
  status: "needs_clarification" | "needs_decomposition" | "unsupported_scope";
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task">;
  reasons: string[];
  suggestions: string[];
  partial_activation_trace: ActivationTraceEntry[];
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

export type PrepareCodegenContextResult =
  | PrepareCodegenContextResultReady
  | PrepareCodegenContextResultBlocked;

// ---------------------------------------------------------------------------
// Activation lexicon (small, auditable; WP6 layers semantic scoring on top)
// ---------------------------------------------------------------------------

const VALID_CONCERNS = [
  "auth",
  "logging",
  "validation",
  "api",
  "config",
  "integrity",
  "distribution",
  "ide",
  "requirements",
  "architecture",
  "iac",
  "encryption",
  "secrets",
  "build",
  "supply_chain",
  "testing",
  "threat_modeling",
  "monitoring",
  "release",
  "deployment",
  "integration"
] as const;

export type Concern = (typeof VALID_CONCERNS)[number];

const CONCERN_LEXICON: ReadonlySet<string> = new Set(VALID_CONCERNS);

/**
 * Mapping of literal task tokens (lower-case) to the concerns they activate.
 * Single-source-of-truth, audited table. Tokens are matched via
 * whole-word/substring search on the lower-cased task string.
 */
const TASK_TERM_TO_CONCERNS: ReadonlyArray<readonly [string, readonly Concern[]]> = [
  ["auth", ["auth"]],
  ["authentication", ["auth"]],
  ["authorization", ["auth"]],
  ["login", ["auth"]],
  ["session", ["auth"]],
  ["jwt", ["auth"]],
  ["oauth", ["auth"]],
  ["token", ["auth"]],
  ["password", ["auth", "encryption"]],
  ["validation", ["validation", "api"]],
  ["validate", ["validation", "api"]],
  ["sanitize", ["validation"]],
  ["sanitization", ["validation"]],
  ["payload", ["validation", "api"]],
  ["input", ["validation"]],
  ["schema", ["validation", "api"]],
  ["endpoint", ["api"]],
  ["route", ["api"]],
  ["rest", ["api"]],
  ["http", ["api"]],
  ["graphql", ["api"]],
  ["logging", ["logging", "monitoring"]],
  ["audit", ["logging"]],
  ["log", ["logging"]],
  ["secret", ["secrets"]],
  ["hardcoded", ["secrets", "config"]],
  ["credential", ["secrets", "auth"]],
  ["api key", ["secrets"]],
  ["env var", ["secrets", "config"]],
  ["environment variable", ["secrets", "config"]],
  ["sbom", ["supply_chain"]],
  ["dependency", ["supply_chain"]],
  ["dependencies", ["supply_chain"]],
  ["build", ["build", "supply_chain"]],
  ["ci/cd", ["build", "release"]],
  ["pipeline", ["build", "release"]],
  ["release", ["release"]],
  ["deploy", ["deployment", "release"]],
  ["rollback", ["release"]],
  ["terraform", ["iac", "deployment"]],
  ["ansible", ["iac", "deployment"]],
  ["kubernetes", ["deployment", "config"]],
  ["docker", ["deployment", "config"]],
  ["container", ["deployment"]],
  ["threat model", ["threat_modeling"]],
  ["stride", ["threat_modeling"]],
  ["linddun", ["threat_modeling"]],
  ["test", ["testing"]],
  ["spec", ["testing"]],
  ["e2e", ["testing"]],
  ["fuzz", ["testing"]],
  ["encryption", ["encryption"]],
  ["tls", ["encryption", "api"]],
  ["cipher", ["encryption"]],
  ["hash", ["encryption"]],
  ["trust boundary", ["architecture"]],
  ["architecture", ["architecture"]],
  ["microservice", ["architecture", "integration"]],
  ["service-to-service", ["integration", "architecture"]],
  ["grpc", ["integration", "api"]],
  ["rpc", ["integration", "api"]],
  ["webhook", ["integration", "api"]],
  ["queue", ["integration"]],
  ["pubsub", ["integration"]],
  ["monitoring", ["monitoring", "logging"]],
  ["metric", ["monitoring"]],
  ["alert", ["monitoring"]]
] as const;

/**
 * Supplements the legacy `ontology.concernsMap` (which only knows the original
 * 12 concerns) with mappings for the WP5 concerns that target runtime v0
 * categories. Keys are concerns added by this module. The categories map to
 * existing runtime v0 categories so the v0 requirement filter still works.
 */
const CONCERN_TO_V0_CATEGORIES_SUPPLEMENT: Readonly<Record<Concern, string[]>> = {
  // Existing concerns intentionally left empty — fall back to ontology.concernsMap.
  auth: [],
  logging: [],
  validation: [],
  api: [],
  config: [],
  integrity: [],
  distribution: [],
  ide: [],
  requirements: [],
  architecture: [],
  iac: [],
  encryption: [],
  // New WP5 concerns -> runtime v0 categories
  secrets: ["CFG", "ENC"],
  build: ["CIC", "DEV"],
  supply_chain: ["CIC", "INT", "DEP"],
  testing: ["TST"],
  threat_modeling: ["THR"],
  monitoring: ["LOG", "OPS"],
  release: ["DPL", "OPS"],
  deployment: ["DPL", "IAC", "CNT"],
  integration: ["API", "INT"]
};

const CONCERN_TO_SLICE_FAMILY: Readonly<Record<Concern, string | null>> = {
  auth: "ACO-IAT",
  validation: "ACO-IVF",
  logging: "ACO-SLG",
  api: "ACO-IVF",
  config: "ACO-SPC",
  integrity: "ACO-SCBI",
  distribution: "ACO-RPR",
  ide: null,
  requirements: null,
  architecture: "ACO-ATB",
  iac: "ACO-RPR",
  encryption: "ACO-SPC",
  secrets: "ACO-SPC",
  build: "ACO-SCBI",
  supply_chain: "ACO-SCBI",
  testing: "ACO-TSV",
  threat_modeling: "ACO-TMR",
  monitoring: "ACO-SLG",
  release: "ACO-RPR",
  deployment: "ACO-RPR",
  integration: "ACO-ITS"
};

/**
 * PT codegen aliases that complement `CANONICAL_ALIASES_PT_EN` in the semantic
 * gateway. Each PT token is paired with the EN tokens that should be appended
 * before lexicon matching. Kept small and auditable.
 */
const CODEGEN_PT_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["segredo", ["secret"]],
  ["segredos", ["secrets"]],
  ["senha", ["password"]],
  ["validação", ["validation"]],
  ["validar", ["validate"]],
  ["sanitizar", ["sanitize"]],
  ["autenticação", ["authentication", "auth"]],
  ["autorização", ["authorization"]],
  ["registo", ["log"]],
  ["registos", ["logs"]],
  ["implantação", ["deployment", "deploy"]],
  ["lançamento", ["release"]],
  ["cadeia de fornecimento", ["supply chain"]],
  ["integração", ["integration"]],
  ["fronteira", ["boundary"]],
  ["arquitetura", ["architecture"]],
  ["chave de api", ["api key"]],
  ["variável de ambiente", ["environment variable"]]
] as const;

/**
 * Compound (multi-token) phrases that activate multiple concerns at once.
 * Single tokens stay in `TASK_TERM_TO_CONCERNS`; compounds capture the
 * canonical multi-domain asks the codegen scope gate needs to cover.
 */
const COMPOUND_TERM_TO_CONCERNS: ReadonlyArray<readonly [string, readonly Concern[]]> = [
  ["endpoint seguro", ["api", "auth", "validation", "logging"]],
  ["secure endpoint", ["api", "auth", "validation", "logging"]],
  ["api segura", ["api", "auth", "validation", "logging"]],
  ["secure api", ["api", "auth", "validation", "logging"]],
  ["segredo hardcoded", ["secrets", "config"]],
  ["hardcoded secret", ["secrets", "config"]],
  ["hardcoded credential", ["secrets", "config", "auth"]],
  ["pipeline release", ["build", "release"]],
  ["release pipeline", ["build", "release"]],
  ["build pipeline", ["build", "supply_chain"]],
  ["ci pipeline", ["build", "supply_chain"]],
  ["trust boundary", ["architecture"]],
  ["fronteira de confiança", ["architecture"]],
  ["service to service", ["integration", "architecture"]],
  ["serviço a serviço", ["integration", "architecture"]],
  ["secret rotation", ["secrets"]],
  ["rotação de segredo", ["secrets"]]
] as const;

/**
 * Codegen-specific intent classification. We do NOT reuse the semantic gateway
 * `classifyQueryIntent` here because its matcher uses bidirectional substring
 * matching that produces false positives (e.g. PT "este" matches keyword
 * "teste", which would spuriously activate `ci_cd_gates`). For activation
 * gating we need whole-word matches.
 *
 * Each entry lists keywords that must appear as whole words in the (alias-
 * expanded) task text, and the concerns the intent activates.
 */
const CODEGEN_INTENTS: ReadonlyArray<{
  intent: string;
  keywords: readonly string[];
  concerns: readonly Concern[];
}> = [
  {
    intent: "dependency_governance",
    keywords: ["sbom", "sca", "dependency", "dependencies", "vendor"],
    concerns: ["supply_chain"]
  },
  {
    intent: "ci_cd_gates",
    keywords: ["ci/cd", "pipeline", "workflow", "github actions"],
    concerns: ["build", "release"]
  },
  {
    intent: "repo_bootstrap",
    keywords: ["bootstrap", "scaffold"],
    concerns: ["architecture"]
  }
];

function taskMatchesKeyword(taskLower: string, keyword: string): boolean {
  // Whole-word / boundary match on lower-cased task text.
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
  return pattern.test(taskLower);
}

const VAGUE_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(torna|make).{0,40}\b(seguro|secure)\b/i,
    reason: "Pedido excessivamente abrangente ('make secure' / 'tornar seguro')"
  },
  {
    pattern: /\b(implementa|implement).{0,30}\b(compliance|cra|gdpr|nis2|dora)\b.{0,30}\b(toda|all)\b/i,
    reason: "Cobertura regulatória 'toda a API/aplicação' deve ser decomposta"
  },
  {
    pattern: /\b(fix|corrige|resolve)\b.{0,40}\b(all|todos|todas|every)\b.{0,40}\b(security|seguran[çc]a|issues|problemas)\b/i,
    reason: "Reparação 'de todos os problemas' é uma meta, não uma tarefa de codegen"
  },
  {
    pattern: /\b(complete|whole|across).{0,30}\b(architecture|api|application|app|repo|codebase)\b/i,
    reason: "Âmbito a cobrir toda a arquitectura/API/repo deve ser decomposto"
  },
  {
    pattern: /\bgera(r)? .{0,30}\barquitetura\b.{0,30}\bcompleta\b/i,
    reason: "Geração de arquitectura completa não é uma tarefa de codegen"
  }
];

// ---------------------------------------------------------------------------
// Input normalization
// ---------------------------------------------------------------------------

interface NormalizedInput {
  task: string;
  taskTrimmed: string;
  taskLower: string;
  tokenCount: number;
  mode: CodegenMode;
  risk_level?: RiskLevel;
  stack?: string;
  exposure?: PrepareCodegenContextInput["exposure"];
  data_sensitivity?: PrepareCodegenContextInput["data_sensitivity"];
  concerns: Concern[];
  unknownConcerns: string[];
  changed_files: string[];
  regulatory_frameworks: string[];
  include_regulatory_overlay: boolean;
  debug: boolean;
}

function normalizeInput(raw: unknown): NormalizedInput {
  const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const task = typeof data.task === "string" ? data.task : "";
  const taskTrimmed = task.trim();
  const taskLower = taskTrimmed.toLowerCase();
  const tokenCount = taskTrimmed.length === 0 ? 0 : taskTrimmed.split(/\s+/).length;

  const modeRaw = typeof data.mode === "string" ? data.mode : "codegen";
  const mode: CodegenMode =
    modeRaw === "review" || modeRaw === "test-plan" ? modeRaw : "codegen";

  const risk_level =
    data.risk_level === "L1" || data.risk_level === "L2" || data.risk_level === "L3"
      ? (data.risk_level as RiskLevel)
      : undefined;

  const concernsRaw = Array.isArray(data.concerns) ? data.concerns : [];
  const concerns: Concern[] = [];
  const unknownConcerns: string[] = [];
  for (const entry of concernsRaw) {
    if (typeof entry !== "string") continue;
    if (CONCERN_LEXICON.has(entry)) {
      concerns.push(entry as Concern);
    } else {
      unknownConcerns.push(entry);
    }
  }

  const changed_files = Array.isArray(data.changed_files)
    ? data.changed_files.filter((entry): entry is string => typeof entry === "string")
    : [];

  const regulatory_frameworks = Array.isArray(data.regulatory_frameworks)
    ? data.regulatory_frameworks.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0
      )
    : [];

  const normalized: NormalizedInput = {
    task,
    taskTrimmed,
    taskLower,
    tokenCount,
    mode,
    concerns,
    unknownConcerns,
    changed_files,
    regulatory_frameworks,
    include_regulatory_overlay: data.include_regulatory_overlay === true,
    debug: data.debug === true
  };
  if (risk_level) normalized.risk_level = risk_level;
  if (typeof data.stack === "string") normalized.stack = data.stack;
  if (
    data.exposure === "local" ||
    data.exposure === "internal" ||
    data.exposure === "authenticated" ||
    data.exposure === "public"
  ) {
    normalized.exposure = data.exposure;
  }
  if (
    data.data_sensitivity === "low" ||
    data.data_sensitivity === "personal" ||
    data.data_sensitivity === "regulated" ||
    data.data_sensitivity === "secrets"
  ) {
    normalized.data_sensitivity = data.data_sensitivity;
  }
  return normalized;
}

function inputEcho(
  raw: PrepareCodegenContextInput
): Required<Pick<PrepareCodegenContextInput, "task">> &
  Omit<PrepareCodegenContextInput, "task"> {
  return {
    task: raw.task ?? "",
    ...(raw.risk_level ? { risk_level: raw.risk_level } : {}),
    ...(raw.mode ? { mode: raw.mode } : {}),
    ...(raw.stack ? { stack: raw.stack } : {}),
    ...(raw.exposure ? { exposure: raw.exposure } : {}),
    ...(raw.data_sensitivity ? { data_sensitivity: raw.data_sensitivity } : {}),
    ...(raw.concerns ? { concerns: raw.concerns } : {}),
    ...(raw.changed_files ? { changed_files: raw.changed_files } : {}),
    ...(raw.regulatory_frameworks
      ? { regulatory_frameworks: raw.regulatory_frameworks }
      : {}),
    ...(typeof raw.include_regulatory_overlay === "boolean"
      ? { include_regulatory_overlay: raw.include_regulatory_overlay }
      : {}),
    ...(typeof raw.debug === "boolean" ? { debug: raw.debug } : {})
  };
}

// ---------------------------------------------------------------------------
// Activation engine
// ---------------------------------------------------------------------------

interface ActivationResult {
  concerns: Concern[];
  sliceFamilies: string[];
  trace: ActivationTraceEntry[];
  rejected: ActivationTraceEntry[];
  notes: string[];
  /** Per-concern aggregated score (max over contributing trace entries). */
  concernScores: Map<Concern, number>;
  /** Per-slice-family aggregated score. */
  sliceFamilyScores: Map<string, number>;
}

function expandTaskText(taskLower: string): {
  expanded: string;
  appliedAliases: Array<{ pt: string; en: readonly string[] }>;
} {
  const gatewayExpansion = expandQueryWithAliases(taskLower).toLowerCase();
  let expanded = gatewayExpansion;
  const applied: Array<{ pt: string; en: readonly string[] }> = [];
  for (const [pt, en] of CODEGEN_PT_ALIASES) {
    if (expanded.includes(pt)) {
      expanded = `${expanded} ${en.join(" ")}`;
      applied.push({ pt, en });
    }
  }
  return { expanded, appliedAliases: applied };
}

function recordActivation(
  trace: ActivationTraceEntry[],
  concerns: Set<Concern>,
  scores: Map<Concern, number>,
  rejected: ActivationTraceEntry[],
  entry: ActivationTraceEntry,
  targetConcern: Concern,
  options: { capDuplicates: boolean }
): void {
  const existing = scores.get(targetConcern);
  if (existing === undefined) {
    concerns.add(targetConcern);
    scores.set(targetConcern, entry.score);
    trace.push(entry);
    return;
  }
  if (entry.score > existing) {
    scores.set(targetConcern, entry.score);
    trace.push(entry);
    return;
  }
  if (options.capDuplicates) {
    rejected.push(entry);
  } else {
    trace.push(entry);
  }
}

function activate(input: NormalizedInput): ActivationResult {
  const trace: ActivationTraceEntry[] = [];
  const rejected: ActivationTraceEntry[] = [];
  const notes: string[] = [];
  const concerns = new Set<Concern>();
  const concernScores = new Map<Concern, number>();

  // 1) Explicit concerns from the caller (highest authority).
  for (const concern of input.concerns) {
    recordActivation(
      trace,
      concerns,
      concernScores,
      rejected,
      {
        source: "explicit_concern",
        produced: concern,
        trigger: concern,
        score: 1.0,
        confidence: "deterministic",
        reason: "User supplied this concern in the `concerns` array."
      },
      concern,
      { capDuplicates: false }
    );
  }
  for (const unknown of input.unknownConcerns) {
    rejected.push({
      source: "explicit_concern",
      produced: "<rejected>",
      trigger: unknown,
      score: 0,
      confidence: "deterministic",
      reason: `Concern '${unknown}' is not in the WP5/WP6 lexicon (${VALID_CONCERNS.join(", ")}).`
    });
  }

  // 2) Alias expansion + direct task-term matches.
  const { expanded, appliedAliases } = expandTaskText(input.taskLower);
  for (const alias of appliedAliases) {
    notes.push(
      `alias_expansion: '${alias.pt}' -> [${alias.en.join(", ")}]`
    );
  }

  // 2a) Compound phrases (run first — they encode canonical multi-domain asks).
  // Whole-word match prevents accidental hits inside larger tokens.
  for (const [phrase, mapped] of COMPOUND_TERM_TO_CONCERNS) {
    if (!taskMatchesKeyword(expanded, phrase)) continue;
    for (const concern of mapped) {
      recordActivation(
        trace,
        concerns,
        concernScores,
        rejected,
        {
          source: "compound_term",
          produced: concern,
          trigger: phrase,
          score: 0.7,
          confidence: "semantic",
          reason: `Compound phrase '${phrase}' activates ${concern}.`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }

  // 2b) Single-token task terms. Whole-word matching prevents false positives
  // like `test` inside `latest` or `log` inside `logical`.
  for (const [term, mapped] of TASK_TERM_TO_CONCERNS) {
    if (!taskMatchesKeyword(expanded, term)) continue;
    const viaAlias =
      !taskMatchesKeyword(input.taskLower, term) &&
      appliedAliases.some((alias) => alias.en.includes(term));
    for (const concern of mapped) {
      recordActivation(
        trace,
        concerns,
        concernScores,
        rejected,
        {
          source: viaAlias ? "alias_expansion" : "task_term",
          produced: concern,
          trigger: term,
          score: viaAlias ? 0.6 : 0.8,
          confidence: viaAlias ? "semantic" : "deterministic",
          reason: viaAlias
            ? `Task text matches '${term}' after PT/EN alias expansion.`
            : `Task text contains '${term}'.`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }

  // 2c) Whole-word intent classification (codegen-specific; stricter than the
  // gateway's substring matcher to avoid PT/EN false positives).
  for (const intentEntry of CODEGEN_INTENTS) {
    const matchedKeyword = intentEntry.keywords.find((keyword) =>
      taskMatchesKeyword(expanded, keyword)
    );
    if (!matchedKeyword) continue;
    for (const concern of intentEntry.concerns) {
      recordActivation(
        trace,
        concerns,
        concernScores,
        rejected,
        {
          source: "intent_keyword",
          produced: concern,
          trigger: intentEntry.intent,
          score: 0.5,
          confidence: "semantic",
          reason: `Intent '${intentEntry.intent}' matched keyword '${matchedKeyword}'.`
        },
        concern,
        { capDuplicates: false }
      );
    }
  }

  // 3) Changed-file path heuristics.
  for (const file of input.changed_files) {
    const lower = file.toLowerCase();
    const fileHits: Concern[] = [];
    if (/route|router|controller|handler|endpoint/.test(lower)) fileHits.push("api");
    if (/auth|session|jwt|login/.test(lower)) fileHits.push("auth");
    if (/log|logger/.test(lower)) fileHits.push("logging");
    if (/config|env|settings/.test(lower)) fileHits.push("config");
    if (/secret|credential/.test(lower)) fileHits.push("secrets");
    if (/test|spec/.test(lower)) fileHits.push("testing");
    if (/dockerfile|docker-compose|k8s|kubernetes|terraform/.test(lower))
      fileHits.push("deployment");
    for (const concern of fileHits) {
      recordActivation(
        trace,
        concerns,
        concernScores,
        rejected,
        {
          source: "changed_file",
          produced: concern,
          trigger: file,
          score: 0.5,
          confidence: "semantic",
          reason: `Changed file path matches '${concern}' heuristics.`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }

  // 4) Slice families (ranked by max contributing concern score).
  const sliceFamilyScores = new Map<string, number>();
  for (const concern of concerns) {
    const family = CONCERN_TO_SLICE_FAMILY[concern];
    if (!family) continue;
    const score = concernScores.get(concern) ?? 0;
    const existing = sliceFamilyScores.get(family);
    if (existing === undefined || score > existing) {
      sliceFamilyScores.set(family, score);
    }
    trace.push({
      source: "task_term",
      produced: family,
      trigger: concern,
      score,
      confidence: "deterministic",
      reason: `Concern '${concern}' maps to AppSec Core slice family '${family}'.`
    });
  }

  // 5) Risk level (informational trace entry, no concern activation).
  if (input.risk_level) {
    trace.push({
      source: "risk_level",
      produced: input.risk_level,
      trigger: input.risk_level,
      score: 1.0,
      confidence: "deterministic",
      reason: `Risk level ${input.risk_level} filters runtime v0 requirements.`
    });
  }

  return {
    concerns: [...concerns],
    sliceFamilies: [...sliceFamilyScores.keys()].sort(
      (a, b) =>
        (sliceFamilyScores.get(b) ?? 0) - (sliceFamilyScores.get(a) ?? 0) ||
        a.localeCompare(b)
    ),
    trace,
    rejected,
    notes,
    concernScores,
    sliceFamilyScores
  };
}

// ---------------------------------------------------------------------------
// Scope gate
// ---------------------------------------------------------------------------

interface GateDecision {
  status: PrepareCodegenStatus | "ready_for_codegen";
  reasons: string[];
  suggestions: string[];
}

function gateBeforeActivation(input: NormalizedInput): GateDecision | null {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (input.taskTrimmed.length === 0) {
    reasons.push("Campo `task` está vazio.");
    suggestions.push("Indica o que pretendes fazer ('Adicionar validação ao endpoint X').");
  } else if (input.tokenCount < 4) {
    reasons.push(`Task tem apenas ${input.tokenCount} palavras — demasiado curta para grounding.`);
    suggestions.push("Inclui pelo menos endpoint/módulo, ação concreta e contexto.");
  }

  for (const { pattern, reason } of VAGUE_PATTERNS) {
    if (pattern.test(input.taskTrimmed)) {
      return {
        status: "needs_decomposition",
        reasons: [reason],
        suggestions: [
          "Decompõe o pedido em tarefas concretas (uma superfície técnica + uma fase + 1-3 concerns).",
          "Exemplo OK: 'Adicionar validação de payload ao endpoint PATCH /users/:id/email.'"
        ]
      };
    }
  }

  if (reasons.length > 0) {
    return { status: "needs_clarification", reasons, suggestions };
  }

  return null;
}

interface PostActivationGateInput {
  input: NormalizedInput;
  activation: ActivationResult;
  estimatedRequirements: number;
}

function gateAfterActivation(args: PostActivationGateInput): GateDecision | null {
  const { input, activation, estimatedRequirements } = args;
  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (activation.sliceFamilies.length > 3) {
    reasons.push(
      `Pedido activa ${activation.sliceFamilies.length} slice families (${activation.sliceFamilies.join(
        ", "
      )}) — máximo recomendado: 3.`
    );
    suggestions.push(
      "Reparte por slice family. Cada PR/PR-step deve ficar em 1–3 slices."
    );
  }

  // Hard requirement cap: above ~50 requirements the LLM context becomes
  // unfocused and asks should be decomposed. Slice-family count (max 3) is the
  // primary decomposition signal; this cap catches multi-concern asks that
  // sneak under the slice-family threshold.
  if (estimatedRequirements > 50) {
    reasons.push(
      `Pedido activaria ${estimatedRequirements} requisitos v0 — máximo permitido para codegen: 50.`
    );
    suggestions.push(
      "Reduz o âmbito (risk_level mais baixo, concerns mais específicos, ou divide o endpoint)."
    );
  }

  if (
    activation.concerns.length === 0 &&
    input.tokenCount >= 4 &&
    activation.trace.length === 0
  ) {
    return {
      status: "needs_clarification",
      reasons: [
        "Não consegui activar nenhum concern a partir da task. O ask pode ser demasiado abstracto ou usar terminologia fora do lexicon."
      ],
      suggestions: [
        "Adiciona `concerns` explícitos (e.g. ['api', 'validation']).",
        `Concerns suportados: ${VALID_CONCERNS.join(", ")}.`
      ]
    };
  }

  if (reasons.length > 0) {
    return { status: "needs_decomposition", reasons, suggestions };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

function resolveActivatedSlices(
  data: G2RuntimeData,
  sliceFamilies: string[]
): AppSecSlice[] {
  if (sliceFamilies.length === 0) return [];
  const set = new Set(sliceFamilies);
  return data.slices.filter((slice) => set.has(slice.objective_family));
}

function entitiesForSlices<T extends { slice_id: string }>(
  entities: T[],
  sliceIds: Set<string>
): T[] {
  if (sliceIds.size === 0) return [];
  return entities.filter((entity) => sliceIds.has(entity.slice_id));
}

function projectV1Entity(
  entity: ControlObjectiveV1 | MechanismV1 | PracticeV1 | ArtifactV1,
  data: G2RuntimeData
): G2ContextEntity {
  const name = getV1EntityDisplayName(data, entity.entity_id);
  const projected: G2ContextEntity = {
    entity_id: entity.entity_id,
    entity_type: entity.entity_type,
    slice_id: entity.slice_id,
    slice_family: entity.slice_family,
    source: "runtime_v1"
  };
  if (name) projected.name = name;
  return projected;
}

function projectRelation(relation: AppSecRelation): G2ContextRelation {
  return {
    subject_id: relation.subject_id,
    subject_type: relation.subject_type,
    predicate: relation.predicate,
    object_id: relation.object_id,
    object_type: relation.object_type,
    source: "runtime_v1"
  };
}

function categoriesForConcerns(concerns: Concern[]): Set<string> {
  const ontology = getOntologyData();
  const categories = new Set<string>();
  for (const concern of concerns) {
    for (const category of ontology.concernsMap[concern] ?? []) {
      categories.add(category);
    }
    for (const category of CONCERN_TO_V0_CATEGORIES_SUPPLEMENT[concern] ?? []) {
      categories.add(category);
    }
  }
  return categories;
}

function resolveRuntimeV0(args: {
  riskLevel: RiskLevel | undefined;
  concerns: Concern[];
}): {
  requirements: Requirement[];
  controls: Array<Control & { confidence: "direct" | "derived" }>;
  evidencePatterns: EvidencePattern[];
  activeCategories: string[];
} {
  const ontology = getOntologyData();
  const concernCategories = categoriesForConcerns(args.concerns);

  let filteredRequirements = ontology.requirements;
  if (args.riskLevel) {
    filteredRequirements = filteredRequirements.filter(
      (requirement) => requirement.applicable_levels?.[args.riskLevel as RiskLevel] === true
    );
  }
  if (concernCategories.size > 0) {
    filteredRequirements = filteredRequirements.filter((requirement) =>
      concernCategories.has(requirement.category)
    );
  }

  const links = ontology.requirementControlLinks ?? [];
  const requirementIds = new Set(filteredRequirements.map((r) => r.requirement_id));
  const directControlIds = new Set<string>();
  for (const link of links) {
    if (link.link_type !== "maps_to_control") continue;
    if (!requirementIds.has(link.source_id)) continue;
    directControlIds.add(link.target_id);
  }

  const activeDomains = new Set<string>();
  for (const category of concernCategories) {
    const domains = ontology.domainMapping[category] ?? [];
    for (const domain of domains) activeDomains.add(domain);
  }

  const controlsOut: Array<Control & { confidence: "direct" | "derived" }> = [];
  const seenControlIds = new Set<string>();
  for (const control of ontology.controls) {
    if (directControlIds.has(control.control_id)) {
      controlsOut.push({ ...control, confidence: "direct" });
      seenControlIds.add(control.control_id);
    }
  }
  if (activeDomains.size > 0) {
    for (const control of ontology.controls) {
      if (seenControlIds.has(control.control_id)) continue;
      if (!activeDomains.has(control.domain)) continue;
      controlsOut.push({ ...control, confidence: "derived" });
      seenControlIds.add(control.control_id);
    }
  }

  const evidenceMatches: EvidencePattern[] = [];
  if (ontology.evidencePatterns) {
    for (const pattern of ontology.evidencePatterns) {
      const touchesRequirement =
        typeof pattern.maps_to_requirement_id === "string" &&
        requirementIds.has(pattern.maps_to_requirement_id);
      const touchesControl =
        typeof pattern.maps_to_control_id === "string" &&
        seenControlIds.has(pattern.maps_to_control_id);
      if (touchesRequirement || touchesControl) {
        evidenceMatches.push(pattern);
      }
    }
  }

  return {
    requirements: filteredRequirements,
    controls: controlsOut,
    evidencePatterns: evidenceMatches,
    activeCategories: [...concernCategories].sort()
  };
}

function estimateV0RequirementCount(
  riskLevel: RiskLevel | undefined,
  concerns: Concern[]
): number {
  // Estimate before producing the heavy output, to drive the scope gate.
  const ontology = getOntologyData();
  let filtered = ontology.requirements;
  if (riskLevel) {
    filtered = filtered.filter(
      (requirement) => requirement.applicable_levels?.[riskLevel] === true
    );
  }
  if (concerns.length > 0) {
    const categories = categoriesForConcerns(concerns);
    if (categories.size > 0) {
      filtered = filtered.filter((requirement) => categories.has(requirement.category));
    }
  }
  return filtered.length;
}

// ---------------------------------------------------------------------------
// Regulatory overlay resolution
// ---------------------------------------------------------------------------

interface OverlayResolution {
  status: "skipped" | "absent" | "resolved" | "unsupported";
  reasons: string[];
  context: RegulatoryOverlayContext;
  activatedObligations: RegulatoryObligation[];
  activatedFrameworks: RegulatoryFramework[];
}

function resolveOverlay(input: NormalizedInput): OverlayResolution {
  const wantsOverlay =
    input.include_regulatory_overlay || input.regulatory_frameworks.length > 0;
  const emptyContext: RegulatoryOverlayContext = {
    frameworks: [],
    obligations: [],
    mappings: [],
    playbooks: []
  };

  if (!wantsOverlay) {
    return {
      status: "skipped",
      reasons: [],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const data: RegulatoryOverlayData = getRegulatoryOverlay();
  if (data.status === "absent") {
    return {
      status: "absent",
      reasons: [
        `Overlay regulatório ausente: ${
          data.absentReason ?? "overlay artefacts not published"
        }.`
      ],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const requested = input.regulatory_frameworks;
  if (requested.length === 0) {
    return {
      status: "resolved",
      reasons: [
        "include_regulatory_overlay=true sem frameworks específicos — devolvemos apenas catálogo de frameworks publicados."
      ],
      context: {
        frameworks: data.frameworks.map((framework) => ({
          framework_id: framework.framework_id,
          short_code: framework.short_code,
          name: framework.name,
          scope_summary: framework.scope_summary,
          source: "overlay" as const
        })),
        obligations: [],
        mappings: [],
        playbooks: []
      },
      activatedObligations: [],
      activatedFrameworks: data.frameworks
    };
  }

  const activatedFrameworks: RegulatoryFramework[] = [];
  const unmatched: string[] = [];
  for (const requestedFramework of requested) {
    const resolved = resolveRegulatoryFramework(data, requestedFramework);
    if (resolved) activatedFrameworks.push(resolved);
    else unmatched.push(requestedFramework);
  }

  if (activatedFrameworks.length === 0) {
    return {
      status: "unsupported",
      reasons: [
        `Nenhuma framework regulatória pedida foi reconhecida: [${unmatched.join(", ")}].`,
        `Frameworks publicadas: ${data.frameworks
          .map((framework) => `${framework.short_code} (${framework.framework_id})`)
          .join(", ")}.`
      ],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const activatedFrameworkIds = new Set(
    activatedFrameworks.map((framework) => framework.framework_id)
  );

  const obligations: RegulatoryObligation[] = [];
  for (const frameworkId of activatedFrameworkIds) {
    const bucket = data.obligationsByFramework.get(frameworkId) ?? [];
    for (const obligation of bucket) obligations.push(obligation);
  }

  const obligationIds = new Set(obligations.map((entry) => entry.obligation_id));
  const mappings: RegulatoryMapping[] = [];
  for (const obligationId of obligationIds) {
    const bucket = data.mappingsByObligation.get(obligationId) ?? [];
    for (const mapping of bucket) mappings.push(mapping);
  }

  const playbookIds = new Set<string>();
  for (const mapping of mappings) {
    if (mapping.playbook_id) playbookIds.add(mapping.playbook_id);
  }
  const playbooks: RegulatoryPlaybook[] = [];
  for (const playbookId of playbookIds) {
    const playbook = data.playbooksById.get(playbookId);
    if (playbook) playbooks.push(playbook);
  }

  return {
    status: "resolved",
    reasons:
      unmatched.length > 0
        ? [`Frameworks não reconhecidas, ignoradas: [${unmatched.join(", ")}].`]
        : [],
    context: {
      frameworks: activatedFrameworks.map((framework) => ({
        framework_id: framework.framework_id,
        short_code: framework.short_code,
        name: framework.name,
        scope_summary: framework.scope_summary,
        source: "overlay" as const
      })),
      obligations: obligations.map((obligation) => {
        const out: RegulatoryOverlayContext["obligations"][number] = {
          obligation_id: obligation.obligation_id,
          framework_id: obligation.framework_id,
          title: obligation.title,
          obligation_kind: obligation.obligation_kind,
          source: "overlay" as const
        };
        if (obligation.citation) out.citation = obligation.citation;
        return out;
      }),
      mappings: mappings.map((mapping) => {
        const out: RegulatoryOverlayContext["mappings"][number] = {
          mapping_id: mapping.mapping_id,
          framework_id: mapping.framework_id,
          obligation_id: mapping.obligation_id,
          mapping_type: mapping.mapping_type,
          target_id: mapping.target_id,
          target_type: mapping.target_type,
          source: "overlay" as const
        };
        if (typeof mapping.confidence === "number") out.confidence = mapping.confidence;
        return out;
      }),
      playbooks: playbooks.map((playbook) => ({
        playbook_id: playbook.playbook_id,
        framework_ids: playbook.framework_ids,
        title: playbook.title,
        source: "overlay" as const
      }))
    },
    activatedObligations: obligations,
    activatedFrameworks
  };
}

// ---------------------------------------------------------------------------
// LLM instructions
// ---------------------------------------------------------------------------

function buildLlmInstructions(args: {
  mode: CodegenMode;
  citedIds: string[];
  hasOverlay: boolean;
  riskLevel: RiskLevel | undefined;
}): string[] {
  const instructions: string[] = [];
  instructions.push(
    "Generate code or review changes ONLY against the deterministic IDs provided in `citation_map`. Do NOT invent SbD-ToE requirement, control, slice, mechanism or obligation IDs."
  );
  instructions.push(
    "For each non-trivial design decision, populate the `security_rationale_template.decisions[].cited_ids` with IDs from `citation_map`. If no ID applies, say so explicitly."
  );
  instructions.push(
    "List concrete validations in `security_rationale_template.validations` (surface, rule, rejection behaviour). Do NOT claim conformity without naming the validation."
  );
  instructions.push(
    "List expected evidence in `security_rationale_template.expected_evidence` (test paths, log shapes, SBOM, attestation, scan reports). Code on its own is NOT evidence of compliance."
  );
  if (args.hasOverlay) {
    instructions.push(
      "Regulatory obligations are an EXTERNAL cross-check. Cite obligation IDs in security_rationale only when the change directly addresses them. Do NOT declare GDPR/DORA/CRA/NIS2 compliance."
    );
  }
  instructions.push(
    "If the requested task does not match the activated scope, REPLY with `status: needs_clarification` and request specifics — do not fabricate IDs."
  );
  if (args.mode === "review") {
    instructions.push(
      "Review mode: enumerate findings per changed_file, mapped to the activated_scope. Each finding must reference at least one citation_map ID or say 'no normative ID covers this'."
    );
  }
  if (args.mode === "test-plan") {
    instructions.push(
      "Test-plan mode: produce a checklist of tests grouped by validated_id, with input/expectation, and reference evidence_patterns when available."
    );
  }
  if (args.riskLevel) {
    instructions.push(
      `Risk level ${args.riskLevel} is the active filter — do not propose controls applicable only at a higher level unless explicitly justified.`
    );
  }
  if (args.citedIds.length === 0) {
    instructions.push(
      "Citation_map is empty. This is a strong signal the activated scope did not yield deterministic anchors — request clarification before generating code."
    );
  }
  return instructions;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const PROVENANCE_V0 = "data/publish/runtime/*.json + data/publish/ontology/*";
const PROVENANCE_V1 = "data/publish/runtime/v1/*";
const PROVENANCE_OVERLAY = "data/publish/overlay/*";

function blocked(
  input: NormalizedInput,
  raw: PrepareCodegenContextInput,
  status: PrepareCodegenContextResultBlocked["status"],
  reasons: string[],
  suggestions: string[],
  partial: ActivationTraceEntry[],
  debug?: { rejected: ActivationTraceEntry[]; notes: string[] }
): PrepareCodegenContextResultBlocked {
  const result: PrepareCodegenContextResultBlocked = {
    status,
    mode: input.mode,
    input_echo: inputEcho(raw),
    reasons,
    suggestions,
    partial_activation_trace: partial
  };
  if (input.debug && debug) {
    result.debug = {
      rejected_candidates: debug.rejected,
      notes: debug.notes
    };
  }
  return result;
}

export function handlePrepareCodegenContext(
  raw: PrepareCodegenContextInput
): PrepareCodegenContextResult {
  const input = normalizeInput(raw);

  const preGate = gateBeforeActivation(input);
  if (preGate && preGate.status !== "ready_for_codegen") {
    return blocked(
      input,
      raw,
      preGate.status as PrepareCodegenContextResultBlocked["status"],
      preGate.reasons,
      preGate.suggestions,
      [],
      { rejected: [], notes: [] }
    );
  }

  const activation = activate(input);

  const estimatedRequirements = estimateV0RequirementCount(
    input.risk_level,
    activation.concerns
  );

  const postGate = gateAfterActivation({
    input,
    activation,
    estimatedRequirements
  });
  if (postGate && postGate.status !== "ready_for_codegen") {
    return blocked(
      input,
      raw,
      postGate.status as PrepareCodegenContextResultBlocked["status"],
      postGate.reasons,
      postGate.suggestions,
      activation.trace,
      { rejected: activation.rejected, notes: activation.notes }
    );
  }

  // Runtime v1 — fail clearly if assets missing.
  let g2Data: G2RuntimeData;
  try {
    g2Data = getG2Runtime();
  } catch (error) {
    if (error instanceof RuntimeV1AssetMissingError) {
      return blocked(
        input,
        raw,
        "unsupported_scope",
        [
          "AppSec Core v1 runtime ausente neste deployment.",
          `Ficheiros em falta: ${error.missingPaths.join(", ")}.`
        ],
        [
          "Regenera o checkout (npm run checkout:backend) ou usa apenas record types runtime v0 noutras tools."
        ],
        activation.trace,
        { rejected: activation.rejected, notes: activation.notes }
      );
    }
    throw error;
  }

  const overlayResolution = resolveOverlay(input);
  if (overlayResolution.status === "absent" || overlayResolution.status === "unsupported") {
    return blocked(
      input,
      raw,
      "unsupported_scope",
      overlayResolution.reasons,
      [
        "Remove `regulatory_frameworks` / `include_regulatory_overlay` se o overlay não estiver publicado neste deployment, ou pede o conjunto reduzido de frameworks suportadas."
      ],
      activation.trace,
      { rejected: activation.rejected, notes: activation.notes }
    );
  }

  // ----- Resolve activated scope ----------------------------------------
  const v0 = resolveRuntimeV0({
    riskLevel: input.risk_level,
    concerns: activation.concerns
  });

  const activatedSlices = resolveActivatedSlices(g2Data, activation.sliceFamilies);
  const activatedSliceIds = new Set(activatedSlices.map((slice) => slice.slice_id));

  const activatedCOs = entitiesForSlices(g2Data.controlObjectives, activatedSliceIds);
  const activatedMechanisms = entitiesForSlices(g2Data.mechanisms, activatedSliceIds);
  const activatedPractices = entitiesForSlices(g2Data.practices, activatedSliceIds);
  const activatedArtifacts = entitiesForSlices(g2Data.artifacts, activatedSliceIds);

  const activatedEntityIds = new Set<string>();
  for (const list of [
    activatedCOs,
    activatedMechanisms,
    activatedPractices,
    activatedArtifacts
  ]) {
    for (const entity of list) activatedEntityIds.add(entity.entity_id);
  }

  const activatedRelations = g2Data.relations.filter((relation) => {
    if (activatedSliceIds.has(relation.object_id)) return true;
    if (activatedEntityIds.has(relation.subject_id)) return true;
    if (activatedEntityIds.has(relation.object_id)) return true;
    return false;
  });

  const directControlIds = new Set(
    v0.controls.filter((control) => control.confidence === "direct").map(
      (control) => control.control_id
    )
  );
  const derivedControlIds = new Set(
    v0.controls.filter((control) => control.confidence === "derived").map(
      (control) => control.control_id
    )
  );
  const activeRequirementIdsForEvidence = new Set(
    v0.requirements.map((requirement) => requirement.requirement_id)
  );

  function projectEvidencePattern(
    pattern: EvidencePattern,
    relevanceScore: number
  ): G2ContextEvidencePattern {
    const projection: G2ContextEvidencePattern = {
      id: pattern.id,
      relevance_score: relevanceScore,
      source: "runtime_v0"
    };
    if (pattern.maps_to_requirement_id)
      projection.maps_to_requirement_id = pattern.maps_to_requirement_id;
    if (pattern.maps_to_control_id)
      projection.maps_to_control_id = pattern.maps_to_control_id;
    if (pattern.evidence_expectation)
      projection.evidence_expectation = pattern.evidence_expectation;
    if (pattern.verification_logic)
      projection.verification_logic = pattern.verification_logic;
    if (pattern.expected_artifact_type_ids && pattern.expected_artifact_type_ids.length > 0) {
      projection.expected_artifact_type_ids = pattern.expected_artifact_type_ids;
    }
    return projection;
  }

  const scoredEvidencePatterns = v0.evidencePatterns.map((pattern) => {
    let score = 0;
    if (
      pattern.maps_to_control_id &&
      directControlIds.has(pattern.maps_to_control_id)
    ) {
      score = Math.max(score, 1.0);
    }
    if (
      pattern.maps_to_requirement_id &&
      activeRequirementIdsForEvidence.has(pattern.maps_to_requirement_id)
    ) {
      score = Math.max(score, 0.7);
    }
    if (
      pattern.maps_to_control_id &&
      derivedControlIds.has(pattern.maps_to_control_id)
    ) {
      score = Math.max(score, 0.5);
    }
    return { pattern, score };
  });
  scoredEvidencePatterns.sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id));
  const keptEvidencePatterns = scoredEvidencePatterns.slice(0, EVIDENCE_PATTERN_CAP);
  const cappedEvidencePatterns = scoredEvidencePatterns.slice(EVIDENCE_PATTERN_CAP);

  const g2Context: G2Context = {
    control_objectives: activatedCOs.map((entity) => projectV1Entity(entity, g2Data)),
    mechanisms: activatedMechanisms.map((entity) => projectV1Entity(entity, g2Data)),
    practices: activatedPractices.map((entity) => projectV1Entity(entity, g2Data)),
    artifacts: activatedArtifacts.map((entity) => projectV1Entity(entity, g2Data)),
    relations: activatedRelations.map(projectRelation),
    evidence_patterns: keptEvidencePatterns.map(({ pattern, score }) =>
      projectEvidencePattern(pattern, score)
    )
  };

  // ----- Manual grounding ----------------------------------------------
  const manualGrounding: ManualGroundingEntry[] = [];
  for (const entityId of activatedEntityIds) {
    const bucket = g2Data.rastreabilidadeByV1EntityId.get(entityId);
    if (!bucket) continue;
    for (const entry of bucket) {
      manualGrounding.push({
        rastreabilidade_role: entry.rastreabilidade_role,
        ...(entry.manual_chapter !== undefined
          ? { manual_chapter: entry.manual_chapter }
          : {}),
        ...(entry.manual_file !== undefined ? { manual_file: entry.manual_file } : {}),
        ...(entry.manual_commit_sha ? { manual_commit_sha: entry.manual_commit_sha } : {}),
        ...(entry.v1_entity_id ? { v1_entity_id: entry.v1_entity_id } : {}),
        ...(entry.v1_entity_name ? { v1_entity_name: entry.v1_entity_name } : {}),
        source: "runtime_v1"
      });
    }
  }

  // ----- Activated scope projection ------------------------------------
  const activatedScope: ActivatedScope = {
    requirements: v0.requirements.map((requirement) => ({
      requirement_id: requirement.requirement_id,
      name: requirement.name,
      category: requirement.category,
      type: requirement.type,
      source: "runtime_v0" as const
    })) as ActivatedScope["requirements"],
    controls: v0.controls.map((control) => ({
      control_id: control.control_id,
      name: control.name,
      domain: control.domain,
      control_type: control.control_type,
      source: "runtime_v0" as const,
      confidence: control.confidence
    })),
    slices: activatedSlices.map((slice) => ({
      slice_id: slice.slice_id,
      objective_family: slice.objective_family,
      scope: slice.scope,
      contract_status: slice.contract_status,
      source: "runtime_v1" as const
    })),
    regulatory_obligations: overlayResolution.activatedObligations.map((obligation) => ({
      obligation_id: obligation.obligation_id,
      framework_id: obligation.framework_id,
      title: obligation.title,
      source: "overlay" as const
    }))
  };

  // ----- Citation map ---------------------------------------------------
  const citationMap: Record<string, CitationMapEntry> = {};
  for (const requirement of v0.requirements) {
    citationMap[requirement.requirement_id] = {
      source: "runtime_v0",
      source_data: "data/publish/runtime/requirements.json"
    };
  }
  for (const control of v0.controls) {
    citationMap[control.control_id] = {
      source: "runtime_v0",
      source_data: "data/publish/runtime/controls.json"
    };
  }
  for (const slice of activatedSlices) {
    citationMap[slice.slice_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/slices.json"
    };
  }
  for (const co of activatedCOs) {
    citationMap[co.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/control_objectives.json"
    };
  }
  for (const mechanism of activatedMechanisms) {
    citationMap[mechanism.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/mechanisms.json"
    };
  }
  for (const practice of activatedPractices) {
    citationMap[practice.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/practices.json"
    };
  }
  for (const artifact of activatedArtifacts) {
    citationMap[artifact.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/artifacts.json"
    };
  }
  for (const framework of overlayResolution.activatedFrameworks) {
    citationMap[framework.framework_id] = {
      source: "overlay",
      source_data: "data/publish/overlay/external_frameworks.json"
    };
  }
  for (const obligation of overlayResolution.activatedObligations) {
    citationMap[obligation.obligation_id] = {
      source: "overlay",
      source_data: "data/publish/overlay/external_obligations.json"
    };
  }

  // ----- Completeness report -------------------------------------------
  const expectedCounts = aggregateExpectedFromSlices(activatedSlices);
  const namedV1 = [
    ...activatedCOs,
    ...activatedMechanisms,
    ...activatedPractices,
    ...activatedArtifacts
  ].filter((entity) => Boolean(getV1EntityDisplayName(g2Data, entity.entity_id))).length;
  const totalV1 =
    activatedCOs.length +
    activatedMechanisms.length +
    activatedPractices.length +
    activatedArtifacts.length;
  const completeness: CompletenessReport = {
    expected_objectives: expectedCounts.control_objectives,
    returned_objectives: activatedCOs.length,
    m_recall:
      expectedCounts.control_objectives === 0
        ? 1.0
        : activatedCOs.length / expectedCounts.control_objectives,
    expected_mechanisms: expectedCounts.mechanisms,
    returned_mechanisms: activatedMechanisms.length,
    expected_practices: expectedCounts.practices,
    returned_practices: activatedPractices.length,
    expected_artifacts: expectedCounts.artifacts,
    returned_artifacts: activatedArtifacts.length,
    named_v1_entities: namedV1,
    unnamed_v1_entities: totalV1 - namedV1,
    v1_consistency_mismatches: g2Data.consistency.mismatches,
    v1_manifest_warnings: g2Data.consistency.warnings,
    evidence_patterns_total: scoredEvidencePatterns.length,
    evidence_patterns_returned: keptEvidencePatterns.length,
    evidence_patterns_capped: cappedEvidencePatterns.length,
    evidence_pattern_cap: EVIDENCE_PATTERN_CAP
  };

  // ----- Build LLM instructions + rationale template -------------------
  const citedIds = Object.keys(citationMap);
  const llm_codegen_instructions = buildLlmInstructions({
    mode: input.mode,
    citedIds,
    hasOverlay: overlayResolution.activatedObligations.length > 0,
    riskLevel: input.risk_level
  });

  const security_rationale_template: SecurityRationaleTemplate = {
    task: input.taskTrimmed,
    decisions: [
      {
        decision: "<fill: what design choice was made>",
        rationale: "<fill: why, citing IDs from citation_map>",
        cited_ids: ["<requirement_id|control_id|slice_id|obligation_id>"]
      }
    ],
    validations: [
      {
        surface: "<fill: code path being validated>",
        rule: "<fill: validation rule>",
        rejection_behaviour: "<fill: how invalid input is rejected>"
      }
    ],
    expected_evidence: [
      {
        artefact: "<fill: test, log, doc, sbom, scan, attestation, ...>",
        location: "<fill: where to find it>",
        verifies: "<fill: which control/requirement id>"
      }
    ],
    residual_risk: "<fill: anything NOT addressed by this change>"
  };

  const result: PrepareCodegenContextResultReady = {
    status: "ready_for_codegen",
    mode: input.mode,
    input_echo: inputEcho(raw),
    activation_trace: activation.trace,
    activated_scope: activatedScope,
    g2_context: g2Context,
    manual_grounding: manualGrounding,
    regulatory_overlay: overlayResolution.context,
    citation_map: citationMap,
    completeness_report: completeness,
    llm_codegen_instructions,
    security_rationale_template,
    provenance: {
      runtime_v0: PROVENANCE_V0,
      runtime_v1: PROVENANCE_V1,
      overlay:
        overlayResolution.status === "skipped"
          ? "absent"
          : PROVENANCE_OVERLAY
    }
  };
  if (input.debug) {
    const cappedEntries: ActivationTraceEntry[] = cappedEvidencePatterns.map(
      ({ pattern, score }) => ({
        source: "scope_gate",
        produced: pattern.id,
        trigger: pattern.maps_to_control_id ?? pattern.maps_to_requirement_id ?? "<no anchor>",
        score,
        confidence: "deterministic",
        reason: `Evidence pattern dropped by relevance cap (cap=${EVIDENCE_PATTERN_CAP}).`
      })
    );
    result.debug = {
      rejected_candidates: [...activation.rejected, ...cappedEntries],
      notes: [
        ...activation.notes,
        `concerns: ${activation.concerns.join(", ") || "(none)"}`,
        `slice_families: ${activation.sliceFamilies.join(", ") || "(none)"}`,
        `overlay_status: ${overlayResolution.status}`,
        `estimated_v0_requirements: ${estimatedRequirements}`,
        `evidence_patterns: total=${scoredEvidencePatterns.length} returned=${keptEvidencePatterns.length} capped=${cappedEvidencePatterns.length}`
      ]
    };
  }
  return result;
}

function aggregateExpectedFromSlices(slices: AppSecSlice[]): {
  control_objectives: number;
  mechanisms: number;
  practices: number;
  artifacts: number;
} {
  const totals = { control_objectives: 0, mechanisms: 0, practices: 0, artifacts: 0 };
  for (const slice of slices) {
    totals.control_objectives += slice.counts_actual.control_objectives;
    totals.mechanisms += slice.counts_actual.mechanisms;
    totals.practices += slice.counts_actual.practices;
    totals.artifacts += slice.counts_actual.artifacts;
  }
  return totals;
}

// Re-export the lexicon so tests / docs can reference the canonical list.
export const __wp5Lexicon = {
  VALID_CONCERNS,
  CONCERN_TO_SLICE_FAMILY
};
