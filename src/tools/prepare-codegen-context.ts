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
 *      `regulatory_overlay`, `citations` (0.21 §3: invertido em todos os níveis), `completeness_report`,
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
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { expandQueryWithAliases } from "../backend/semantic-index-gateway.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { requirementCategoryOf } from "../serving/requirement-id.js";
import { prepareCodegenAffordances } from "../serving/affordances.js";
import { estimateSize, type SizeEstimate } from "../serving/response-shaping.js";
import { PAYLOAD_PROMISE_TK as LEVEL_ENVELOPE_TK } from "../serving/payload-ceilings.js";
import { buildDeclaredAdjacency, declaredAdjacencyDetail, type AdjacencySignal } from "../serving/adjacency.js";
import { NOTES, NOTES_HEADER, type NoteId } from "../serving/notes.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";
import {
  runSelectionWithActivation,
  buildNeedsInput,
  normalizeDeclaredTechnologies,
  stackTokensFromVocabulary,
  type SelectionResult
} from "../serving/selection.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CodegenMode = "codegen" | "review" | "test-plan";
export type RiskLevel = "L1" | "L2" | "L3";

/**
 * Nível da resposta — linha 0.21 (§5, ratificada pelo lead 2026-09-25).
 *
 * O eixo deixou de ser «quanto detalhe» e passou a «o que está INLINE e o que
 * está POR REFERÊNCIA». Uma coisa saiu do eixo: a descrição publicada de cada
 * requisito NUNCA sai, em nenhum nível (§1 — o requisito fundido).
 *
 * - `lista`    — todo o requisito activado vem completo e verbatim (id, nome,
 *                descrição, como se verifica, que prova se espera), com os ids
 *                citáveis e as instruções que proíbem inventar ids. O
 *                ancoramento no manual vem por referência.
 * - `standard` — o que a `lista` promete (a adjacência detalhada inline chega
 *                na §2; até lá difere da `lista` só no eco do nível).
 * - `full`     — o que o `standard` promete, e mais: o ancoramento no manual
 *                verbatim inline, as relações do grafo inline e o traço de
 *                activação. É o nível da completude: não promete caber,
 *                promete não faltar — e declara o preço em `size_estimate`.
 *
 * `ultrathin` reformou-se (a sua razão documentada era cortar a descrição) e
 * `minimal` passou a chamar-se `lista` (herda-lhe o envelope de 8.450 tk).
 * O default continua a ser `full` (omissão ≡ "full").
 */
export type CodegenDetailLevel = "lista" | "standard" | "full";

export interface PrepareCodegenContextInput {
  task: string;
  risk_level?: RiskLevel;
  mode?: CodegenMode;
  stack?: string;
  exposure?: "local" | "internal" | "authenticated" | "public";
  data_sensitivity?: "low" | "personal" | "regulated" | "secrets";
  concerns?: string[];
  changed_files?: string[];
  /**
   * 0.20.0-beta.21 — semântica da SELECÇÃO (não confundir com `mode`, que é
   * codegen/review/test-plan): `declarative` (default) responde ao declarado e não
   * interpreta o `task`; `discover` corre o motor inferencial histórico, marcado
   * exploratório. Vocabulário: sbd://toe/activation-vocabulary.
   */
  selection_mode?: "declarative" | "discover";
  /**
   * 0.20.0-beta.21 — tecnologias DECLARADAS do vocabulário fechado
   * (sbd://toe/activation-vocabulary): activam capítulos por tabela publicada.
   * Substituem o casamento de substring sobre o texto livre de `stack`.
   */
  technologies?: string[];
  /**
   * 0.21 §6 — FORMA B no prepare (como no select): declarações ESTRUTURAIS, verdadeiras e
   * verificáveis contra o catálogo. É o que torna um lote de decomposição EXECUTÁVEL: cada
   * lote é a partição das categorias que a tua declaração activou, e a união dos lotes é o
   * conjunto inteiro (m_recall = 1, testado). Só no caminho declarativo.
   */
  chapters?: string[];
  categories?: string[];
  /**
   * 0.21.2 (decisão 0005) — activador SÓ DE CONTEXTO: activa as fatias destas famílias (entidades
   * AppSec Core do g2_context e o manual_grounding) e NUNCA selecciona requisitos. Não conta como
   * declaração (sozinho devolve needs_input); um valor fora do conjunto publicado é declarado inerte
   * com valid_values. Quem o escreve é o servidor, na receita dos lotes de needs_decomposition — cada
   * lote leva as fatias que o pedido original activava para as suas categorias.
   */
  slice_families?: string[];
  regulatory_frameworks?: string[];
  include_regulatory_overlay?: boolean;
  detail?: CodegenDetailLevel;
  /**
   * v2 token diet, s2 — escape hatch for clients that cannot make a second
   * call: when true, `detail: "lista" | "standard"` keeps `g2_context.relations`
   * inline (dieted: no per-item `source`) instead of `relations_ref`.
   * Ignored at `detail: "full"` (relations always inline there).
   */
  include_relations?: boolean;
  debug?: boolean;
}

export type PrepareCodegenStatus =
  | "ready_for_codegen"
  | "needs_clarification"
  | "needs_input"
  | "needs_decomposition"
  | "unsupported_scope";

export interface ActivationTraceEntry {
  /** Triggered by: explicit concern, task term, changed file, framework hint, semantic alias, compound term, or intent keyword. */
  source:
    | "explicit_concern"
    | "task_term"
    /** 0.20.0-beta.22: mapeamento determinístico concern → slice family (era `task_term` órfão). */
    | "concern_slice_mapping"
    /** 0.20.0-beta.22: token exacto do vocabulário fechado encontrado no `stack` declarado. */
    | "stack_token"
    /** 0.20.0-beta.22: regra NOMEADA accionada por tecnologia declarada (ex.: SES-008-por-tecnologia). */
    | "named_rule"
    | "compound_term"
    | "alias_expansion"
    | "intent_keyword"
    | "changed_file"
    | "regulatory_framework"
    | "risk_level"
    | "exposure"
    | "data_sensitivity"
    | "context_chapter"
    /** 0.21.2 (decisão 0005): família de fatia DECLARADA em `slice_families` — só contexto. */
    | "declared_slice_family"
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

/**
 * 0.21 §1 — O REQUISITO FUNDIDO: um objecto por requisito, inline em TODOS os
 * níveis. Antes, `activated_scope.requirements` trazia {requirement_id, name,
 * category, type} e o «como verifico» vivia num bloco à parte
 * (`g2_context.evidence_patterns`, chaveado por `maps_to_requirement_id`,
 * capado a 25/10/5/0 por nível) — o modelo tinha de fazer o join, e um modelo
 * apressado pegava no nome de três palavras e preenchia o resto de cabeça.
 * Agora o requisito é UMA coisa: id, nome, descrição publicada (nunca sai),
 * verificação e prova esperada — verbatim do bundle (requirements.json +
 * evidence_patterns.json, 1:1 por requisito no KG v1.12.0). Os campos do
 * padrão que NÃO vêm inline (evidence_pattern_id, control_id,
 * expected_artifact_type_ids) mudam de sítio e passam a referenciados —
 * `completeness_report.verification.by_ref` é a chamada executável.
 */
export interface FusedRequirement {
  id: string;
  name: string;
  /** Published `type` (base | domain-specific) — not derivable, kept inline. */
  type?: string;
  /** Lossless guard: present ONLY when not derivable from the id's category segment (expected never). */
  category?: string;
  /** Verbatim published description — NEVER elided, at any level (0.21 §1). */
  description?: string;
  /** Verbatim `verification_logic` of the requirement's published evidence pattern. */
  verify?: string;
  /** Verbatim `evidence_expectation` of the same pattern. */
  evidence?: string;
  /** Present at detail="full" only (the dieted levels carry it once, in `provenance_legend`). */
  source?: "runtime_v0";
}

/**
 * 0.21 §2 — A ADJACÊNCIA DECLARADA, ligada ao prepare. EM TODOS OS NÍVEIS, o mais magro
 * incluído: não é nível de detalhe, é correcção — quem pede o modo barato é quem mais
 * provavelmente sub-declarou, e um modo barato que cale «faltou-te privacidade» é pior do
 * que não existir. Aritmética sobre o vocabulário fechado (src/serving/adjacency.ts): para
 * cada valor NÃO declarado, a mesma selecção determinística com esse valor acrescentado,
 * contando os ids que entrariam. Nunca leitura da tarefa. O resumo (top-N por impacto +
 * denominadores) vai inline sempre; o detalhe (todos os sinais) vai inline em
 * standard/full e por referência executável em lista — é o separador dos dois níveis.
 * Em `selection_mode: "discover"` a adjacência é relativa à DECLARAÇÃO feita (a aritmética
 * não lê o conjunto inferido): com declaração vazia, todo o vocabulário é adjacente.
 */
export interface PrepareAdjacency {
  /** Top-N por would_add (desempate estável: kind, depois nome). O nome do campo é a frase. */
  undeclared_that_would_change_the_set: AdjacencySignal[];
  /** Valores do vocabulário sondados (todos os não declarados). */
  scanned: number;
  /** Quantos mudariam o conjunto — o DENOMINADOR do resumo. */
  would_change_the_set: number;
  /** Quantos vão nomeados no resumo. */
  shown: number;
  /** standard/full: a lista COMPLETA (o resumo é o seu prefixo). */
  detail?: AdjacencySignal[];
  /** lista: onde está a lista completa — executável verbatim. */
  detail_ref?: { tool: "prepare_sbd_toe_codegen_context"; with: { detail: "standard" }; note_id: NoteId };
}

export interface ActivatedScope {
  requirements: FusedRequirement[];
  controls: Array<{
    control_id: string;
    name: string;
    domain: string;
    control_type: string;
    source: "runtime_v0";
    confidence: "direct" | "derived";
    /** 0.21 §1: verbatim published description, `direct` controls only, at every level. */
    description?: string;
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

/**
 * 0.21 §1 — `g2_context.evidence_patterns` DEIXOU DE SER BLOCO. O «como
 * verifico» de cada requisito activado vai inline no próprio requisito
 * ({@link FusedRequirement}.verify/.evidence); os caps 25/10/5/0 por nível
 * morreram com ele. Os padrões que só tocavam o âmbito por um CONTROLO
 * activado (requisito fora do conjunto) não são inlinados — pertencem a
 * outros requisitos — e ficam contados + referenciados em
 * `completeness_report.verification` (nunca silencioso).
 */

export interface G2Context {
  control_objectives: G2ContextEntity[];
  mechanisms: G2ContextEntity[];
  practices: G2ContextEntity[];
  artifacts: G2ContextEntity[];
  relations: G2ContextRelation[];
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
  /** 0.21.1 — present when obligations were activated: mappings are scoped to the activated context (see {@link OverlayMappingsScope}). */
  mappings_scope?: OverlayMappingsScope;
}

/**
 * 0.21.1 — O OVERLAY RESTRINGE-SE AO QUE A CHAMADA ACTIVOU.
 *
 * Defeito (desde pelo menos a 0.19.4): com `include_regulatory_overlay`, o prepare devolvia TODOS os
 * mapeamentos das obrigações do framework para todo o Manual — 1 693 no RGPD, ≈117k tokens — quando
 * só ~5% apontavam para o que a tarefa activou. As obrigações continuam completas (são ids citáveis:
 * invariante 3); os mapeamentos servem-se só quando o alvo está no âmbito, e o resto conta-se aqui,
 * por tipo, com a chamada executável que o devolve. Nunca silencioso.
 */
export interface OverlayMappingsScope {
  /** All mappings of the activated obligations (what 0.21.0 served inline). */
  total: number;
  /** Mappings served inline in `mappings` (target in the activated scope, not derivable). */
  served: number;
  /** Evidence-pattern mappings elided because they mirror a served requirement mapping. */
  derivable_elided: number;
  /** Mappings whose target is outside the activated scope — reachable via rest_ref. */
  out_of_scope: number;
  /** Per target type: total vs served (exact; the sum closes). */
  by_target_type: Record<string, { total: number; served: number; derivable_elided: number; out_of_scope: number }>;
  rest_ref: { tool: "resolve_entities"; with: string; note_id: NoteId };
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
  /** 0.21 §1 — never-silent summary of the fused verification (see {@link VerificationSummary}). */
  verification: VerificationSummary;
  /**
   * MP1 selection summary (G-mp1a O2, 2026-08-31): the requirement set comes from
   * the selection engine (baseline ∪ context-activated chapters, narrowed by the
   * task's declared signals). Never-silent: what the narrowing excluded is counted
   * here and fully listed by the executable ref. Additive key.
   */
  selection?: {
    eligible: number;
    selected: number;
    narrowed_out_categories: number;
    narrowed_out_requirements: number;
    /** Opcionais no perfil ultrathin (dieta s3c): a banda continua declarada no
     * select e em todos os níveis (0.21: lista/standard/full); recuperação via narrowed_out_ref. */
    excluded_by_level_categories?: number;
    excluded_by_level_requirements?: number;
    /** 0.19.0 (dieta por forma — tectos vigiam): fracção só-lexical da selecção; o
     * sumário completo + aviso + candidatos vivem no select_sbd_toe_requirements. */
    lexical_share?: number;
    narrowed_out_ref: { tool: "select_sbd_toe_requirements"; note_id: NoteId };
  };
}

/**
 * 0.21 §1 — sumário NUNCA-SILENCIOSO da verificação fundida. Substitui os
 * contadores do cap (total/returned/capped/cap) que morreram com o bloco.
 * Cada número tem denominador nomeado; cada coisa que não vem inline tem a
 * chamada executável que a devolve.
 */
export interface VerificationSummary {
  /** Denominator: activated requirements (= activated_scope.requirements.length). */
  requirements: number;
  /** Requirements carrying BOTH `verify` and `evidence` inline. */
  with_verify_and_evidence: number;
  /** Requirements whose published pattern lacks `verify` and/or `evidence` (expected 0 on KG v1.12.0). */
  partial: number;
  /** Requirements with NO published evidence pattern at all (expected 0 on KG v1.12.0). */
  without_pattern: number;
  /**
   * Pattern fields NOT inlined in the fused requirement (evidence_pattern_id,
   * control_id, expected_artifact_type_ids) — moved by reference: the
   * verification matrix serves the full row per requirement (≤50 ids/call).
   */
  by_ref: {
    tool: "get_sbd_toe_verification_matrix";
    with: string;
    /** Number of calls needed to cover every activated requirement (⌈requirements/50⌉). */
    calls: number;
    fields: ["evidence_pattern_id", "control_id", "expected_artifact_type_ids"];
    note_id: NoteId;
  };
  /**
   * Published patterns linked to an ACTIVATED control whose requirement is NOT
   * in the activated set. Never inlined (they belong to other requirements);
   * counted here and reachable by the executable ref.
   */
  related_by_control_outside_scope: {
    count: number;
    ref: { tool: "resolve_entities"; with: string; note_id: NoteId };
  };
}

export interface SecurityRationaleTemplate {
  task: string;
  decisions: Array<{
    decision: "<fill: what design choice was made>";
    rationale: "<fill: why, citing IDs from citations>";
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
  /** 0.21 §6-c — como resolver qualquer `note_id` deste payload (um cabeçalho, não N notas). */
  notes: typeof NOTES_HEADER;
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task"> & { task_role?: string };
  activation_trace: ActivationTraceEntry[];
  activated_scope: ActivatedScope;
  /** 0.21 §2 — resumo + detalhe inline (full). */
  adjacency: PrepareAdjacency;
  g2_context: G2Context;
  manual_grounding: ManualGroundingEntry[];
  regulatory_overlay: RegulatoryOverlayContext;
  citation_map: Record<string, CitationMapEntry>;
  completeness_report: CompletenessReport;
  llm_codegen_instructions: string[];
  security_rationale_template: SecurityRationaleTemplate;
  provenance: {
    /** Compact version stamp: kg release_tag of the served pin (0.13.0). */
    kg: string;
    /** 0.20.0-beta.23: versão do SERVIDOR que produziu esta resposta (≠ `kg`). */
    server: string;
    runtime_v0: string;
    runtime_v1: string;
    overlay: string | "absent";
  };
  /**
   * 0.21 §5 — o preço DECLARADO desta resposta (chars e ≈tokens = chars/4, a
   * mesma régua da medição). `full` não tem tecto: não promete caber, promete
   * não faltar — e diz quanto custou. Presente em todos os níveis.
   */
  size_estimate?: DeclaredSize;
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

/**
 * 0.21 §5 — o preço declarado, e o envelope contra o qual se lê. `full` não
 * tem envelope (promessa = completude). Nos níveis com envelope herdado
 * (lista 8.450, standard 9.200) o payload diz se coube: `within_envelope`.
 * Quando não coube, DIZ-O — nunca em silêncio (é a regra da casa desde a
 * 0.19.4): o tecto por-id é o ratificado, mas o custo por requisito da forma
 * fundida é o medido, e quando os dois não fecham o consumidor lê-o aqui.
 */
export type DeclaredSize = SizeEstimate & {
  envelope_tk?: number;
  within_envelope?: boolean;
  note_id?: NoteId;
  /**
   * 0.21.2 (decisão 0004): presente quando este payload é um LOTE IRREDUTÍVEL — uma única
   * categoria que sozinha não cabe no envelope. É a única resposta pronta de lista/standard
   * que pode sair fora do envelope; sai pronta e declarada, nunca outra decomposição.
   */
  irreducible_note_id?: NoteId;
};

export interface DecompositionBatch {
  /** A receita EXECUTÁVEL: re-chama o prepare com estes campos (mais task, risk_level e detail). */
  with: {
    categories: string[];
    /** 0.21.2: só quando o pedido não é codegen — o lote corre no mesmo modo. */
    mode?: CodegenMode;
    /** 0.21.2 (decisão 0005): as fatias que o pedido original activava para as categorias deste lote. */
    slice_families?: string[];
    technologies?: string[];
    changed_files?: string[];
    regulatory_frameworks?: string[];
    include_regulatory_overlay?: boolean;
  };
  /** Contagem REAL do lote (selecção corrida). */
  requirements: number;
  /** 0.21.2: o size_estimate MEDIDO do payload que esta chamada devolve (mesmos inputs, mesma régua). */
  measured_tk: number;
  /** 0.21.2: uma única categoria que sozinha não cabe no envelope — chamada, sai pronta e declarada fora do envelope. */
  irreducible: boolean;
  /** De onde vieram estas categorias na tua declaração: concerns e activadores largos (efeito preservado). */
  derived_from: { concerns: string[]; exposure?: string; data_sensitivity?: string };
}

export interface PrepareCodegenContextResultBlocked {
  status: "needs_clarification" | "needs_decomposition" | "unsupported_scope" | "needs_input";
  /**
   * 0.20.0-beta.23 (P1, mesma classe): um BLOQUEIO também é uma resposta, e também
   * tem de ser atribuível. Antes desta vaga o payload bloqueado não trazia
   * proveniência nenhuma — dois servidores diferentes bloqueavam de forma
   * indistinguível.
   */
  provenance: { kg: string; server: string };
  /** 0.19.4, regra de CUSTO desde a 0.21.2 (decisão 0004): presente quando o payload pronto
   * de lista/standard, medido, não cabe no envelope do nível. `projected_tk` é o size_estimate
   * medido do payload que seria entregue (não uma recta); `basis` di-lo. */
  requirement_ceiling?: {
    detail: string;
    basis: "measured_payload";
    selected: number;
    projected_tk: number;
    promise_tk: number;
    /**
     * 0.21 §6 (condição da decisão (a), lead 2026-09-25): os lotes SOMAM O TODO. Cada lote é
     * uma declaração ESTRUTURAL (`categories` — a partição exacta das categorias que a tua
     * declaração activou), com `technologies`, `changed_files` e os parâmetros do overlay
     * preservados literalmente; `exposure`/`data_sensitivity` estão preservados pelo seu EFEITO
     * (as categorias que produziram entram na partição) e não re-declarados. 0.21.2: o
     * empacotamento é por payload MEDIDO — cada lote cabe no envelope (`measured_tk`), salvo
     * o lote irredutível declarado (`irreducible: true`).
     */
    batches: DecompositionBatch[];
    /** Denominador da prova: união dos lotes vs selecção inteira (m_recall = 1 por construção; verificado nos testes). */
    union: { requirements: number; recall: number };
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  /**
   * 0.21 §6 — em `needs_input`, o objecto do motor (razão, recurso do vocabulário, exemplo,
   * candidatos a confirmar, declarações inertes) mais `valid_values`: para cada eixo que ficou
   * inerte (stack/technologies, exposure, data_sensitivity), a LISTA dos valores válidos — o
   * erro nomeia o vocabulário, não só o aponta.
   */
  needs_input?: Record<string, unknown> & { valid_values?: Record<string, string[]> };
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task"> & { task_role?: string };
  reasons: string[];
  suggestions: string[];
  partial_activation_trace: ActivationTraceEntry[];
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

// ---------------------------------------------------------------------------
// Detail-level encoding types (v2 token diet, s1 — dedup, nothing removed)
// ---------------------------------------------------------------------------

/** An item shape with the repeated per-item `source` field removed (the
 * provenance is carried once, in `provenance_legend`). */
export type WithoutSource<T> = Omit<T, "source">;

/**
 * Inverted citation encoding (replaces `citation_map` in `lista`/`standard`).
 * Grouped by source; `source_data` is an ORDERED run-length map
 * `file → count`: the first N₁ citable ids come from the first file, the
 * next N₂ from the second, and so on. This preserves the exact per-id
 * `{source, source_data}` of the classic `citation_map` with zero repetition.
 *
 * s3: the ids themselves are NOT repeated when they already appear verbatim in
 * a payload section — `ids_from` lists, aligned 1:1 with the `source_data`
 * files, the payload path whose ids (in payload order) are the run for that
 * file. `keys(section[slice])` paths iterate the slice groups in order, then
 * the entity-id keys in order. The explicit `ids` array is kept ONLY as a
 * lossless fallback when a file has no static payload-path mapping (expected
 * never for the published bundle). Exactly one of `ids_from`/`ids` is present.
 */
export interface CitationsGroup {
  /** Ordered map: published file → number of consecutive citable ids. */
  source_data: Record<string, number>;
  /** Payload paths (aligned with `source_data` keys) whose ids, in payload
   * order, are the ids for each file's run. */
  ids_from?: string[];
  /** Lossless fallback: explicit ids, ordered by the `source_data` runs. */
  ids?: string[];
}

export type CitationsBySource = Partial<
  Record<CitationMapEntry["source"], CitationsGroup>
>;

/**
 * `manual_grounding` grouped by (rastreabilidade_role, manual_chapter,
 * manual_file, manual_commit_sha) — the fields that repeat verbatim across
 * entries. Total information is preserved: `v1_entity_ids` lists every entry
 * of the group, and `v1_entity_names` carries ONLY the names that are not
 * already recoverable from the `g2_context` entity lists in the same payload
 * (normally empty — names come from the same rastreabilidade source).
 */
export interface ManualGroundingGroup {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  manual_commit_sha?: string;
  v1_entity_ids: string[];
  /** Lossless guard: names NOT recoverable via g2_context entity `name`. */
  v1_entity_names?: Record<string, string>;
}

export interface ManualGroundingGrouped {
  /** Number of flat entries the groups encode (dedup audit: sum of group sizes). */
  total_entries: number;
  groups: ManualGroundingGroup[];
  /** Lossless guard: entries without a v1_entity_id (expected empty). */
  ungrouped?: Array<WithoutSource<ManualGroundingEntry>>;
}

/**
 * v2 token diet, s3b (revised ADENDA 2026-07-05) — minimal-form grounding
 * group: the SAME group as {@link ManualGroundingGroup} (1:1, same order) with
 * the per-group `v1_entity_ids` list replaced by its exact count (`entries`).
 * The grounding id SET is NOT lost: every grounding v1_entity_id is an
 * activated entity id already present verbatim in this payload's
 * `g2_context` entity maps (the grounding is resolved FROM those ids) — only
 * the id→(chapter,file) traceability assignment moves behind the executable
 * `groups_ref` (same input, detail="standard"). Never silent: `entries`
 * counts sum to `total_entries`.
 */
export interface ManualGroundingMinimalGroup {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  /** Present ONLY when the sha could not be hoisted to the top level
   * (mixed/absent shas across groups — never expected for the published
   * bundle; lossless guard). */
  manual_commit_sha?: string;
  /** Exact number of v1_entity_ids the detail="standard" group carries. */
  entries: number;
  /** Lossless guard: names NOT recoverable via g2_context entity `name`
   * (kept verbatim from the standard group; expected never). */
  v1_entity_names?: Record<string, string>;
}

/** Executable reference to the flat, verbatim grounding entries (detail="full"). */
export interface GroundingEntriesRef {
  tool: "prepare_sbd_toe_codegen_context";
  /** Merge over this call's input_echo: same input, detail="full". */
  with: { detail: "full" };
  note_id: NoteId;
}

/**
 * `manual_grounding` at `detail: "lista" | "standard"` (0.21; born as the s3b minimal form): aggregated
 * provenance — total count, the manual_commit_sha shared by every group
 * (hoisted), and the (role, chapter, file) group list with per-group entry
 * COUNTS instead of per-group id lists — plus the executable `groups_ref`.
 * The citable id set is untouched (invariant 3): grounding ids never feed
 * `citations`/`ids_from`, and the id set itself stays reconstructible from
 * this same payload's g2_context entity maps without any extra call.
 */
export interface ManualGroundingMinimal {
  /** Number of flat detail="full" entries the groups encode (Σ entries). */
  total_entries: number;
  /** Hoisted provenance: present iff EVERY group carries this same sha
   * (expected always for the published bundle); otherwise each group keeps
   * its own `manual_commit_sha` inline (lossless guard). */
  manual_commit_sha?: string;
  groups: ManualGroundingMinimalGroup[];
  /** 0.21: how to obtain the verbatim flat entries (detail="full" — the only level that inlines the grounding). */
  entries_ref: GroundingEntriesRef;
  /** Lossless guard: entries without a v1_entity_id (expected empty). */
  ungrouped?: Array<WithoutSource<ManualGroundingEntry>>;
}

/**
 * RETIRADO na 0.21 (era `manual_grounding` at `detail: "ultrathin"`): aggregate provenance ONLY
 * — `{total_entries, manual_commit_sha, groups_ref}` — derived from the s3b
 * minimal form with the (role, chapter, file) group list elided too. Never
 * silent: `total_entries` is the exact flat detail="full" entry count and
 * `groups_ref` is the executable reference (same input, detail="standard")
 * that returns the full 1:1 grouping with per-group v1_entity_ids. Lossless
 * guards (both expected never for the published bundle): if the sha could not
 * be hoisted OR any group carries non-recoverable `v1_entity_names`, the s3b
 * minimal `groups` list survives inline; `ungrouped` entries survive verbatim.
 * Invariant-3 note (same as minimal): grounding ids never feed
 * `citations`/`ids_from`, and the grounding id SET stays reconstructible from
 * this same payload's g2_context entity maps without any extra call.
 */
// (ManualGroundingUltrathin removido — o nível reformou-se.)

/**
 * 0.21 §1 — dieted requirement = the fused requirement without the per-item
 * `source` (carried once in `provenance_legend`). `category` is elided when
 * (and only when) it equals the id's category segment (`AUT-003` → `AUT`,
 * `REQ-AGN-001` → `AGN`; consumer contract v1.10 §1.18) — lossless guard.
 */
export type DietedRequirement = WithoutSource<FusedRequirement>;

/**
 * v2 token diet, s3 — dieted control projection: classic fields minus `source`
 * plus, for `confidence: "direct"` controls only, the verbatim published
 * `description` (data/publish/runtime/controls.json).
 */
export type DietedControl = WithoutSource<ActivatedScope["controls"][number]>;

// (ActivatedScopeDescriptionsRef removido na 0.21 — a descrição nunca sai.)

export interface DietedActivatedScope {
  requirements: DietedRequirement[];
  controls: DietedControl[];
  slices: Array<WithoutSource<ActivatedScope["slices"][number]>>;
  regulatory_obligations: Array<
    WithoutSource<ActivatedScope["regulatory_obligations"][number]>
  >;
}

/**
 * v2 token diet, s2 — Relations on-demand. In `lista`/`standard` the inline
 * `g2_context.relations` array (~4.3K tokens) is replaced by a REFERENCE to
 * executable calls of the `trace_sbd_toe_graph` tool whose union returns a
 * superset of the elided relations. Anchors are activated slice_ids/entity_ids
 * from THIS payload — domain ids, never internal IRIs (EPIC invariant 6).
 *
 * Relation kind → curated lens mapping (see buildRelationsRef):
 *  - (objective → mechanism/practice) edges, where the objective has a
 *    belongsToSlice edge to an activated slice S:
 *      `slice_implementation(anchor=S)` — each row (slice, objective, kind,
 *      target) carries BOTH the objective→target edge (kind selects the
 *      predicate) and the objective's belongsToSlice edge.
 *  - (objective, belongsToSlice, S) for objectives with ≥1 mechanism/practice
 *    edge: same `slice_implementation(anchor=S)` rows.
 *  - (objective → target) edges whose objective is activated but has NO
 *    belongsToSlice edge in the published graph (data gap):
 *      `objective_realization(anchor=objective)`.
 *  - (objective → target) edges where only the TARGET is activated
 *    (cross-slice): `mechanism_provenance(anchor=target)` — the predicate is
 *    recovered from the target's entity_type in this same payload.
 *  - (entity, belongsToSlice, slice) for Mechanism/Practice/Artifact subjects
 *    (and objectives without mechanism/practice edges): NO curated lens
 *    returns these edges, and they are 100% redundant with the payload — every
 *    `g2_context` entity already carries `slice_id`. Counted as
 *    `coverage.implicit_in_entities` (never silently dropped).
 *  - Anything not covered above stays INLINE in `residual_relations`
 *    (expected empty; never-silent guard).
 */
export interface RelationsRefLensCall {
  lens: "slice_implementation" | "objective_realization" | "mechanism_provenance";
  /** Activated slice_id or entity_id from this payload (id, never an IRI). */
  anchor: string;
}

export interface RelationsRef {
  tool: "trace_sbd_toe_graph";
  /** Executable calls whose union covers the lens-recoverable relations. */
  lenses: RelationsRefLensCall[];
  /** Exact number of relations that would go inline at detail=full (audit). */
  total_relations: number;
  /** Never-silent split of total_relations by recovery path. */
  coverage: {
    /** Recoverable by executing the `lenses` calls above. */
    via_lenses: number;
    /** belongsToSlice edges equal to the `slice_id` field of a g2_context entity. */
    implicit_in_entities: number;
    /** Relations kept inline in `residual_relations` (expected 0). */
    residual_inline: number;
  };
  /** Only present when a relation is neither lens-recoverable nor implicit. */
  residual_relations?: Array<WithoutSource<G2ContextRelation>>;
  note_id: NoteId;
}

/**
 * v2 token diet, s3 — slice-grouped entity encoding for `lista`/`standard`:
 * `{ slice_id: { entity_id: name | null } }`. Lossless re-encoding of the
 * classic entity list: `entity_type` is the list the map lives in,
 * `slice_id` is the group key, `slice_family` is
 * `activated_scope.slices[].objective_family` for that slice_id, and a `null`
 * name means the full projection omits `name` (unnamed in rastreabilidade).
 * Group/key order preserves the classic list order (insertion order).
 */
export type SliceGroupedEntityNames = Record<string, Record<string, string | null>>;

// (DietedEvidencePattern removido na 0.21 §1 — o padrão vive no requisito fundido.)

export interface DietedG2Context {
  control_objectives: SliceGroupedEntityNames;
  mechanisms: SliceGroupedEntityNames;
  practices: SliceGroupedEntityNames;
  artifacts: SliceGroupedEntityNames;
  /** Inline only with `include_relations: true` (s2); otherwise see relations_ref. */
  relations?: Array<WithoutSource<G2ContextRelation>>;
  /** 0.21 §3: relations LEAVE the dieted levels — this never-silent summary replaces relations_ref
   * (0 of the relations point outside what the payload already carries in the measured cases;
   * any that cannot be recovered from the payload or a lens stays inline in residual_relations). */
  relations_summary?: RelationsSummary;
  /** Only present when a relation is neither lens-recoverable nor implicit (expected 0). */
  residual_relations?: Array<WithoutSource<G2ContextRelation>>;
}

/**
 * 0.21 §3 — «relations saem» dos níveis dieted: medido, as relações activadas
 * ligam nós que o payload JÁ recebeu (belongsToSlice ≡ slice_id da entidade;
 * objective→mechanism/practice recuperável por trace_sbd_toe_graph). Fica a
 * contabilidade exacta (a mesma do relations_ref do full) e o caminho de volta.
 */
export interface RelationsSummary {
  total_relations: number;
  via_lenses: number;
  implicit_in_entities: number;
  residual_inline: number;
  note_id: NoteId;
}

/**
 * 0.21 §3 — o `full` SERVIDO: o classic com duas mudanças de forma, sem mudança
 * de conjunto (invariante 3): `citations` invertido (legenda por fonte + ids
 * referenciados por caminho do payload — a função de `citation_map` era «estes
 * ids são legais», e a forma repetia {source, source_data} uma vez por id) e
 * `relations_ref` em vez das relations inline (`include_relations: true`
 * repõe-nas). O core continua a construir citation_map/relations internamente.
 */
export type PrepareCodegenContextResultReadyFull = Omit<PrepareCodegenContextResultReady, "citation_map" | "g2_context"> & {
  citations: CitationsBySource;
  g2_context: Omit<G2Context, "relations"> & {
    /** Inline only with `include_relations: true`. */
    relations?: G2ContextRelation[];
    /** Default at full: executable trace_sbd_toe_graph calls + exact coverage accounting. */
    relations_ref?: RelationsRef;
  };
};

export interface DietedRegulatoryOverlayContext {
  frameworks: Array<WithoutSource<RegulatoryOverlayContext["frameworks"][number]>>;
  obligations: Array<WithoutSource<RegulatoryOverlayContext["obligations"][number]>>;
  mappings: Array<WithoutSource<RegulatoryOverlayContext["mappings"][number]>>;
  playbooks: Array<WithoutSource<RegulatoryOverlayContext["playbooks"][number]>>;
  mappings_scope?: OverlayMappingsScope;
}

/**
 * Section → source map for the dieted encoding: each list is
 * source-homogeneous BY CONSTRUCTION (the projection types hardcode a single
 * source literal per list), so one entry per list reconstitutes the `source`
 * of every item with no exceptions. Published as part of the
 * `sbd://toe/codegen-instructions/{mode}` resource (s3 moved the verbose
 * legend out of every payload); the inline `provenance_legend` keeps a
 * one-line pointer.
 */
const PROVENANCE_SOURCES = {
  "activated_scope.requirements": "runtime_v0",
  "activated_scope.controls": "runtime_v0",
  "activated_scope.slices": "runtime_v1",
  "activated_scope.regulatory_obligations": "overlay",
  "g2_context.control_objectives": "runtime_v1",
  "g2_context.mechanisms": "runtime_v1",
  "g2_context.practices": "runtime_v1",
  "g2_context.artifacts": "runtime_v1",
  "g2_context.relations": "runtime_v1",
  "manual_grounding.groups": "runtime_v1",
  "regulatory_overlay.frameworks": "overlay",
  "regulatory_overlay.obligations": "overlay",
  "regulatory_overlay.mappings": "overlay",
  "regulatory_overlay.playbooks": "overlay"
} as const;

/**
 * Inline legend for `lista`/`standard` (0.21): slim pointer — the full legend
 * (section→source table + every derivation rule of the dieted encoding) lives
 * in the `sbd://toe/codegen-instructions/{mode}` resource, `detail_encoding`.
 */
const PROVENANCE_LEGEND = { note_id: "prepare.provenance_legend" as NoteId } as const; // 0.21 §6-c: texto em sbd://toe/notes

export type ProvenanceLegend = typeof PROVENANCE_LEGEND;

/**
 * v2 token diet, s4 — cheap turns, not fewer turns: short note appended to
 * every `lista`/`standard` ready payload. An identical call returns a
 * byte-identical result (deterministic, tested), so the context already in the
 * session is the source for the write-test-edit loop. Follow-ups that need the
 * inline grounding/relations/trace go through `detail: "full"` (declared
 * price in size_estimate) or a targeted `consult_security_requirements` call.
 */
export const REPEAT_CALL_HINT: string = NOTES["prepare.repeat_call_hint"]; // 0.21 §6-c: servido por referência (note_id)
const REPEAT_CALL_HINT_ID: NoteId = "prepare.repeat_call_hint";

// (CodegenInstructionsRef removido na 0.21 — as instruções e o template vão INLINE em todos os níveis: 2,2% do payload e é o que impede a invenção de ids.)

/**
 * v2 token diet, s3 — never-silent counter left in place of the elided
 * `activation_trace` at `detail: "standard" | "minimal"` (the full trace is
 * included when `debug: true`, and always at `detail: "full"`).
 */
export interface ActivationTraceRef {
  entries: number;
  note_id: NoteId;
}

// (EvidencePatternsRest, DietedCompletenessReport, V1DiagnosticsRef e UltrathinCompletenessReport removidos na 0.21 — sem cap de padrões e sem nível que apare diagnósticos.)

/**
 * `ready_for_codegen` result at `detail: "lista" | "standard"` (0.21). Same
 * citable ID set as the full result (invariant 3) — the encoding is
 * deduplicated (s1), relations are served on-demand (s2), and since 0.21 §1:
 *   - every requirement is the FUSED object (id, name, type, description,
 *     verify, evidence) — the description never leaves;
 *   - `llm_codegen_instructions` + `security_rationale_template` are INLINE
 *     (they are what stops id invention);
 *   - `manual_grounding` is the counts+sha form with an executable
 *     `entries_ref` → detail="full" (the only level that inlines it);
 *   - `activation_trace` is included only with `debug: true`
 *     (`activation_trace_ref` keeps the never-silent count otherwise).
 * `lista` and `standard` differ only in the echoed level until the §2
 * adjacency detail lands (declared, not decided: see decisions/0003 §6.2).
 */
export interface PrepareCodegenContextResultReadyDieted {
  status: "ready_for_codegen";
  /** 0.21 §6-c — como resolver qualquer `note_id` deste payload. */
  notes: typeof NOTES_HEADER;
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  mode: CodegenMode;
  input_echo: PrepareCodegenContextResultReady["input_echo"];
  /** Present only with `debug: true` (s3); see activation_trace_ref otherwise. */
  activation_trace?: ActivationTraceEntry[];
  /** Present when activation_trace is elided (never-silent counter). */
  activation_trace_ref?: ActivationTraceRef;
  provenance_legend: ProvenanceLegend;
  activated_scope: DietedActivatedScope;
  /** 0.21 §2 — resumo inline sempre; detalhe inline (standard) ou por referência (lista). */
  adjacency: PrepareAdjacency;
  g2_context: DietedG2Context;
  /** Counts + hoisted sha + executable entries_ref (detail="full"). */
  manual_grounding: ManualGroundingMinimal;
  regulatory_overlay: DietedRegulatoryOverlayContext;
  citations: CitationsBySource;
  completeness_report: CompletenessReport;
  llm_codegen_instructions: string[];
  security_rationale_template: SecurityRationaleTemplate;
  /** s4 — reuse note (texto em sbd://toe/notes/prepare.repeat_call_hint): identical re-call is
   * deterministic; the context already received is the loop's source. */
  repeat_call_hint: { note_id: NoteId };
  provenance: PrepareCodegenContextResultReady["provenance"];
  /** 0.21 §5 — declared price of this response (chars, ≈tokens, envelope). */
  size_estimate?: DeclaredSize;
  debug?: PrepareCodegenContextResultReady["debug"];
}

export type PrepareCodegenContextResult =
  | PrepareCodegenContextResultReadyFull
  | PrepareCodegenContextResultReadyDieted
  | PrepareCodegenContextResultBlocked;

// ---------------------------------------------------------------------------
// Activation lexicon (small, auditable; WP6 layers semantic scoring on top)
// ---------------------------------------------------------------------------

export const VALID_CONCERNS = [
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
  "integration",
  // v1.8.0 wave (2026-08-31, contract v1.15): file-handling (FIL) and personal-data
  // privacy (PRI) catalogues — new base categories of ch. 02.
  "files",
  "privacy",
  // AI-agent / automation governance catalogue (REQ-AGN-001…004, category AGN;
  // consumer contract v1.10 §1.18) — maps through the loader's concernsMap
  // (`agents: ["AGN"]`, absorbed from master bc8c9189 in 0.20.0-beta.3).
  "agents"
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
  ["login", ["auth", "encryption"]],
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
  ["terraform", ["iac"]],
  ["ansible", ["iac"]],
  ["kubernetes", ["deployment", "config"]],
  ["docker", ["deployment", "config"]],
  ["container", ["deployment"]],
  ["ai agent", ["agents"]],
  ["agentic", ["agents"]],
  ["kill-switch", ["agents"]],
  ["kill switch", ["agents"]],
  ["autonomy level", ["agents"]],
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
  // pós-P2 2026-08-31: integração por mensageria exige registo de eventos críticos → logging.
  ["message queue", ["integration", "logging"]],
  // pós-P2 2026-08-31: mTLS = gestão de material criptográfico → secrets (CFG/ENC).
  ["mtls", ["encryption", "integration", "secrets"]],
  // v1.8.0 wave (FIL/PRI, léxico ancorado no Manual cap. 02):
  ["file", ["files"]],
  ["upload", ["files", "validation"]],
  ["uploading", ["files", "validation"]],
  ["attachment", ["files"]],
  ["photo", ["files"]],
  ["pii", ["privacy"]],
  ["personal data", ["privacy"]],
  ["signature", ["integrity", "encryption"]],
  ["signing", ["integrity"]],
  // "image" saiu da tabela: homónimo desambiguado por contexto (bloco R-image em activate()).
  ["spa", ["validation", "api"]],
  ["frontend", ["validation"]],
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
/**
 * Declared context activators (G-mp1a/D3). Module scope + exported since
 * 0.20.0-beta.21 (declarative-first): `sbd://toe/activation-vocabulary` publishes
 * them — the vocabulary IS the contract, so it is derived from these tables and
 * never restated by hand.
 */
export const EXPOSURE_CONCERNS: Readonly<Record<string, readonly Concern[]>> = {
  internal: ["auth", "logging"],
  authenticated: ["auth", "logging"],
  public: ["auth", "logging", "api", "validation", "architecture"]
};

export const SENSITIVITY_CONCERNS: Readonly<Record<string, readonly Concern[]>> = {
  // v1.8.0: personal/regulated data now also activates the PRI catalogue (privacy).
  personal: ["encryption", "validation", "logging", "privacy"],
  regulated: ["encryption", "validation", "logging", "privacy"],
  secrets: ["secrets"]
};

export const CONCERN_TO_V0_CATEGORIES_SUPPLEMENT: Readonly<Record<Concern, string[]>> = {
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
  // pós-P2 2026-08-31: deploy activa também a categoria base DST (cap. 02 — "Deploy
  // apenas via pipeline validado" e afins); supplement do serving, loader inalterado.
  deployment: ["DPL", "IAC", "CNT", "DST"],
  integration: ["API", "INT"],
  // v1.8.0 wave: the loader concernsMap predates FIL/PRI — served-side supplement.
  files: ["FIL"],
  privacy: ["PRI"],
  // `agents` → AGN comes from ontology.concernsMap (loader); nothing to supplement.
  agents: []
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
  integration: "ACO-ITS",
  // No published AppSec Core slice family yet for the v1.8.0 FIL/PRI catalogues —
  // anchor when AppSec Core publishes one; null = no grounding family, and the
  // decomposition gate ignores null families.
  files: null,
  privacy: null,
  // No AppSec Core slice family for the AGN catalogue (no published control link
  // for REQ-AGN-001…004 — declared gap, never invented).
  agents: null
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
  // R3 do ciclo MP1 (2026-08-31, crescimento por semântica do Manual — cap. 02
  // categoria SES = sessões; nunca por caso do oráculo): sessão/sessões → session.
  ["sessão", ["session"]],
  ["sessões", ["session"]],
  // v1.8.0 (FIL/PRI):
  ["ficheiro", ["file"]],
  ["ficheiros", ["file"]],
  ["anexo", ["attachment"]],
  ["anexos", ["attachment"]],
  ["fotografia", ["photo"]],
  ["fotografias", ["photo"]],
  ["dados pessoais", ["personal data"]],
  ["finalidade", ["personal data"]],
  ["chave de api", ["api key"]],
  ["chave de cliente", ["api key"]],
  ["chaves de cliente", ["api key"]],
  ["mensageria", ["message queue"]],
  ["fila de mensagens", ["message queue"]],
  ["assinatura", ["signature"]],
  ["imagem", ["image"]],
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
  ["formulário de registo", ["auth", "validation"]],
  ["registration form", ["auth", "validation"]],
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
    pattern: /\b(torna|make).{0,40}\b(segur[ao]|secure)\b/i,
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
  },
  {
    pattern: /\b(whole|entire|complete|todo o|all of the)\b[^.]{0,15}\bmanual\b|\bmanual\b[^.]{0,15}\b(inteiro|completo|todo)\b/i,
    reason: "Aplicar o manual inteiro é uma meta, não uma tarefa de codegen — decompõe num pedido concreto."
  },
  {
    pattern: /\b(give me everything|d[áa]-?me tudo|quero tudo|aplica tudo)\b/i,
    reason: "'Dá-me tudo' deve ser decomposto numa superfície técnica concreta (endpoint + fase + 1-3 concerns)."
  }
];

/**
 * Technologies clearly outside the SbD-ToE manual's scope (advanced cryptography /
 * distributed-ledger / experimental). The grounded codegen has no material for
 * these, so the request is unsupported rather than decomposable.
 */
const UNSUPPORTED_TECH_PATTERN =
  /\b(homomorphic|quantum[- ]?(resistant|safe)?|post[- ]?quantum|blockchain|smart contract|zero[- ]?knowledge|zk[- ]?(snark|stark|proof)s?|secure multiparty|federated learning)\b/i;

// ---------------------------------------------------------------------------
// Input normalization
// ---------------------------------------------------------------------------

export interface NormalizedInput {
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

export function normalizeInput(raw: unknown): NormalizedInput {
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
  Omit<PrepareCodegenContextInput, "task"> & { task_role: string } {
  return {
    task: raw.task ?? "",
    /*
     * 0.20.0-beta.42 — o PAPEL do `task`, declarado. O `select_sbd_toe_requirements` — a
     * superfície irmã, sobre o mesmo input — declara-o há muito como
     * `{role: "recorded_context", affects_selection: false}`; aqui ele era ecoado MUDO, e o
     * consumidor via o seu texto na resposta e concluía que ela tinha sido feita a partir
     * dele. Provado por variação na matriz banda × superfície: dois `task` completamente
     * diferentes produzem payloads idênticos. É contexto registado, não motor de selecção.
     *
     * Duas chaves e mais nada: os gates de orçamento do EPIC não têm folga, e o vocabulário
     * (`recorded_context` / `affects_selection`) já é ensinado no guia e no `select`. Dizer
     * o essencial no mínimo de tokens é a regra desta linha — não se levanta um gate duro
     * para caber uma explicação que já existe noutro sítio.
     */
    task_role: "recorded_context",
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

export interface ActivationResult {
  concerns: Concern[];
  sliceFamilies: string[];
  /** P3 do ciclo MP1 (2026-08-31): famílias contadas para o gate de decomposição —
   * UM SINAL = UMA SUPERFÍCIE. Só o concern PRIMÁRIO de cada sinal (posição 0 do
   * mapeamento do termo/frase; explícitos/intents/ficheiros contam por si) contribui
   * a sua família; concerns de suporte (posições secundárias, ex.: mtls→secrets,
   * message queue→logging) activam categorias mas não são superfícies novas.
   * `sliceFamilies` (grounding) fica intocado. */
  decompositionFamilies: string[];
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

export function activate(
  input: NormalizedInput,
  options: { declaredOnly?: boolean } = {}
): ActivationResult {
  const declaredOnly = options.declaredOnly ?? false;
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

  // 0.20.0-beta.21 — DECLARATIVO PRIMEIRO: tudo o que se segue até ao bloco 4 é
  // INFERÊNCIA SOBRE PROSA/PATHS (termos da tarefa, aliases, compostos, homónimo
  // da imagem, intenções, e as heurísticas de NOME de ficheiro). No caminho
  // declarativo (default nesta linha) NÃO corre: o servidor responde ao que lhe
  // declararam. Fica disponível em mode="discover" — instrumento de investigação
  // (oráculo histórico + estudo de paráfrase), marcado exploratório na resposta.
  if (!declaredOnly) {
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

    // 2b-bis) R-image (vaga v1.8.0, 2026-08-31): "image"/"imagem" é homónimo —
    // imagem de container vs ficheiro de imagem (finding do replay DualGauge).
    // Desambiguação DECLARADA por contexto: image+docker/registry/container → sentido
    // container (deployment/distribution); image+file/upload/photo → FIL (files);
    // ambos os contextos → ambos; nenhum → sentido histórico (deployment/distribution).
    if (taskMatchesKeyword(expanded, "image")) {
      const containerCtx = /docker|registry|container|kubernetes|k8s|\boci\b/.test(expanded);
      const fileCtx = /upload|file|photo|picture|png|jpe?g|gif|avatar|galeria|gallery|perfil|profile/.test(expanded);
      const senses: Array<{ concern: Concern; reason: string }> = [];
      if (fileCtx) {
        senses.push({ concern: "files", reason: "R-image: 'image' em contexto file/upload/photo → ficheiro de imagem (FIL)" });
      }
      if (containerCtx || !fileCtx) {
        senses.push(
          { concern: "deployment", reason: containerCtx ? "R-image: 'image' em contexto docker/registry/container → imagem de container" : "R-image: 'image' sem contexto discriminante → sentido histórico (deployment)" },
          { concern: "distribution", reason: containerCtx ? "R-image: 'image' em contexto docker/registry/container → distribuição de imagem" : "R-image: 'image' sem contexto discriminante → sentido histórico (distribution)" }
        );
      }
      for (const { concern, reason } of senses) {
        recordActivation(
          trace, concerns, concernScores, rejected,
          { source: "task_term", produced: concern, trigger: "image", score: 0.8, confidence: "deterministic", reason },
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
      // 0.20.0-beta.22 (P2-A): isto NUNCA foi um termo da tarefa — é o mapeamento
      // determinístico concern → slice family. A etiqueta `task_term` era órfã do
      // motor lexical e aparecia mesmo com `task` vazio. Em `discover` o task_term
      // legítimo (casamento de palavras) mantém-se; aqui a fonte diz o que é.
      source: declaredOnly ? "concern_slice_mapping" : "task_term",
      produced: family,
      trigger: concern,
      score,
      confidence: "deterministic",
      reason: `Concern '${concern}' maps to AppSec Core slice family '${family}'.`
    });
  }

  // 4b) Declared context activators (G-mp1a / D3, 2026-08-31): exposure and
  // data_sensitivity stop being decorative — they activate concerns by DECLARED
  // rule (each with its own trace source), because the reference selection
  // semantics says an authenticated/public surface must be auditable and a
  // personal/regulated data context must carry crypto+masking+validation.
  if (input.exposure && EXPOSURE_CONCERNS[input.exposure]) {
    for (const concern of EXPOSURE_CONCERNS[input.exposure] ?? []) {
      recordActivation(
        trace, concerns, concernScores, rejected,
        {
          source: "exposure",
          produced: concern,
          trigger: input.exposure,
          score: 0.9,
          confidence: "deterministic",
          reason: `exposure='${input.exposure}' activates ${concern} by declared rule (auditable exposed surface).`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }
  if (input.data_sensitivity && SENSITIVITY_CONCERNS[input.data_sensitivity]) {
    for (const concern of SENSITIVITY_CONCERNS[input.data_sensitivity] ?? []) {
      recordActivation(
        trace, concerns, concernScores, rejected,
        {
          source: "data_sensitivity",
          produced: concern,
          trigger: input.data_sensitivity,
          score: 0.9,
          confidence: "deterministic",
          reason: `data_sensitivity='${input.data_sensitivity}' activates ${concern} by declared rule (ENC/masking/validation for personal or regulated data).`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }

  // 5-pre) 0.20.0-beta.22 (P1-D): o `stack` é a ÚNICA leitura de texto que resta no
  // caminho declarativo (token EXACTO de um conjunto fechado — normalizar o declarado).
  // Deixava de fora o rasto: os capítulos apareciam sem que o auditor pudesse ver
  // porquê. Agora cada token reconhecido emite a sua entrada.
  if (declaredOnly && input.stack) {
    for (const token of stackTokensFromVocabulary(input.stack)) {
      trace.push({
        source: "stack_token",
        produced: token,
        trigger: "stack",
        score: 0.9,
        confidence: "deterministic",
        reason: `token exacto de \`technologies\` encontrado em \`stack\`: '${token}' (normalização de valor declarado; o texto livre à volta é ignorado)`
      });
    }
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

  // P3 (2026-08-31): primary-concern families for the decomposition gate.
  const primaryOfSignal = new Map<string, Concern>();
  for (const [term, mapped] of TASK_TERM_TO_CONCERNS) {
    if (mapped.length > 0) primaryOfSignal.set(term, mapped[0]!);
  }
  for (const [phrase, mapped] of COMPOUND_TERM_TO_CONCERNS) {
    if (mapped.length > 0) primaryOfSignal.set(phrase, mapped[0]!);
  }
  const primaryConcerns = new Set<Concern>();
  for (const entry of trace) {
    if (
      entry.source === "risk_level" ||
      entry.source === "exposure" ||
      entry.source === "data_sensitivity" ||
      entry.source === "scope_gate"
    ) {
      continue; // contexto/informativos — não são superfícies
    }
    if (!concerns.has(entry.produced as Concern)) continue;
    const rowPrimary = primaryOfSignal.get(entry.trigger);
    if (rowPrimary === undefined || rowPrimary === entry.produced) {
      primaryConcerns.add(entry.produced as Concern);
    }
  }
  const decompositionFamilies = [
    ...new Set(
      [...primaryConcerns]
        .map((concern) => CONCERN_TO_SLICE_FAMILY[concern])
        .filter((family): family is string => typeof family === "string")
    )
  ].sort();

  return {
    concerns: [...concerns],
    decompositionFamilies,
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

  if (UNSUPPORTED_TECH_PATTERN.test(input.taskTrimmed)) {
    return {
      status: "unsupported_scope",
      reasons: [
        "A task refere tecnologia fora do âmbito do manual SbD-ToE (ex.: criptografia homomórfica, quantum/post-quantum, blockchain, zero-knowledge)."
      ],
      suggestions: [
        "O SbD-ToE cobre AppSec geral; para esta tecnologia o codegen grounded não tem material.",
        "Reformula para uma superfície coberta (auth, validação, secrets, dependências/SBOM, CI/CD, IaC, monitorização)."
      ]
    };
  }

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
  /** 0.20.0-beta.21: as superfícies vieram de DECLARAÇÕES do chamador (não de prosa). */
  declaredSurfaces?: boolean;
}

function gateAfterActivation(args: PostActivationGateInput): GateDecision | null {
  const { input, activation, estimatedRequirements } = args;
  const declaredSurfaces = args.declaredSurfaces === true;
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // P3 do ciclo MP1 (2026-08-31): o gate conta SUPERFÍCIES (famílias dos concerns
  // primários de cada sinal), não o total de famílias activadas — concerns de
  // suporte de um mesmo sinal (mtls→secrets, mensageria→logging) não pedem
  // decomposição. GC-10 é o caso de referência: 1 integração legítima.
  // 0.20.0-beta.21 («declarativo primeiro»): o gate de decomposição nasceu para travar
  // pedidos VAGOS cuja prosa activava meio catálogo. Quando as famílias vêm de
  // DECLARAÇÕES explícitas, bloquear contradiz o contrato — o chamador não foi vago,
  // foi preciso. O guarda do tamanho da resposta passa a ser (e já era) o tecto de
  // requisitos por detail (0.19.4). Em `discover` a regra mantém-se tal e qual.
  if (!declaredSurfaces && activation.decompositionFamilies.length > 3) {
    reasons.push(
      `Pedido activa ${activation.decompositionFamilies.length} superfícies (famílias primárias: ${activation.decompositionFamilies.join(
        ", "
      )}) — máximo recomendado: 3. Concerns de suporte do mesmo sinal não contam.`
    );
    suggestions.push(
      "Reparte por slice family. Cada PR/PR-step deve ficar em 1–3 slices."
    );
  }

  // G-mp1a decision 2 (2026-08-31, D1): the former hard cap "max 50 activated
  // requirements" is GONE — a legitimate L2 task activates >50 by design (the
  // cap 02 baseline is a real catalogue). The gate guards TASK scope (vague /
  // multi-family asks above) and PAYLOAD (the detail diet + budgets), never a
  // requirement count. estimatedRequirements stays as a debug figure only.
  void estimatedRequirements;

  // D1 (G-mp1a): with the requirement-count cap gone, the no-signal guard is the
  // vagueness catch-all. The informational risk_level trace entry must not defeat
  // it — only real signals (concerns) count.
  if (!declaredSurfaces && activation.concerns.length === 0 && input.tokenCount >= 4) {
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

export function categoriesForConcerns(concerns: Concern[]): Set<string> {
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
  /** MP1 engine override: when given, this exact requirement set is used instead of the category filter. */
  selectedRequirements?: Requirement[];
}): {
  requirements: Requirement[];
  controls: Array<Control & { confidence: "direct" | "derived" }>;
  evidencePatterns: EvidencePattern[];
  activeCategories: string[];
} {
  const ontology = getOntologyData();
  const concernCategories = categoriesForConcerns(args.concerns);

  let filteredRequirements: Requirement[];
  if (args.selectedRequirements) {
    // MP1 engine (G-mp1a O2): the selection operation already produced the set
    // (baseline ∪ context ⊕ narrowing, all declared) — use it verbatim.
    filteredRequirements = args.selectedRequirements;
  } else {
    filteredRequirements = ontology.requirements;
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

/**
 * 0.21.1 — serve só os mapeamentos cujo alvo está no âmbito activado; o resto conta-se e referencia-se.
 * Puro e determinístico: a ordem servida é a ordem publicada.
 */
function scopeOverlayMappings(
  context: RegulatoryOverlayContext,
  scope: {
    requirementIds: ReadonlySet<string>;
    controlIds: ReadonlySet<string>;
    evidencePatternToRequirement: ReadonlyMap<string, string>;
    bundleIds: ReadonlySet<string>;
    obligationIds: readonly string[];
  }
): RegulatoryOverlayContext {
  if (scope.obligationIds.length === 0 || context.mappings.length === 0) return context;
  const inScope = (m: RegulatoryOverlayContext["mappings"][number]): boolean => {
    switch (m.target_type) {
      case "Requirement": return scope.requirementIds.has(m.target_id);
      case "Control": return scope.controlIds.has(m.target_id);
      case "EvidencePattern": return scope.evidencePatternToRequirement.has(m.target_id);
      case "KnowledgeBundle": return scope.bundleIds.has(m.target_id);
      default: return false; // Practice (manual practices chapter:slug) and any future type: counted + ref
    }
  };
  const requirementPairs = new Set(
    context.mappings.filter((m) => m.target_type === "Requirement" && inScope(m)).map((m) => `${m.obligation_id}|${m.target_id}`)
  );
  const served: RegulatoryOverlayContext["mappings"] = [];
  const byType: OverlayMappingsScope["by_target_type"] = {};
  let elided = 0;
  for (const m of context.mappings) {
    const bucket = (byType[m.target_type] ??= { total: 0, served: 0, derivable_elided: 0, out_of_scope: 0 });
    bucket.total += 1;
    if (!inScope(m)) { bucket.out_of_scope += 1; continue; }
    if (m.target_type === "EvidencePattern") {
      const req = scope.evidencePatternToRequirement.get(m.target_id);
      if (req !== undefined && requirementPairs.has(`${m.obligation_id}|${req}`)) { bucket.derivable_elided += 1; elided += 1; continue; }
    }
    bucket.served += 1;
    served.push(m);
  }
  const total = context.mappings.length;
  return {
    ...context,
    mappings: served,
    mappings_scope: {
      total,
      served: served.length,
      derivable_elided: elided,
      out_of_scope: total - served.length - elided,
      by_target_type: byType,
      rest_ref: {
        tool: "resolve_entities",
        with: `record_type="regulatory_mapping", filters={"obligation_id":{"in":${JSON.stringify(scope.obligationIds)}}}`,
        note_id: "prepare.overlay.mappings_scope"
      }
    }
  };
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
// LLM instructions (s3: slot table — single source of truth for the inline
// `full` content AND the sbd://toe/codegen-instructions/{mode} MCP resource)
// ---------------------------------------------------------------------------

/**
 * Conditions under which a conditional instruction slot is included inline at
 * `detail: "full"`. The dieted `codegen_instructions_ref.active_conditions`
 * lists the conditions active for a given call, so a client reading the
 * resource reconstructs the inline instruction list byte-identically.
 */
export type InstructionCondition =
  | "always"
  | "regulatory_overlay"
  | "risk_level:L1"
  | "risk_level:L2"
  | "risk_level:L3"
  | "citations_empty";

export interface InstructionSlot {
  when: InstructionCondition;
  text: string;
}

/**
 * Ordered instruction slots for a mode. The emission order of
 * {@link buildLlmInstructions} is EXACTLY this list filtered by active
 * conditions — the classic (pre-s3) output is byte-identical by construction.
 */
export function instructionSlotsForMode(mode: CodegenMode): InstructionSlot[] {
  const slots: InstructionSlot[] = [
    {
      when: "always",
      text: "Generate code or review changes ONLY against the deterministic IDs provided in `citations` (the closed world of legal ids for this task). Do NOT invent SbD-ToE requirement, control, slice, mechanism or obligation IDs."
    },
    {
      when: "always",
      text: "For each non-trivial design decision, populate the `security_rationale_template.decisions[].cited_ids` with IDs from `citations`. If no ID applies, say so explicitly."
    },
    {
      when: "always",
      text: "List concrete validations in `security_rationale_template.validations` (surface, rule, rejection behaviour). Do NOT claim conformity without naming the validation."
    },
    {
      when: "always",
      text: "List expected evidence in `security_rationale_template.expected_evidence` (test paths, log shapes, SBOM, attestation, scan reports). Code on its own is NOT evidence of compliance."
    },
    {
      when: "regulatory_overlay",
      text: "Regulatory obligations are an EXTERNAL cross-check. Cite obligation IDs in security_rationale only when the change directly addresses them. Do NOT declare GDPR/DORA/CRA/NIS2 compliance."
    },
    {
      when: "always",
      text: "If the requested task does not match the activated scope, REPLY with `status: needs_clarification` and request specifics — do not fabricate IDs."
    }
  ];
  if (mode === "review") {
    slots.push({
      when: "always",
      text: "Review mode: enumerate findings per changed_file, mapped to the activated_scope. Each finding must reference at least one id from `citations` or say 'no normative ID covers this'."
    });
  }
  if (mode === "test-plan") {
    slots.push({
      when: "always",
      text: "Test-plan mode: produce a checklist of tests grouped by validated_id, with input/expectation. Each activated requirement carries its own `verify` (validation method) and `evidence` (expected proof) inline — use them verbatim as the test's expectation; for evidence_pattern_id/control_id/expected_artifact_type_ids follow completeness_report.verification.by_ref."
    });
  }
  for (const level of ["L1", "L2", "L3"] as const) {
    slots.push({
      when: `risk_level:${level}`,
      text: `Risk level ${level} is the active filter — do not propose controls applicable only at a higher level unless explicitly justified.`
    });
  }
  slots.push({
    when: "citations_empty",
    text: "`citations` is empty. This is a strong signal the activated scope did not yield deterministic anchors — request clarification before generating code."
  });
  return slots;
}

/** Conditional slots active for a call (deterministic, from resolved inputs). */
function activeInstructionConditions(args: {
  hasOverlay: boolean;
  riskLevel: RiskLevel | undefined;
  citationMapEmpty: boolean;
}): InstructionCondition[] {
  const active: InstructionCondition[] = [];
  if (args.hasOverlay) active.push("regulatory_overlay");
  if (args.riskLevel) active.push(`risk_level:${args.riskLevel}`);
  if (args.citationMapEmpty) active.push("citations_empty");
  return active;
}

function buildLlmInstructions(args: {
  mode: CodegenMode;
  citedIds: string[];
  hasOverlay: boolean;
  riskLevel: RiskLevel | undefined;
}): string[] {
  const active = new Set<InstructionCondition>(
    activeInstructionConditions({
      hasOverlay: args.hasOverlay,
      riskLevel: args.riskLevel,
      citationMapEmpty: args.citedIds.length === 0
    })
  );
  return instructionSlotsForMode(args.mode)
    .filter((slot) => slot.when === "always" || active.has(slot.when))
    .map((slot) => slot.text);
}

/** Constant part of the security_rationale_template (everything except `task`). */
const SECURITY_RATIONALE_TEMPLATE_SKELETON: Omit<SecurityRationaleTemplate, "task"> = {
  decisions: [
    {
      decision: "<fill: what design choice was made>",
      rationale: "<fill: why, citing IDs from citations>",
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

function buildSecurityRationaleTemplate(task: string): SecurityRationaleTemplate {
  return { task, ...SECURITY_RATIONALE_TEMPLATE_SKELETON };
}

// ---------------------------------------------------------------------------
// MCP resource: sbd://toe/codegen-instructions/{mode} (v2 token diet, s3)
// ---------------------------------------------------------------------------

export const CODEGEN_INSTRUCTION_MODES: readonly CodegenMode[] = [
  "codegen",
  "review",
  "test-plan"
] as const;

export const CODEGEN_INSTRUCTIONS_RESOURCE_URI_PREFIX =
  "sbd://toe/codegen-instructions/";

export function codegenInstructionsResourceUri(mode: CodegenMode): string {
  return `${CODEGEN_INSTRUCTIONS_RESOURCE_URI_PREFIX}${mode}`;
}

/**
 * Full legend of the dieted (`lista`/`standard`) encoding, published in the
 * codegen-instructions resource. Every rule here is a lossless, deterministic
 * derivation over the SAME payload (or an executable reference) — nothing is
 * silently dropped (EPIC invariant 2) and no data changes, only serialization
 * (EPIC invariant 4). 0.21 §1: the requirement is fused (description never
 * leaves) and the evidence_patterns block is gone at every level.
 */
const DETAIL_ENCODING_LEGEND = {
  note:
    "How to read a detail=lista/standard payload of prepare_sbd_toe_codegen_context (0.21). " +
    "Every rule below is a deterministic re-encoding of the same published data: " +
    "nothing is silently dropped. detail=full inlines everything (grounding, relations, trace) " +
    "and declares its price in size_estimate; the fused requirement is identical at every level.",
  levels:
    "lista — every activated requirement complete and verbatim (id, name, type, description, verify, " +
    "evidence) + citable ids + the instructions that forbid inventing ids; manual grounding by " +
    "reference (manual_grounding.entries_ref → detail='full'); relations OUT (g2_context.relations_summary " +
    "keeps the exact accounting; include_relations=true restores them); adjacency SUMMARY inline (top-N + " +
    "denominators), detail by reference. standard — what lista promises plus the adjacency DETAIL inline " +
    "(every undeclared signal that would change the set). full — what standard promises plus manual_grounding verbatim inline, " +
    "g2_context.relations_ref (executable trace calls; include_relations=true inlines them) and " +
    "activation_trace inline; no requirement ceiling. " +
    "'ultrathin' was retired in 0.21 (its documented purpose was to cut the description, which " +
    "is no longer negotiable); 'minimal' became 'lista' (same 8,450 tk envelope).",
  sources: {
    note:
      "Per-item `source` fields are elided. Every list below is source-homogeneous " +
      "(no exceptions): apply the listed source to each of its items. " +
      "g2_context.relations applies only when relations come inline " +
      "(include_relations=true); otherwise g2_context.relations_ref is a derived " +
      "reference to trace_sbd_toe_graph calls, not a source list.",
    map: PROVENANCE_SOURCES
  },
  citations:
    "0.21 §3: `citations` is the closed world of legal ids at EVERY level (citation_map is gone). " +
    "citations.<source>.source_data is an ordered run-length map file -> count. " +
    "The citable ids are NOT repeated: citations.<source>.ids_from is aligned 1:1 " +
    "with the source_data files, and names the payload path whose ids (in payload " +
    "order) form that file's run. Paths of the form section.list[].field iterate a list; " +
    "keys(g2_context.<list>[slice]) (lista/standard) iterate the slice groups in order, then the " +
    "entity-id keys in order; at full the g2 sections are lists (g2_context.<list>[].entity_id). " +
    "If a file ever has no path mapping, the group carries explicit `ids` instead (lossless fallback).",
  activated_scope_requirements:
    "ONE object per requirement (0.21 §1): {id, name, type, description, verify, evidence}. " +
    "`description` is the verbatim published field (data/publish/runtime/requirements.json) and " +
    "NEVER leaves, at any level. `verify` = verification_logic and `evidence` = " +
    "evidence_expectation of the requirement's published evidence pattern " +
    "(data/publish/runtime/evidence_patterns.json, 1:1 per requirement), verbatim. The pattern's " +
    "other fields (evidence_pattern_id, control_id, expected_artifact_type_ids) are served by " +
    "reference: completeness_report.verification.by_ref (get_sbd_toe_verification_matrix, ≤50 " +
    "ids per call). `category` is elided because it equals the id category segment (AUT-003→AUT, " +
    "REQ-AGN-001→AGN; consumer contract v1.10 §1.18) — the field survives inline on any mismatch.",
  activated_scope_controls:
    "controls with confidence='direct' carry the verbatim published `description` " +
    "from data/publish/runtime/controls.json.",
  adjacency:
    "0.21 §2 — `adjacency` at EVERY level: the closed-vocabulary signals you did NOT declare that would " +
    "change the requirement set, with what each would add (arithmetic over the declaration: the same " +
    "deterministic selection re-run with the signal added — never a reading of the task). " +
    "undeclared_that_would_change_the_set is the top-N by would_add; would_change_the_set is the " +
    "denominator (never truncated in silence); scanned is how many vocabulary values were probed. " +
    "`detail` (the full list; the summary is its prefix) is inline at standard/full and reachable via " +
    "detail_ref at lista. In selection_mode='discover' the adjacency is relative to the declaration made, " +
    "not to the inferred set.",
  g2_entities:
    "g2_context.control_objectives/mechanisms/practices/artifacts are grouped as " +
    "{slice_id: {entity_id: name|null}}. entity_type is the list the map lives in " +
    "(ControlObjective/Mechanism/Practice/Artifact), slice_id is the group key, " +
    "slice_family is activated_scope.slices[].objective_family for that slice_id, " +
    "and a null name means the entity is unnamed in the published rastreabilidade " +
    "(the full projection omits `name` for it).",
  verification:
    "There is no g2_context.evidence_patterns block any more (0.21 §1). " +
    "completeness_report.verification declares the denominators: requirements, " +
    "with_verify_and_evidence, partial, without_pattern, and " +
    "related_by_control_outside_scope (patterns linked to an activated control whose " +
    "requirement is not in the activated set — never inlined, reachable via the ref).",
  manual_grounding:
    "At detail=lista/standard, manual_grounding is the counts form: total_entries, the " +
    "manual_commit_sha shared by every group (hoisted; a group keeps its own sha inline " +
    "only if hoisting was not possible), and the (rastreabilidade_role, manual_chapter, " +
    "manual_file) groups with the exact per-group `entries` COUNT (counts sum to " +
    "total_entries — never silent). The grounding id set is already in the same payload " +
    "(g2_context entity-map keys); manual_grounding.entries_ref is the executable " +
    "reference (same input, detail='full') for the verbatim flat entries.",
  activation_trace:
    "activation_trace is elided at detail=lista/standard; " +
    "activation_trace_ref.entries keeps the exact count. Re-call with debug=true " +
    "to include the full trace (it is always inline at detail=full).",
  relations_ref:
    "0.21 §3: inline g2_context.relations are elided at EVERY level (re-call with " +
    "include_relations=true to restore them). At full, g2_context.relations_ref lists the " +
    "executable trace calls; at lista/standard only g2_context.relations_summary (the same exact " +
    "accounting) stays — the edges link nodes this payload already carries. Recover the elided graph edges " +
    "by executing trace_sbd_toe_graph with each {lens, anchor} pair listed " +
    "(anchors are activated slice/entity ids from the same payload); the " +
    "belongsToSlice edges counted as coverage.implicit_in_entities are already " +
    "encoded by the slice grouping key of every g2_context entity; any relation " +
    "covered by neither stays inline in residual_relations (never silent)."
} as const;

export interface CodegenInstructionsResourceContent {
  resource: string;
  line_note: string;
  mode: CodegenMode;
  note: string;
  llm_codegen_instructions: {
    assembly: string;
    slots: InstructionSlot[];
  };
  security_rationale_template: {
    assembly: string;
    template: { task: null } & Omit<SecurityRationaleTemplate, "task">;
  };
  detail_encoding: typeof DETAIL_ENCODING_LEGEND;
}

/**
 * Content of the `sbd://toe/codegen-instructions/{mode}` MCP resource — the
 * static-per-mode text that every level carries inline (this is the reference copy). Reconstructing the inline `full` content from
 * this resource is byte-exact (tested):
 *   - llm_codegen_instructions = slots filtered by `when` ("always" +
 *     codegen_instructions_ref.active_conditions), in order;
 *   - security_rationale_template = template with `task` set to the trimmed
 *     task string (input_echo.task.trim()).
 */
export function buildCodegenInstructionsResourceContent(
  mode: CodegenMode
): CodegenInstructionsResourceContent {
  return {
    resource: codegenInstructionsResourceUri(mode),
    mode,
    note:
      "Static per-mode text of prepare_sbd_toe_codegen_context: the instructions and the " +
      "template are INLINE at every level; this resource is the reference copy, slot by slot. " +
      "Also carries the detail_encoding legend.",
    // 0.15.0 item 8, invertido desde a linha 0.20: aqui o trace EXISTE. (0.21.2: sem versão na prosa servida.)
    line_note:
      "O trace_sbd_toe_graph existe neste servidor: execute os relations_ref " +
      "directamente ({lens, anchor}). include_relations=true no prepare continua " +
      "disponível como atalho para relações inline.",
    llm_codegen_instructions: {
      assembly:
        "Include each slot whose `when` is 'always' or whose condition holds for the call " +
        "(regulatory_overlay: activated_scope.regulatory_obligations non-empty; " +
        "risk_level:<L>: input_echo.risk_level; citations_empty: no citable id), in the " +
        "listed order — the result is byte-identical to the inline llm_codegen_instructions.",
      slots: instructionSlotsForMode(mode)
    },
    security_rationale_template: {
      assembly:
        "Set `task` to the trimmed task string (input_echo.task.trim()); every " +
        "other field is verbatim — the result is byte-identical to the " +
        "detail=full inline security_rationale_template.",
      template: { task: null, ...SECURITY_RATIONALE_TEMPLATE_SKELETON }
    },
    detail_encoding: DETAIL_ENCODING_LEGEND
  };
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
    provenance: { kg: servedKgReleaseTag(), server: servingServerVersion() },
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

const DETAIL_LEVELS: ReadonlySet<string> = new Set(["lista", "standard", "full"]);

/** 0.21: níveis retirados/renomeados — o erro diz para onde foram, nunca só «inválido». */
const RETIRED_DETAIL_LEVELS: Readonly<Record<string, string>> = {
  ultrathin:
    "'ultrathin' retirou-se na 0.21: a sua razão de existir era cortar a descrição publicada, e a descrição deixou de ser negociável (nunca sai, em nenhum nível). Usa detail='lista'.",
  minimal:
    "'minimal' passou a chamar-se 'lista' na 0.21 (herda-lhe o envelope de 8.450 tk; traz a descrição, verify e evidence de cada requisito inline). Usa detail='lista'."
};

/**
 * Validate the `detail` input (v2 token diet, s1). Invalid values fail fast
 * with a JSON-RPC -32602 (same pattern as trace-graph's lens validation);
 * omission defaults to `full` — the classic, byte-identical payload.
 */
function parseDetail(raw: unknown): CodegenDetailLevel {
  const value =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>).detail
      : undefined;
  if (value === undefined) return "full";
  if (typeof value === "string" && DETAIL_LEVELS.has(value)) {
    return value as CodegenDetailLevel;
  }
  const retired = typeof value === "string" ? RETIRED_DETAIL_LEVELS[value] : undefined;
  const message = retired
    ? `Invalid "detail": ${JSON.stringify(value)}. ${retired}`
    : `Invalid "detail": ${JSON.stringify(value)}. Use one of: lista, standard, full.`;
  throw Object.assign(new Error(message), { rpcError: { code: -32602, message } });
}

/**
 * Validate the `include_relations` input (v2 token diet, s2). Only booleans
 * (or omission = false) are accepted — same fail-fast pattern as parseDetail.
 */
function parseIncludeRelations(raw: unknown): boolean {
  const value =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>).include_relations
      : undefined;
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  throw Object.assign(
    new Error(
      `Invalid "include_relations": ${JSON.stringify(value)}. Use a boolean.`
    ),
    {
      rpcError: {
        code: -32602,
        message: 'Invalid "include_relations". Use a boolean.'
      }
    }
  );
}

// Relation predicates published in data/publish/runtime/v1/relations.jsonl —
// the same three the RDF projection exposes to trace_sbd_toe_graph lenses.
const PRED_BELONGS_TO_SLICE = "belongsToSlice";
const PRED_IMPLEMENTED_BY_MECHANISM = "objective_implemented_by_mechanism";
const PRED_REALIZED_BY_PRACTICE = "objective_realized_by_practice";

// s3: slimmed — the full explanation lives in the codegen-instructions MCP
// resource (detail_encoding.relations_ref). Kept URI-free on purpose: the
// no-leak gate scans relations_ref for any scheme://.
const RELATIONS_REF_NOTE_ID: NoteId = "prepare.relations_ref"; // 0.21 §6-c: texto em src/serving/notes.ts → sbd://toe/notes/prepare.relations_ref

/**
 * v2 token diet, s2 — build the `relations_ref` for `detail: "standard" |
 * "minimal"`. See the {@link RelationsRefLensCall} doc block for the full
 * relation-kind → lens mapping. Coverage is decided per relation and counted
 * (never-silent): every inline relation is either recoverable by executing
 * one of the referenced curated lenses, byte-redundant with an entity's
 * `slice_id` in this same payload, or kept inline in `residual_relations`.
 * Deterministic: lens order follows activated_scope.slices order, then sorted
 * fallback anchors.
 */
function buildRelationsRef(result: PrepareCodegenContextResultReady): RelationsRef {
  const relations = result.g2_context.relations;
  const activatedSliceIds = result.activated_scope.slices.map((slice) => slice.slice_id);
  const activatedSliceIdSet = new Set(activatedSliceIds);

  const entitySliceById = new Map<string, string>();
  const entityTypeById = new Map<string, G2ContextEntity["entity_type"]>();
  for (const list of [
    result.g2_context.control_objectives,
    result.g2_context.mechanisms,
    result.g2_context.practices,
    result.g2_context.artifacts
  ]) {
    for (const entity of list) {
      entitySliceById.set(entity.entity_id, entity.slice_id);
      entityTypeById.set(entity.entity_id, entity.entity_type);
    }
  }

  // Objective → activated slice via an explicit belongsToSlice edge (the
  // pattern slice_implementation anchors on), and objectives that have at
  // least one mechanism/practice edge (required by that lens's UNION).
  const sliceEdgeBySubject = new Map<string, string>();
  const subjectsWithTargets = new Set<string>();
  for (const relation of relations) {
    if (
      relation.predicate === PRED_BELONGS_TO_SLICE &&
      activatedSliceIdSet.has(relation.object_id)
    ) {
      if (!sliceEdgeBySubject.has(relation.subject_id)) {
        sliceEdgeBySubject.set(relation.subject_id, relation.object_id);
      }
    } else if (
      relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM ||
      relation.predicate === PRED_REALIZED_BY_PRACTICE
    ) {
      subjectsWithTargets.add(relation.subject_id);
    }
  }

  const sliceImplementationAnchors = new Set<string>();
  const objectiveRealizationAnchors = new Set<string>();
  const mechanismProvenanceAnchors = new Set<string>();
  let viaLenses = 0;
  let implicitInEntities = 0;
  const residual: Array<WithoutSource<G2ContextRelation>> = [];

  for (const relation of relations) {
    if (relation.predicate === PRED_BELONGS_TO_SLICE) {
      if (
        activatedSliceIdSet.has(relation.object_id) &&
        subjectsWithTargets.has(relation.subject_id)
      ) {
        // slice_implementation(anchor=slice) rows carry this edge.
        sliceImplementationAnchors.add(relation.object_id);
        viaLenses += 1;
      } else if (entitySliceById.get(relation.subject_id) === relation.object_id) {
        // Redundant with the entity's own slice_id in g2_context.
        implicitInEntities += 1;
      } else {
        const { source: _source, ...rest } = relation;
        residual.push(rest);
      }
      continue;
    }
    if (
      relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM ||
      relation.predicate === PRED_REALIZED_BY_PRACTICE
    ) {
      const sliceAnchor = sliceEdgeBySubject.get(relation.subject_id);
      if (sliceAnchor !== undefined) {
        sliceImplementationAnchors.add(sliceAnchor);
        viaLenses += 1;
      } else if (entitySliceById.has(relation.subject_id)) {
        // Activated objective without a belongsToSlice edge (data gap).
        objectiveRealizationAnchors.add(relation.subject_id);
        viaLenses += 1;
      } else if (
        (relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM &&
          entityTypeById.get(relation.object_id) === "Mechanism") ||
        (relation.predicate === PRED_REALIZED_BY_PRACTICE &&
          entityTypeById.get(relation.object_id) === "Practice")
      ) {
        // Only the target is activated (cross-slice edge); the predicate is
        // recoverable from the target's entity_type in this payload.
        mechanismProvenanceAnchors.add(relation.object_id);
        viaLenses += 1;
      } else {
        const { source: _source, ...rest } = relation;
        residual.push(rest);
      }
      continue;
    }
    // Unknown predicate — never silently dropped.
    const { source: _source, ...rest } = relation;
    residual.push(rest);
  }

  const lenses: RelationsRefLensCall[] = [
    ...activatedSliceIds
      .filter((sliceId) => sliceImplementationAnchors.has(sliceId))
      .map((anchor): RelationsRefLensCall => ({ lens: "slice_implementation", anchor })),
    ...[...objectiveRealizationAnchors]
      .sort()
      .map((anchor): RelationsRefLensCall => ({ lens: "objective_realization", anchor })),
    ...[...mechanismProvenanceAnchors]
      .sort()
      .map((anchor): RelationsRefLensCall => ({ lens: "mechanism_provenance", anchor }))
  ];

  const relationsRef: RelationsRef = {
    tool: "trace_sbd_toe_graph",
    lenses,
    total_relations: relations.length,
    coverage: {
      via_lenses: viaLenses,
      implicit_in_entities: implicitInEntities,
      residual_inline: residual.length
    },
    note_id: RELATIONS_REF_NOTE_ID
  };
  if (residual.length > 0) relationsRef.residual_relations = residual;
  return relationsRef;
}

function stripSource<T extends { source: unknown }>(
  items: readonly T[]
): Array<Omit<T, "source">> {
  return items.map(({ source: _source, ...rest }) => rest);
}

/**
 * Static map published-file → payload path whose ids, in payload order, are
 * exactly the citation_map run for that file (the citation_map is BUILT by
 * iterating those very lists, in this order — see the core's citation block).
 * Paths use the mini-syntax documented in the resource's
 * `detail_encoding.citations` legend. No file outside this table is expected;
 * if one ever appears, the group falls back to explicit `ids` (lossless).
 */
const CITATION_FILE_TO_PAYLOAD_PATH: Readonly<Record<string, string>> = {
  "data/publish/runtime/requirements.json": "activated_scope.requirements[].id",
  "data/publish/runtime/controls.json": "activated_scope.controls[].control_id",
  "data/publish/runtime/v1/slices.json": "activated_scope.slices[].slice_id",
  "data/publish/runtime/v1/control_objectives.json":
    "keys(g2_context.control_objectives[slice])",
  "data/publish/runtime/v1/mechanisms.json": "keys(g2_context.mechanisms[slice])",
  "data/publish/runtime/v1/practices.json": "keys(g2_context.practices[slice])",
  "data/publish/runtime/v1/artifacts.json": "keys(g2_context.artifacts[slice])",
  "data/publish/overlay/external_frameworks.json":
    "regulatory_overlay.frameworks[].framework_id",
  "data/publish/overlay/external_obligations.json":
    "activated_scope.regulatory_obligations[].obligation_id"
};

/** 0.21 §3: at `full` the g2 entity sections are LISTS (classic), so the ids_from paths differ
 * only for those four files; every other path is shared with the dieted levels. */
const CITATION_FILE_TO_PAYLOAD_PATH_FULL: Readonly<Record<string, string>> = {
  ...CITATION_FILE_TO_PAYLOAD_PATH,
  "data/publish/runtime/v1/control_objectives.json": "g2_context.control_objectives[].entity_id",
  "data/publish/runtime/v1/mechanisms.json": "g2_context.mechanisms[].entity_id",
  "data/publish/runtime/v1/practices.json": "g2_context.practices[].entity_id",
  "data/publish/runtime/v1/artifacts.json": "g2_context.artifacts[].entity_id"
};

/**
 * 0.21 §3 — resolve the ids of a `citations` block over the payload that carries it
 * (any level): `section.list[].field` iterates a list; `keys(g2_context.<list>[slice])`
 * iterates the slice groups then the entity-id keys. Explicit `ids` is the lossless
 * fallback. Exported so consumers and tests read ids by the SAME published rule.
 */
export function citableIds(payload: unknown): string[] {
  const root = payload as { citations?: CitationsBySource } & Record<string, Record<string, unknown>>;
  const at = (path: string): string[] => {
    const keys = /^keys\(g2_context\.([a-z_]+)\[slice\]\)$/.exec(path);
    if (keys) {
      const grouped = (root["g2_context"]?.[keys[1]!] ?? {}) as Record<string, Record<string, unknown>>;
      return Object.values(grouped).flatMap((entities) => Object.keys(entities));
    }
    const list = /^([a-z0-9_]+)\.([a-z0-9_]+)\[\]\.([a-z0-9_]+)$/.exec(path);
    if (!list) throw new Error(`ids_from path desconhecido: ${path}`);
    const items = (root[list[1]!]?.[list[2]!] ?? []) as Array<Record<string, string>>;
    return items.map((item) => item[list[3]!]!);
  };
  return Object.values(root.citations ?? {}).flatMap((group) => group?.ids ?? (group?.ids_from ?? []).flatMap(at));
}

/**
 * Invert the classic `citation_map` (id → {source, source_data}) into
 * source-grouped `citations` (see {@link CitationsGroup}). Pure re-encoding:
 * the exact per-id source and source_data are reconstructible from the
 * ordered run-length `source_data` map — nothing is dropped. s3: ids already
 * present verbatim in a payload section are referenced via `ids_from` instead
 * of repeated; a group keeps explicit `ids` only if one of its files has no
 * payload-path mapping (never expected for the published bundle).
 */
function invertCitationMap(
  citationMap: Record<string, CitationMapEntry>,
  layout: "grouped" | "list" = "grouped"
): CitationsBySource {
  const pathTable = layout === "list" ? CITATION_FILE_TO_PAYLOAD_PATH_FULL : CITATION_FILE_TO_PAYLOAD_PATH;
  const bySource = new Map<CitationMapEntry["source"], Map<string, string[]>>();
  for (const [id, entry] of Object.entries(citationMap)) {
    let files = bySource.get(entry.source);
    if (!files) {
      files = new Map();
      bySource.set(entry.source, files);
    }
    let ids = files.get(entry.source_data);
    if (!ids) {
      ids = [];
      files.set(entry.source_data, ids);
    }
    ids.push(id);
  }
  const citations: CitationsBySource = {};
  for (const [source, files] of bySource) {
    const source_data: Record<string, number> = {};
    const ids: string[] = [];
    const idsFrom: string[] = [];
    let allFilesMapped = true;
    for (const [file, fileIds] of files) {
      source_data[file] = fileIds.length;
      ids.push(...fileIds);
      const path = pathTable[file];
      if (path === undefined) allFilesMapped = false;
      else idsFrom.push(path);
    }
    citations[source] = allFilesMapped
      ? { source_data, ids_from: idsFrom }
      : { source_data, ids };
  }
  return citations;
}

/**
 * Group the flat `manual_grounding` entries by the tuple that repeats
 * verbatim: (rastreabilidade_role, manual_chapter, manual_file,
 * manual_commit_sha). Names are elided ONLY when recoverable from the
 * `g2_context` entity lists in the same payload (they come from the same
 * rastreabilidade source); any non-recoverable name is kept explicitly in
 * `v1_entity_names`, so no information is lost.
 */
function groupManualGrounding(
  result: PrepareCodegenContextResultReady
): ManualGroundingGrouped {
  const g2Names = new Map<string, string | undefined>();
  for (const list of [
    result.g2_context.control_objectives,
    result.g2_context.mechanisms,
    result.g2_context.practices,
    result.g2_context.artifacts
  ]) {
    for (const entity of list) g2Names.set(entity.entity_id, entity.name);
  }

  // Object sentinel: serializes unlike any string/null value, so an absent
  // field can never collide with a real published value in the group key.
  const ABSENT = { absent: true };
  const groups = new Map<string, ManualGroundingGroup>();
  const ungrouped: Array<WithoutSource<ManualGroundingEntry>> = [];

  for (const entry of result.manual_grounding) {
    if (!entry.v1_entity_id) {
      // Lossless guard — the loader keys entries by v1_entity_id, so this is
      // not expected; if it ever happens the entry survives verbatim.
      const { source: _source, ...rest } = entry;
      ungrouped.push(rest);
      continue;
    }
    const hasChapter = "manual_chapter" in entry;
    const hasFile = "manual_file" in entry;
    const hasSha = entry.manual_commit_sha !== undefined;
    const key = JSON.stringify([
      entry.rastreabilidade_role,
      hasChapter ? entry.manual_chapter ?? null : ABSENT,
      hasFile ? entry.manual_file ?? null : ABSENT,
      hasSha ? entry.manual_commit_sha : ABSENT
    ]);
    let group = groups.get(key);
    if (!group) {
      group = {
        rastreabilidade_role: entry.rastreabilidade_role,
        ...(hasChapter ? { manual_chapter: entry.manual_chapter ?? null } : {}),
        ...(hasFile ? { manual_file: entry.manual_file ?? null } : {}),
        ...(hasSha ? { manual_commit_sha: entry.manual_commit_sha } : {}),
        v1_entity_ids: []
      };
      groups.set(key, group);
    }
    group.v1_entity_ids.push(entry.v1_entity_id);
    if (
      entry.v1_entity_name &&
      g2Names.get(entry.v1_entity_id) !== entry.v1_entity_name
    ) {
      (group.v1_entity_names ??= {})[entry.v1_entity_id] = entry.v1_entity_name;
    }
  }

  const grouped: ManualGroundingGrouped = {
    total_entries: result.manual_grounding.length,
    groups: [...groups.values()]
  };
  if (ungrouped.length > 0) grouped.ungrouped = ungrouped;
  return grouped;
}

// s3b: kept URI-free on purpose (no-leak discipline, same as RELATIONS_REF_NOTE).
const GROUNDING_ENTRIES_REF_NOTE_ID: NoteId = "prepare.grounding.entries_ref"; // 0.21 §6-c: texto em src/serving/notes.ts → sbd://toe/notes/prepare.grounding.entries_ref

/**
 * v2 token diet, s3b (revised ADENDA 2026-07-05) — minimal-form
 * `manual_grounding`, derived from the detail="standard" grouping (so the 1:1
 * group alignment holds by construction). Serialization-only cut, never
 * silent:
 *   - per-group `v1_entity_ids` → exact `entries` count (Σ == total_entries);
 *   - `manual_commit_sha` hoisted to the top level iff EVERY group carries
 *     the same sha (expected always: one published manual commit); otherwise
 *     each group keeps its own sha inline (lossless guard);
 *   - `v1_entity_names` (never expected) and `ungrouped` (never expected)
 *     survive verbatim — no name or entry can be lost;
 *   - `groups_ref` is the executable reference to the full grouping.
 * Invariant-3 note: grounding ids never feed `citations`/`ids_from`, and the
 * id set stays reconstructible from this same payload's g2_context entity
 * maps without any extra call.
 */
function buildMinimalGrounding(grouped: ManualGroundingGrouped): ManualGroundingMinimal {
  const shas = grouped.groups.map((group) => group.manual_commit_sha);
  const hoistedSha =
    grouped.groups.length > 0 &&
    shas[0] !== undefined &&
    shas.every((sha) => sha === shas[0])
      ? shas[0]
      : undefined;

  const minimal: ManualGroundingMinimal = {
    total_entries: grouped.total_entries,
    ...(hoistedSha !== undefined ? { manual_commit_sha: hoistedSha } : {}),
    groups: grouped.groups.map((group) => ({
      rastreabilidade_role: group.rastreabilidade_role,
      ...("manual_chapter" in group ? { manual_chapter: group.manual_chapter } : {}),
      ...("manual_file" in group ? { manual_file: group.manual_file } : {}),
      ...(hoistedSha === undefined && group.manual_commit_sha !== undefined
        ? { manual_commit_sha: group.manual_commit_sha }
        : {}),
      entries: group.v1_entity_ids.length,
      ...(group.v1_entity_names ? { v1_entity_names: group.v1_entity_names } : {})
    })),
    entries_ref: {
      tool: "prepare_sbd_toe_codegen_context",
      with: { detail: "full" },
      note_id: GROUNDING_ENTRIES_REF_NOTE_ID
    }
  };
  if (grouped.ungrouped) minimal.ungrouped = grouped.ungrouped;
  return minimal;
}

// (notas s3c removidas na 0.21 — o nível ultrathin reformou-se.)



/** Slice-grouped, name-only entity encoding (see {@link SliceGroupedEntityNames}). */
function groupEntitiesBySlice(
  entities: readonly G2ContextEntity[]
): SliceGroupedEntityNames {
  const grouped: SliceGroupedEntityNames = {};
  for (const entity of entities) {
    (grouped[entity.slice_id] ??= {})[entity.entity_id] = entity.name ?? null;
  }
  return grouped;
}

/** `category` is derivable iff it equals the requirement_id category segment
 * (the one before the number — `REQ-AGN-001` → `AGN`; grammar v1.10 §1.18,
 * single source `requirementCategoryOf`). Bundle-wide invariant, guarded per item. */
function categoryIsDerivable(requirementId: string, category: string): boolean {
  const derived = requirementCategoryOf(requirementId);
  return derived !== undefined && derived === category;
}

/** Dieted requirements (0.21 §1): the fused object minus per-item `source`;
 * `category` elided iff derivable from the id (lossless guard otherwise). The
 * description/verify/evidence come from the core — they are the SAME at every
 * level; nothing is added or removed here. */
function dietRequirements(requirements: ActivatedScope["requirements"]): DietedRequirement[] {
  return requirements.map((item) => {
    const { source: _source, category, ...rest } = item;
    return {
      ...rest,
      ...(category !== undefined && !categoryIsDerivable(item.id, category) ? { category } : {})
    };
  });
}

/** Dieted controls: `source` elided; the `direct` controls' verbatim published
 * `description` comes from the core (0.21: at every level, full included). */
function dietControls(controls: ActivatedScope["controls"]): DietedControl[] {
  return stripSource(controls);
}

/**
 * 0.21 — a forma por nível é uma TABELA, não ramos: o que cada nível põe
 * inline e o que põe por referência. Parametrizável de propósito — a §4 do
 * despacho (o Mensor mede se o `manual_grounding` vai inline ou por
 * referência) e o «2 ou 3 níveis» ficam em aberto e decidem-se aqui, numa
 * linha, sem reescrever o servidor.
 */
export const LEVEL_FORM: Readonly<
  Record<
    Exclude<CodegenDetailLevel, "full">,
    { manual_grounding: "ref"; relations: "ref"; adjacency_detail: "ref" | "inline" }
  >
> = {
  lista: { manual_grounding: "ref", relations: "ref", adjacency_detail: "ref" }, // relations "ref" = 0.21 §3 summary (accounting + way back)
  standard: { manual_grounding: "ref", relations: "ref", adjacency_detail: "inline" } // 0.21 §2: o separador lista↔standard
};

const ADJACENCY_DETAIL_REF_NOTE_ID: NoteId = "prepare.adjacency.detail_ref"; // 0.21 §6-c: texto em src/serving/notes.ts → sbd://toe/notes/prepare.adjacency.detail_ref

/**
 * Dieted encoding for `detail: "lista" | "standard"` (0.21). Pure
 * post-processing over the full result. The citable ID set is EXACTLY the
 * full one (invariant 3). Every cut is either a lossless derivable-field
 * re-encoding documented in the codegen-instructions resource legend, or an
 * explicit bound with counts plus an executable reference (never silent):
 *   - s1: inverted citations, per-item `source` legend;
 *   - s2: relations on-demand via `relations_ref` (include_relations restores);
 *   - 0.21 §1: the fused requirement is byte-identical to full's minus
 *     `source`; instructions + template INLINE; manual_grounding in the
 *     counts form with `entries_ref` → detail="full"; trace only with debug.
 */
const RELATIONS_SUMMARY_NOTE_ID: NoteId = "prepare.relations_summary"; // 0.21 §6-c: texto em src/serving/notes.ts → sbd://toe/notes/prepare.relations_summary

/**
 * 0.21 §3 — the SERVED full: classic content, two form changes, same citable set.
 * `citations` (inverted; ids via list paths) replaces `citation_map`; `relations_ref`
 * replaces the inline relations unless `include_relations: true`.
 */
function shapeFull(
  result: PrepareCodegenContextResultReady,
  includeRelations: boolean
): PrepareCodegenContextResultReadyFull {
  const { citation_map, g2_context, ...rest } = result;
  const { relations, ...g2 } = g2_context;
  return {
    ...rest,
    ...(includeRelations ? { input_echo: { ...result.input_echo, include_relations: true } } : {}),
    g2_context: {
      ...g2,
      ...(includeRelations ? { relations } : { relations_ref: buildRelationsRef(result) })
    },
    citations: invertCitationMap(citation_map, "list")
  };
}

function applyStructuralDiet(
  result: PrepareCodegenContextResultReady,
  detail: Exclude<CodegenDetailLevel, "full">,
  includeRelations: boolean
): PrepareCodegenContextResultReadyDieted {
  const form = LEVEL_FORM[detail];
  // 0.21 §3: the exact accounting comes from the same builder the full uses for relations_ref.
  const relationsRef = includeRelations || form.relations !== "ref" ? undefined : buildRelationsRef(result);
  const dieted: PrepareCodegenContextResultReadyDieted = {
    status: result.status,
    notes: NOTES_HEADER,
    mode: result.mode,
    // Echo the requested detail (and the include_relations escape hatch, when
    // active) for audit; the FULL result never echoes either (explicit "full"
    // must stay byte-identical to the omitted form).
    input_echo: {
      ...result.input_echo,
      detail,
      ...(includeRelations ? { include_relations: true } : {})
    },
    ...(result.debug
      ? { activation_trace: result.activation_trace }
      : {
          activation_trace_ref: {
            entries: result.activation_trace.length,
            note_id: "prepare.activation_trace_ref"
          } satisfies ActivationTraceRef
        }),
    provenance_legend: PROVENANCE_LEGEND,
    activated_scope: {
      requirements: dietRequirements(result.activated_scope.requirements),
      controls: dietControls(result.activated_scope.controls),
      slices: stripSource(result.activated_scope.slices),
      regulatory_obligations: stripSource(result.activated_scope.regulatory_obligations)
    },
    // 0.21 §2: resumo sempre; detalhe inline (standard) ou por referência executável (lista).
    adjacency:
      form.adjacency_detail === "inline"
        ? result.adjacency
        : {
            undeclared_that_would_change_the_set: result.adjacency.undeclared_that_would_change_the_set,
            scanned: result.adjacency.scanned,
            would_change_the_set: result.adjacency.would_change_the_set,
            shown: result.adjacency.shown,
            detail_ref: { tool: "prepare_sbd_toe_codegen_context", with: { detail: "standard" }, note_id: ADJACENCY_DETAIL_REF_NOTE_ID }
          },
    g2_context: {
      control_objectives: groupEntitiesBySlice(result.g2_context.control_objectives),
      mechanisms: groupEntitiesBySlice(result.g2_context.mechanisms),
      practices: groupEntitiesBySlice(result.g2_context.practices),
      artifacts: groupEntitiesBySlice(result.g2_context.artifacts),
      ...(relationsRef === undefined
        ? { relations: stripSource(result.g2_context.relations) }
        : {
            relations_summary: {
              total_relations: relationsRef.total_relations,
              via_lenses: relationsRef.coverage.via_lenses,
              implicit_in_entities: relationsRef.coverage.implicit_in_entities,
              residual_inline: relationsRef.coverage.residual_inline,
              note_id: RELATIONS_SUMMARY_NOTE_ID
            } satisfies RelationsSummary,
            ...(relationsRef.residual_relations ? { residual_relations: relationsRef.residual_relations } : {})
          })
    },
    manual_grounding: buildMinimalGrounding(groupManualGrounding(result)),
    regulatory_overlay: {
      frameworks: stripSource(result.regulatory_overlay.frameworks),
      obligations: stripSource(result.regulatory_overlay.obligations),
      mappings: stripSource(result.regulatory_overlay.mappings),
      playbooks: stripSource(result.regulatory_overlay.playbooks),
      ...(result.regulatory_overlay.mappings_scope ? { mappings_scope: result.regulatory_overlay.mappings_scope } : {})
    },
    citations: invertCitationMap(result.citation_map),
    completeness_report: result.completeness_report,
    llm_codegen_instructions: result.llm_codegen_instructions,
    security_rationale_template: result.security_rationale_template,
    // s4: identical re-call is deterministic — point the client back at the
    // context it already holds.
    repeat_call_hint: { note_id: REPEAT_CALL_HINT_ID },
    provenance: result.provenance
  };
  if (result.debug) dieted.debug = result.debug;
  return dieted;
}

/**
 * 0.21 §5 — o preço declarado. Duas passagens: a primeira mede com o campo a
 * zero, a segunda re-mede com os dígitos reais lá dentro, para que o número
 * anunciado seja o do payload QUE O CONSUMIDOR RECEBE (±1 token de
 * arredondamento, nunca mais). Régua = chars/4, a mesma da medição do §5.
 */
const ENVELOPE_EXCEEDED_NOTE_ID: NoteId = "prepare.size_estimate.envelope_exceeded"; // 0.21 §6-c: texto em src/serving/notes.ts → sbd://toe/notes/prepare.size_estimate.envelope_exceeded

function withSizeEstimate<T extends object>(
  payload: T,
  detail: CodegenDetailLevel,
  opts: { irreducible?: boolean } = {}
): T & { size_estimate: DeclaredSize } {
  const envelope = LEVEL_ENVELOPE_TK[detail];
  const declare = (est: SizeEstimate): DeclaredSize =>
    envelope === undefined
      ? est
      : {
          ...est,
          envelope_tk: envelope,
          within_envelope: est.approx_tokens <= envelope,
          ...(est.approx_tokens <= envelope ? {} : { note_id: ENVELOPE_EXCEEDED_NOTE_ID }),
          ...(opts.irreducible ? { irreducible_note_id: IRREDUCIBLE_NOTE_ID } : {})
        };
  const first = estimateSize({ ...payload, size_estimate: declare({ chars: 0, approx_tokens: 0 }) });
  const second = estimateSize({ ...payload, size_estimate: declare(first) });
  return { ...payload, size_estimate: declare(second) };
}

/** Um payload moldado e medido, sem a regra de custo (é a régua que a regra usa). */
function renderPrepare(
  raw: PrepareCodegenContextInput,
  out?: { ctx?: CoreContext }
): PrepareCodegenContextResult {
  // `detail` and `include_relations` select the response ENCODING only —
  // they are validated up-front and never influence activation/resolution.
  const detail = parseDetail(raw);
  const includeRelations = parseIncludeRelations(raw);
  const result = prepareCodegenContextCore(raw, out);
  const shaped =
    result.status !== "ready_for_codegen"
      ? result
      : detail === "full"
        ? shapeFull(result, includeRelations)
        : applyStructuralDiet(result, detail, includeRelations);
  // RF-H: append the advisory band (status-aware, pure) around the deterministic result.
  const withNext = { ...shaped, next: prepareCodegenAffordances(result.status, "citation_map" in result ? Object.keys(result.citation_map).filter((id) => /^[A-Z]{3}-\d{3}$/.test(id)) : []) };
  // 0.21 §5: every ready payload declares its price (full has no ceiling — it declares instead).
  return withNext.status === "ready_for_codegen" ? withSizeEstimate(withNext, detail) : withNext;
}

export function handlePrepareCodegenContext(
  raw: PrepareCodegenContextInput
): PrepareCodegenContextResult {
  const detail = parseDetail(raw);
  const out: { ctx?: CoreContext } = {};
  const rendered = renderPrepare(raw, out);
  // 0.21.2 (decisão 0004): em lista/standard a resposta pronta CABE no envelope, medida sobre
  // o payload que o cliente recebe. `full` não tem envelope (declara o preço, inalterado).
  if (detail === "full" || rendered.status !== "ready_for_codegen" || out.ctx === undefined) return rendered;
  const size = (rendered as { size_estimate?: DeclaredSize }).size_estimate;
  if (size === undefined || size.within_envelope !== false) return rendered;
  // Os opt-ins explícitos (`include_relations`, `debug`) acrescentam o que o consumidor pediu
  // por cima da forma do nível: a decisão mede a FORMA CANÓNICA do nível; se essa cabe, o pedido
  // serve-se com o preço declarado (os lotes não levariam o opt-in — decompor tirava-lho).
  if (raw.include_relations === true || raw.debug === true) {
    const canonical = renderPrepare({ ...raw, include_relations: false, debug: false });
    const canonicalSize = (canonical as { size_estimate?: DeclaredSize }).size_estimate;
    if (canonical.status !== "ready_for_codegen" || canonicalSize === undefined || canonicalSize.within_envelope !== false) return rendered;
    return applyCostCeiling(raw, detail, rendered, out.ctx, canonicalSize.approx_tokens);
  }
  return applyCostCeiling(raw, detail, rendered, out.ctx, size.approx_tokens);
}

const IRREDUCIBLE_NOTE_ID: NoteId = "prepare.size_estimate.irreducible"; // 0.21.2: texto em src/serving/notes.ts

/**
 * 0.21.2 (decisão 0004) — a regra de custo. O payload pronto não coube no envelope do nível:
 *  - com MENOS de duas categorias decomponíveis, é um lote irredutível — serve-se pronto e
 *    declarado (`irreducible_note_id`), nunca outra decomposição (é o que impede o ciclo);
 *  - com duas ou mais, `needs_decomposition` com lotes que SOMAM O TODO, empacotados por
 *    payload MEDIDO: categorias por custo isolado decrescente (desempate por id), cada uma no
 *    primeiro lote em que o payload real do lote continue dentro do envelope.
 * Cada medição constrói o payload com os MESMOS inputs que a chamada do lote vai usar.
 */
function applyCostCeiling(
  raw: PrepareCodegenContextInput,
  detail: Exclude<CodegenDetailLevel, "full">,
  rendered: PrepareCodegenContextResult,
  ctx: CoreContext,
  wholeTk: number
): PrepareCodegenContextResult {
  const { input, activation, selection, declaredTechnologies } = ctx;
  const envelope = LEVEL_ENVELOPE_TK[detail] ?? 0;

  // O que cada lote leva literalmente, além das suas categorias.
  const carried = {
    // O modo muda o conteúdo (review/test-plan): um lote nunca pode correr noutro modo. O default
    // (codegen) não se repete — a receita ensinada é task + risk_level + detail + with.
    ...(raw.mode !== undefined && raw.mode !== "codegen" ? { mode: raw.mode } : {}),
    ...(declaredTechnologies.length > 0 ? { technologies: [...declaredTechnologies] } : {}),
    ...(input.changed_files.length > 0 ? { changed_files: [...input.changed_files] } : {}),
    ...(input.regulatory_frameworks.length > 0 ? { regulatory_frameworks: [...input.regulatory_frameworks] } : {}),
    ...(input.include_regulatory_overlay ? { include_regulatory_overlay: true } : {})
  };
  const baseRaw = {
    ...(typeof raw.task === "string" ? { task: raw.task } : {}),
    ...(raw.risk_level !== undefined ? { risk_level: raw.risk_level } : {}),
    detail
  } as PrepareCodegenContextInput;
  // 0.21.2 (decisão 0005): cada lote é o pedido original restrito às suas categorias — leva as
  // fatias que o pedido activava. Uma família entra num lote quando uma concern activada pelo
  // pedido a produz e cobre uma das categorias do lote; as famílias do pedido que não cobrem
  // nenhuma categoria da selecção («órfãs») vão no lote da categoria mais cara, para a união
  // nunca perder uma fatia. Calculado aqui, antes do empacotamento, porque o custo medido já as inclui.
  const sliceUnits = [...new Set(selection.selected.map((r) => r.category))];
  const familyOfConcernCovering = (categories: ReadonlySet<string>): Set<string> => {
    const fams = new Set<string>();
    for (const concern of activation.concerns) {
      const family = CONCERN_TO_SLICE_FAMILY[concern];
      if (family && [...categoriesForConcerns([concern])].some((k) => categories.has(k))) fams.add(family);
    }
    return fams;
  };
  const coveredFamilies = familyOfConcernCovering(new Set(sliceUnits));
  const orphanFamilies = activation.sliceFamilies.filter((f) => !coveredFamilies.has(f));
  let anchorCategory: string | undefined; // definida depois de ordenar as unidades
  const familiesFor = (categories: readonly string[]): string[] => {
    const fams = familyOfConcernCovering(new Set(categories));
    if (anchorCategory !== undefined && categories.includes(anchorCategory)) for (const f of orphanFamilies) fams.add(f);
    return [...fams].sort();
  };
  const measure = (categories: string[]) => {
    const o: { ctx?: CoreContext } = {};
    const families = familiesFor(categories);
    const r = renderPrepare({ ...baseRaw, ...carried, categories, ...(families.length > 0 ? { slice_families: families } : {}) }, o);
    if (r.status !== "ready_for_codegen" || o.ctx === undefined) {
      throw new Error(`cost ceiling: batch categories=[${categories.join(",")}] did not render ready (${r.status}).`);
    }
    return {
      tk: (r as { size_estimate: DeclaredSize }).size_estimate.approx_tokens,
      ids: o.ctx.selection.selected.map((x) => x.requirement_id)
    };
  };

  // Requisitos que o que é preservado em todos os lotes traz por si (ex.: SES-008 por `jwt`):
  // vêm em todos os lotes, logo não são unidade de decomposição.
  const carriedIds = new Set<string>();
  if (carried.technologies || carried.changed_files) {
    const o: { ctx?: CoreContext } = {};
    const r = renderPrepare({ ...baseRaw, ...carried }, o);
    if (r.status === "ready_for_codegen" && o.ctx) for (const x of o.ctx.selection.selected) carriedIds.add(x.requirement_id);
  }
  const units = [...new Set(selection.selected.filter((r) => !carriedIds.has(r.requirement_id)).map((r) => r.category))].sort();

  if (units.length < 2) {
    // Irredutível: pronto e declarado fora do envelope.
    const { size_estimate: _drop, ...payload } = rendered as PrepareCodegenContextResult & { size_estimate: DeclaredSize };
    void _drop;
    return withSizeEstimate(payload, detail, { irreducible: true }) as PrepareCodegenContextResult;
  }

  // A âncora das famílias órfãs fixa-se ANTES de medir (o custo isolado de uma categoria depende
  // das fatias que leva): a primeira categoria por custo sem órfãs, desempate por id.
  const bare = new Map(units.map((c) => [c, measure([c]).tk]));
  anchorCategory = [...units].sort((a, b2) => bare.get(b2)! - bare.get(a)! || a.localeCompare(b2))[0];
  const isolated = new Map(units.map((c) => [c, c === anchorCategory && orphanFamilies.length > 0 ? measure([c]).tk : bare.get(c)!]));
  const order = [...units].sort((a, b2) => isolated.get(b2)! - isolated.get(a)! || a.localeCompare(b2));
  const bins: Array<{ categories: string[]; tk: number }> = [];
  for (const category of order) {
    const alone = isolated.get(category)!;
    let placed = false;
    if (alone <= envelope) {
      for (const bin of bins) {
        if (bin.tk > envelope) continue; // lote irredutível: fica sozinho
        const trial = measure([...bin.categories, category]);
        if (trial.tk <= envelope) { bin.categories.push(category); bin.tk = trial.tk; placed = true; break; }
      }
    }
    if (!placed) bins.push({ categories: [category], tk: alone });
  }
  // 0.21.2 (decisão 0005): uma decomposição tem sempre dois lotes ou mais. Se o empacotamento der um
  // só lote (com ≥2 categorias, garantido acima), a última categoria sai para um lote próprio — ambos medidos.
  if (bins.length === 1) {
    const only = bins[0]!;
    const last = only.categories.pop()!;
    only.tk = measure(only.categories).tk;
    bins.push({ categories: [last], tk: measure([last]).tk });
  }

  const activatorConcerns = new Set<string>([
    ...(input.exposure ? EXPOSURE_CONCERNS[input.exposure] ?? [] : []),
    ...(input.data_sensitivity ? SENSITIVITY_CONCERNS[input.data_sensitivity] ?? [] : [])
  ]);
  const concernsForCategory = (category: string): string[] =>
    [...new Set([...input.concerns, ...activation.concerns])].filter((c) => categoriesForConcerns([c as Concern]).has(category)).sort();
  const union = new Set<string>();
  const batches: DecompositionBatch[] = bins.map((bin) => {
    const m = measure(bin.categories);
    for (const id of m.ids) union.add(id);
    const categories = bin.categories;
    const concerns = [...new Set(categories.flatMap(concernsForCategory))].filter((c) => !activatorConcerns.has(c) || input.concerns.includes(c as Concern)).sort();
    return {
      with: {
        categories: [...categories],
        ...(carried.mode !== undefined ? { mode: carried.mode } : {}),
        ...(familiesFor(categories).length > 0 ? { slice_families: familiesFor(categories) } : {}),
        ...carried
      },
      requirements: m.ids.length,
      measured_tk: m.tk,
      irreducible: categories.length === 1 && m.tk > envelope,
      derived_from: {
        concerns,
        ...(input.exposure && categories.some((cat) => [...activatorConcerns].some((c) => (EXPOSURE_CONCERNS[input.exposure!] ?? []).includes(c as Concern) && categoriesForConcerns([c as Concern]).has(cat))) ? { exposure: input.exposure } : {}),
        ...(input.data_sensitivity && categories.some((cat) => [...activatorConcerns].some((c) => (SENSITIVITY_CONCERNS[input.data_sensitivity!] ?? []).includes(c as Concern) && categoriesForConcerns([c as Concern]).has(cat))) ? { data_sensitivity: input.data_sensitivity } : {})
      }
    };
  });
  const selectedIds = selection.selected.map((r) => r.requirement_id);
  const covered = selectedIds.filter((id) => union.has(id)).length;
  const recall = selectedIds.length === 0 ? 1 : covered / selectedIds.length;
  const preserved = [
    ...(carried.technologies ? ["technologies"] : []),
    ...(carried.changed_files ? ["changed_files"] : []),
    ...(carried.regulatory_frameworks || carried.include_regulatory_overlay ? ["overlay"] : [])
  ];
  const anyFamilies = batches.some((bt) => (bt.with.slice_families?.length ?? 0) > 0);
  const b = blocked(
    input,
    raw,
    "needs_decomposition",
    [
      `O payload de ${selection.selected.length} requisitos em detail="${detail}" mede ${wholeTk} tk — acima do envelope de ${envelope} tk deste nível ` +
        `(medido sobre o payload que receberias: requisitos, controlos, entidades, adjacência e overlay).`
    ],
    [
      `Divide em ${batches.length} lotes que SOMAM O TODO (união = ${union.size} ids, m_recall ${recall.toFixed(2)} face à selecção inteira): ` +
        "repete com task + risk_level + detail + `categories` do lote" +
        (preserved.length > 0 || anyFamilies ? ` + o \`with\` do lote tal e qual (${[...preserved, ...(anyFamilies ? ["slice_families"] : [])].join("/")})` : "") +
        ". Cada lote é o teu pedido restrito às suas categorias: os mesmos requisitos e o mesmo contexto (fatias AppSec Core e manual_grounding) para elas" +
        ". Cada lote é a partição EXACTA das categorias que a tua declaração activou — exposure/data_sensitivity estão lá pelo seu efeito (re-declará-los somaria as suas categorias a todos os lotes). Cada lote foi medido e cabe no envelope, salvo irredutível declarado. Lotes: " +
        batches.map((bt, i) => `${i + 1}) categories=[${bt.with.categories.map((c) => `"${c}"`).join(", ")}] (${bt.requirements} reqs, ${bt.measured_tk} tk${bt.irreducible ? ", IRREDUTÍVEL: sai pronto e declarado fora do envelope" : ""}; de ${bt.derived_from.concerns.map((c) => `"${c}"`).join(", ") || "activadores"}${bt.derived_from.exposure ? `, exposure=${bt.derived_from.exposure}` : ""}${bt.derived_from.data_sensitivity ? `, data_sensitivity=${bt.derived_from.data_sensitivity}` : ""})`).join("; ") +
        ".",
      `Em alternativa usa detail="full" (sem envelope — preço declarado em size_estimate) ou reduz o âmbito da task.`
    ],
    activation.trace,
    input.debug ? { rejected: activation.rejected, notes: activation.notes } : undefined
  );
  b.requirement_ceiling = {
    detail,
    basis: "measured_payload",
    selected: selection.selected.length,
    projected_tk: wholeTk,
    promise_tk: envelope,
    batches,
    union: { requirements: union.size, recall: Number(recall.toFixed(4)) }
  };
  return { ...b, next: prepareCodegenAffordances(b.status, []) };
}

/**
 * 0.21.2 (decisão 0004 §2) — a ÚNICA projecção que sobra: o `next` do select anuncia o custo
 * de um prepare que ainda não foi pedido. Soma, por requisito, a média MEDIDA da sua categoria
 * (payload real de `categories=[c]` em L3, menos a base), mais a base do nível — tudo derivado
 * do bundle servido, calibrado uma vez por processo, determinístico. É ESTIMATIVA declarada e
 * NUNCA bloqueia: quem decide é o prepare, que mede o payload real.
 */
type CostCalibration = { base: number; perRequirement: Map<string, number>; fallback: number };
const COST_CALIBRATION = new Map<string, CostCalibration>();

function calibrateCost(detail: Exclude<CodegenDetailLevel, "full">): CostCalibration {
  const cached = COST_CALIBRATION.get(detail);
  if (cached) return cached;
  const categories = [...new Set(getOntologyData().requirements.map((r) => r.category))].sort();
  const samples: Array<{ category: string; tk: number; n: number; reqTk: number }> = [];
  for (const category of categories) {
    const o: { ctx?: CoreContext } = {};
    const r = renderPrepare({ task: "cost calibration", risk_level: "L3", detail, categories: [category] }, o);
    if (r.status !== "ready_for_codegen" || !o.ctx || o.ctx.selection.selected.length === 0) continue;
    const reqTk = estimateSize((r as PrepareCodegenContextResultReadyDieted).activated_scope.requirements).approx_tokens;
    samples.push({ category, tk: (r as { size_estimate: DeclaredSize }).size_estimate.approx_tokens, n: o.ctx.selection.selected.length, reqTk });
  }
  // Base = o menor custo que não é requisito entre as categorias (limite inferior do fixo).
  const base = samples.length > 0 ? Math.min(...samples.map((x) => x.tk - x.reqTk)) : 0;
  const perRequirement = new Map(samples.map((x) => [x.category, (x.tk - base) / x.n]));
  const totalN = samples.reduce((a, x) => a + x.n, 0);
  const fallback = totalN > 0 ? samples.reduce((a, x) => a + (x.tk - base), 0) / totalN : 0;
  const calibration = { base, perRequirement, fallback };
  COST_CALIBRATION.set(detail, calibration);
  return calibration;
}

export function estimatePrepareCostTk(detail: Exclude<CodegenDetailLevel, "full">, requirementIds: readonly string[]): number {
  if (requirementIds.length === 0) return 0;
  const calibration = calibrateCost(detail);
  const categoryOf = new Map(getOntologyData().requirements.map((r) => [r.requirement_id, r.category]));
  let total = calibration.base;
  for (const id of requirementIds) total += calibration.perRequirement.get(categoryOf.get(id) ?? "") ?? calibration.fallback;
  return Math.round(total);
}

interface CoreContext {
  input: NormalizedInput;
  activation: ReturnType<typeof activate>;
  selection: SelectionResult;
  declaredTechnologies: string[];
}

function prepareCodegenContextCore(
  raw: PrepareCodegenContextInput,
  out?: { ctx?: CoreContext }
): PrepareCodegenContextResultReady | PrepareCodegenContextResultBlocked {
  const input = normalizeInput(raw);

  // 0.21 §6 — o `task` vs o contrato: em modo DECLARATIVO com declaração, o task é contexto
  // REGISTADO (task_role: recorded_context) e NÃO influencia o resultado — logo não pode
  // barrar a resposta (contagem de palavras, padrões de vagueza, tecnologia fora do âmbito).
  // O gate mantém-se onde o task é MOTOR: em `discover`, e em declarativo sem declaração
  // (onde a selecção responde needs_input de qualquer forma).
  const selectionModeEarly = raw.selection_mode === "discover" ? "discover" : "declarative";
  const structuralEarly = {
    chapters: Array.isArray(raw.chapters) ? raw.chapters.filter((x): x is string => typeof x === "string" && x.length > 0) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.filter((x): x is string => typeof x === "string" && x.length > 0) : []
  };
  // Em declarativo o gate NUNCA corre: sem declaração a selecção responde needs_input a nomear
  // o vocabulário (o contrato), e uma declaração inerte (stack fora do vocabulário) é declarada
  // com os valores válidos — nunca um needs_clarification sobre o task, que não é motor aqui.
  void structuralEarly;
  const taskIsRecordedContext = selectionModeEarly === "declarative";

  const preGate = taskIsRecordedContext ? null : gateBeforeActivation(input);
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

  // 0.20.0-beta.21 — «declarativo primeiro»: por defeito o prepare responde ao
  // DECLARADO. Sem nenhuma declaração não adivinha a partir do `task`: devolve
  // needs_input com o vocabulário e a receita (o gateway semântico e o
  // classificador de intenção vivem no bloco lexical, que aqui não corre).
  const selectionMode = raw.selection_mode === "discover" ? "discover" : "declarative";
  const declaredTechnologies = normalizeDeclaredTechnologies(
    Array.isArray(raw.technologies) ? raw.technologies.filter((t): t is string => typeof t === "string") : [],
    input.stack
  );
  const declarativeSelection = selectionMode !== "discover";
  // 0.21 §6 — forma B no prepare: chapters/categories declarados passam ao motor tal e qual,
  // e CONTAM como declaração (o lote de decomposição é uma chamada só com `categories`).
  const structural = {
    chapters: Array.isArray(raw.chapters) ? raw.chapters.filter((x): x is string => typeof x === "string" && x.length > 0) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.filter((x): x is string => typeof x === "string" && x.length > 0) : []
  };
  const hasDeclaredActivator =
    input.concerns.length > 0 ||
    input.exposure !== undefined ||
    input.data_sensitivity !== undefined ||
    input.changed_files.length > 0 ||
    declaredTechnologies.length > 0 ||
    structural.chapters.length > 0 ||
    structural.categories.length > 0;
  // P1-A (0.20.0-beta.22): a decisão de needs_input é UMA e vive no motor — indexada
  // à activação produzida, não à presença de campos. O prepare reage ao veredicto
  // (abaixo, depois de correr a selecção), em vez de ter a sua própria regra.
  const activation = activate(input, { declaredOnly: declarativeSelection });

  // (c) The scope gate measures the request's FOCUS, not its full semantic
  // expansion: explicit concerns when given, else the concerns activated by
  // deterministic sources (explicit input + direct lexicon task terms). Semantic
  // intent-keyword/alias expansions still enrich the output context and trace —
  // they just don't inflate the requirement count and trip decomposition. Falls
  // back to the full activation when no deterministic concern was resolved.
  const deterministicConcerns = [
    ...new Set(
      activation.trace
        .filter((entry) => entry.confidence === "deterministic" && CONCERN_LEXICON.has(entry.produced))
        .map((entry) => entry.produced as Concern)
    )
  ];
  const focusConcerns =
    input.concerns.length > 0
      ? input.concerns
      : deterministicConcerns.length > 0
        ? deterministicConcerns
        : activation.concerns;

  void focusConcerns; // kept for the debug notes below; the gate no longer counts requirements
  // MP1 selection (G-mp1a O2): the engine composes baseline ∪ context and narrows
  // by the task's declared signals — this is the requirement set served.
  const selection: SelectionResult = runSelectionWithActivation(
    input,
    activation,
    selectionMode === "discover" ? (raw.technologies ?? []) : declaredTechnologies,
    selectionMode,
    structural
  );
  // 0.21.2 (decisão 0005): `slice_families` — só contexto. Validado contra o conjunto publicado.
  const declaredSliceFamilies = Array.isArray(raw.slice_families)
    ? [...new Set(raw.slice_families.filter((x): x is string => typeof x === "string" && x.length > 0))]
    : [];
  const knownSliceFamilies = new Set(publishedSliceFamilies());
  const unknownSliceFamilies = declaredSliceFamilies.filter((f) => !knownSliceFamilies.has(f)).sort();
  const sliceFamiliesInert: string[] = [
    ...(declaredSliceFamilies.length > 0 && selection.needs_input
      ? [`slice_families=[${declaredSliceFamilies.join(", ")}] (só de contexto: activa fatias, nunca selecciona requisitos — não é declaração)`]
      : []),
    ...(unknownSliceFamilies.length > 0
      ? [`slice_families=[${unknownSliceFamilies.join(", ")}] (fora do conjunto publicado em sbd://toe/activation-vocabulary → slice_families)`]
      : [])
  ];
  if (!selection.needs_input && unknownSliceFamilies.length > 0) {
    const ni = buildNeedsInput(
      input,
      {
        concerns: [...input.concerns],
        ...(input.exposure ? { exposure: input.exposure } : {}),
        ...(input.data_sensitivity ? { data_sensitivity: input.data_sensitivity } : {}),
        technologies: [...declaredTechnologies],
        changed_files: [...input.changed_files]
      },
      sliceFamiliesInert
    );
    const b = blocked(
      input,
      raw,
      "needs_input",
      [ni.reason, "`slice_families` só aceita as famílias publicadas — o valor não se engole nem se adivinha."],
      [`Lê as famílias publicadas: read_sbd_toe_resource(uri="sbd://toe/activation-vocabulary") → slice_families.`, `Re-chama sem os valores desconhecidos (${unknownSliceFamilies.join(", ")}).`],
      activation.trace
    );
    b.needs_input = { ...ni, valid_values: { slice_families: [...knownSliceFamilies].sort() } };
    return b;
  }
  if (!selection.needs_input && declaredSliceFamilies.length > 0) {
    const present = new Set(activation.sliceFamilies);
    for (const family of [...declaredSliceFamilies].sort()) {
      if (present.has(family)) continue;
      activation.sliceFamilies.push(family);
      activation.trace.push({
        source: "declared_slice_family",
        produced: family,
        trigger: family,
        score: 1,
        confidence: "deterministic",
        reason: "Declared in `slice_families`: context only (AppSec Core entities + manual_grounding of this family's slices); never selects requirements."
      });
    }
  }
  if (selection.needs_input) {
    const ni = sliceFamiliesInert.length > 0
      ? { ...selection.needs_input, inert_declarations: [...(selection.needs_input.inert_declarations ?? []), ...sliceFamiliesInert] }
      : selection.needs_input;
    const inert = (ni.inert_declarations ?? []).join(" ");
    const vocab = buildActivationVocabulary();
    const validValues: Record<string, string[]> = {
      ...(/\bstack=|\btechnologies=/.test(inert) ? { technologies: vocab.technologies.values.map((t) => String(t.value)) } : {}),
      ...(/\bexposure=/.test(inert) ? { exposure: vocab.exposure.values.map((e) => String(e.value)) } : {}),
      ...(/\bdata_sensitivity=/.test(inert) ? { data_sensitivity: vocab.data_sensitivity.values.map((d) => String(d.value)) } : {}),
      ...(unknownSliceFamilies.length > 0 ? { slice_families: [...knownSliceFamilies].sort() } : {})
    };
    const blockedNeedsInput = blocked(
      input,
      raw,
      "needs_input",
      [
        ni.reason,
        "Contrato v1.18-beta: o servidor responde ao declarado e NÃO interpreta o `task` — que fica registado para auditoria."
      ],
      [
        `Lê o vocabulário fechado: read_sbd_toe_resource(uri="${ni.vocabulary_resource}").`,
        `Re-chama declarando, por exemplo: ${ni.example.with}.`,
        ...(ni.candidates_to_confirm.from_task_text.length > 0
          ? [`SUGESTÃO A CONFIRMAR (não é selecção), derivada do texto: [${ni.candidates_to_confirm.from_task_text.join(", ")}] — confirma e declara.`]
          : []),
        ...(ni.inert_declarations?.length ? [`Declarações inertes nesta chamada: ${ni.inert_declarations.join("; ")}.`] : []),
        `Queres o comportamento inferencial antigo? selection_mode="discover" (exploratório).`
      ],
      activation.trace
    );
    blockedNeedsInput.needs_input = { ...ni, ...(Object.keys(validValues).length > 0 ? { valid_values: validValues } : {}) };
    return blockedNeedsInput;
  }
  const estimatedRequirements = selection.selected.length;

  // 0.21.2 (decisão 0004): o tecto deixou de ser por contagem. A decisão por CUSTO vive no
  // handler, depois de o payload ser moldado e medido — aqui só se expõe o contexto da selecção.
  if (out) out.ctx = { input, activation, selection, declaredTechnologies };

  const postGate = gateAfterActivation({
    input,
    activation,
    estimatedRequirements,
    // Só é "declarado" quando o chamador declarou mesmo: no caminho declarativo a
    // ausência de declarações já devolveu needs_input antes de chegar aqui, logo
    // este ponto implica declaração real. Em discover o gate mantém-se inteiro.
    declaredSurfaces: declarativeSelection && hasDeclaredActivator
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
          "Deployment incompleto (runtime v1 ausente) — reporta ao operador do MCP (reinstalar/actualizar o pacote publicado); em alternativa usa record types runtime v0 noutras tools."
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
  const ontologyForSelection = getOntologyData();
  const selectedIds = new Set(selection.selected.map((r) => r.requirement_id));
  const v0 = resolveRuntimeV0({
    riskLevel: input.risk_level,
    concerns: activation.concerns,
    selectedRequirements: ontologyForSelection.requirements.filter((r) => selectedIds.has(r.requirement_id))
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
  // ----- 0.21 §1: the fused requirement ---------------------------------
  // One object per requirement: the published description NEVER leaves, and the
  // requirement's own evidence pattern (1:1 in the bundle) is inlined as
  // verify/evidence. No cap, no join left to the model. Patterns that touched
  // the scope only through an activated CONTROL (their requirement is outside
  // the activated set) are NOT inlined — they belong to other requirements —
  // and are counted + referenced below (never silent).
  const activeRequirementIds = new Set(v0.requirements.map((r) => r.requirement_id));
  const patternByRequirement = new Map<string, EvidencePattern>();
  for (const pattern of ontologyForSelection.evidencePatterns ?? []) {
    if (pattern.maps_to_requirement_id && !patternByRequirement.has(pattern.maps_to_requirement_id)) {
      patternByRequirement.set(pattern.maps_to_requirement_id, pattern);
    }
  }
  let withVerifyAndEvidence = 0;
  let partialPatterns = 0;
  let withoutPattern = 0;
  const fusedRequirements: FusedRequirement[] = v0.requirements.map((requirement) => {
    const pattern = patternByRequirement.get(requirement.requirement_id);
    const verify = pattern?.verification_logic;
    const evidence = pattern?.evidence_expectation;
    if (!pattern) withoutPattern += 1;
    else if (verify && evidence) withVerifyAndEvidence += 1;
    else partialPatterns += 1;
    return {
      id: requirement.requirement_id,
      name: requirement.name,
      ...(requirement.type ? { type: requirement.type } : {}),
      ...(categoryIsDerivable(requirement.requirement_id, requirement.category) ? {} : { category: requirement.category }),
      ...(requirement.description ? { description: requirement.description } : {}),
      ...(verify ? { verify } : {}),
      ...(evidence ? { evidence } : {}),
      source: "runtime_v0" as const
    };
  });
  const relatedByControlOutsideScope = v0.evidencePatterns.filter(
    (pattern) => !(pattern.maps_to_requirement_id && activeRequirementIds.has(pattern.maps_to_requirement_id))
  ).length;
  const verificationCalls = Math.ceil(v0.requirements.length / 50);
  const riskForRef = input.risk_level ? `"${input.risk_level}"` : "<declara o risk_level>";
  const verification: VerificationSummary = {
    requirements: v0.requirements.length,
    with_verify_and_evidence: withVerifyAndEvidence,
    partial: partialPatterns,
    without_pattern: withoutPattern,
    by_ref: {
      tool: "get_sbd_toe_verification_matrix",
      with: `risk_level=${riskForRef}, requirement_ids=[activated_scope.requirements[].id] (≤50 por chamada)`,
      calls: verificationCalls,
      fields: ["evidence_pattern_id", "control_id", "expected_artifact_type_ids"],
      note_id: "prepare.verification.by_ref"
    },
    related_by_control_outside_scope: {
      count: relatedByControlOutsideScope,
      ref: {
        tool: "resolve_entities",
        with: 'record_type="evidence_pattern", filters={"maps_to_control_id":{"in":[activated_scope.controls[].control_id]}}',
        note_id: "prepare.verification.related_by_control_outside_scope"
      }
    }
  };

  const g2Context: G2Context = {
    control_objectives: activatedCOs.map((entity) => projectV1Entity(entity, g2Data)),
    mechanisms: activatedMechanisms.map((entity) => projectV1Entity(entity, g2Data)),
    practices: activatedPractices.map((entity) => projectV1Entity(entity, g2Data)),
    artifacts: activatedArtifacts.map((entity) => projectV1Entity(entity, g2Data)),
    relations: activatedRelations.map(projectRelation)
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
    requirements: fusedRequirements,
    // 0.21 §1: a description publicada dos controlos DIRECTOS vai em todos os
    // níveis, o full incluído («não promete caber, promete não faltar»).
    controls: v0.controls.map((control) => ({
      control_id: control.control_id,
      name: control.name,
      domain: control.domain,
      control_type: control.control_type,
      source: "runtime_v0" as const,
      confidence: control.confidence,
      ...(control.confidence === "direct" && control.description ? { description: control.description } : {})
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
    selection: {
      eligible: selection.eligible_count,
      selected: selection.selected.length,
      narrowed_out_categories: selection.narrowed_out.length,
      narrowed_out_requirements: selection.narrowed_out.reduce((n, g) => n + g.count, 0),
      excluded_by_level_categories: selection.excluded_by_level.length,
      excluded_by_level_requirements: selection.excluded_by_level.reduce((n, g) => n + g.count, 0),
      lexical_share: selection.basis_summary.lexical_share,
      narrowed_out_ref: {
        tool: "select_sbd_toe_requirements",
        note_id: "prepare.selection.narrowed_out_ref"
      }
    },
    v1_consistency_mismatches: g2Data.consistency.mismatches,
    v1_manifest_warnings: g2Data.consistency.warnings,
    verification
  };

  // ----- Build LLM instructions + rationale template -------------------
  const citedIds = Object.keys(citationMap);
  const llm_codegen_instructions = buildLlmInstructions({
    mode: input.mode,
    citedIds,
    hasOverlay: overlayResolution.activatedObligations.length > 0,
    riskLevel: input.risk_level
  });

  const security_rationale_template = buildSecurityRationaleTemplate(
    input.taskTrimmed
  );

  // ----- 0.21 §2: adjacência declarada -----------------------------------
  // Relativa à DECLARAÇÃO tal como o chamador a fez (aritmética sobre o vocabulário, nunca
  // leitura da tarefa); o módulo aplica risk_level L2 quando omitido.
  const adjacencyBase = {
    risk_level: input.risk_level ?? "L2",
    ...(input.concerns.length > 0 ? { concerns: [...input.concerns] } : {}),
    ...(input.exposure !== undefined ? { exposure: input.exposure } : {}),
    ...(input.data_sensitivity !== undefined ? { data_sensitivity: input.data_sensitivity } : {}),
    ...(declaredTechnologies.length > 0 ? { technologies: [...declaredTechnologies] } : {}),
    ...(input.changed_files.length > 0 ? { changed_files: [...input.changed_files] } : {})
  };
  const adjacencySummary = buildDeclaredAdjacency(adjacencyBase);
  const adjacency: PrepareAdjacency = {
    undeclared_that_would_change_the_set: adjacencySummary.undeclared_that_would_change_the_set,
    scanned: adjacencySummary.scanned,
    would_change_the_set: adjacencySummary.would_change_the_set,
    shown: adjacencySummary.shown,
    detail: declaredAdjacencyDetail(adjacencyBase)
  };

  // ----- 0.21.1: overlay restrito ao âmbito activado ---------------------
  const scopedOverlay = scopeOverlayMappings(overlayResolution.context, {
    requirementIds: new Set(v0.requirements.map((r) => r.requirement_id)),
    controlIds: new Set(v0.controls.map((c) => c.control_id)),
    evidencePatternToRequirement: new Map(
      v0.requirements
        .map((r) => [patternByRequirement.get(r.requirement_id)?.id, r.requirement_id] as const)
        .filter((pair): pair is readonly [string, string] => typeof pair[0] === "string")
    ),
    bundleIds: new Set(v0.requirements.map((r) => r.source_bundle).filter((b): b is string => typeof b === "string")),
    obligationIds: overlayResolution.activatedObligations.map((o) => o.obligation_id)
  });

  const result: PrepareCodegenContextResultReady = {
    status: "ready_for_codegen",
    notes: NOTES_HEADER,
    mode: input.mode,
    input_echo: inputEcho(raw),
    activation_trace: activation.trace,
    activated_scope: activatedScope,
    adjacency,
    g2_context: g2Context,
    manual_grounding: manualGrounding,
    regulatory_overlay: scopedOverlay,
    citation_map: citationMap,
    completeness_report: completeness,
    llm_codegen_instructions,
    security_rationale_template,
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      runtime_v0: PROVENANCE_V0,
      runtime_v1: PROVENANCE_V1,
      overlay:
        overlayResolution.status === "skipped"
          ? "absent"
          : PROVENANCE_OVERLAY
    }
  };
  if (input.debug) {
    result.debug = {
      rejected_candidates: activation.rejected,
      notes: [
        ...activation.notes,
        `concerns: ${activation.concerns.join(", ") || "(none)"}`,
        `slice_families: ${activation.sliceFamilies.join(", ") || "(none)"}`,
        `overlay_status: ${overlayResolution.status}`,
        `estimated_v0_requirements: ${estimatedRequirements}`,
        `verification: requirements=${verification.requirements} with_verify_and_evidence=${verification.with_verify_and_evidence} partial=${verification.partial} without_pattern=${verification.without_pattern} related_by_control_outside_scope=${verification.related_by_control_outside_scope.count}`
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

/**
 * 0.21.2 (decisão 0005) — o conjunto PUBLICADO de famílias de fatia: derivado das fatias do runtime
 * AppSec Core servido (objective_family), nunca escrito à mão. Vazio quando o runtime falta.
 */
export function publishedSliceFamilies(): string[] {
  try {
    return [...new Set(getG2Runtime().slices.map((slice) => slice.objective_family))].sort();
  } catch {
    return [];
  }
}

/** As concerns que produzem uma família de fatia (o mesmo mapa que o motor usa). */
export function sliceFamilyProducers(family: string): Concern[] {
  return VALID_CONCERNS.filter((concern) => CONCERN_TO_SLICE_FAMILY[concern] === family);
}

// Re-export the lexicon so tests / docs can reference the canonical list.
export const __wp5Lexicon = {
  VALID_CONCERNS,
  CONCERN_TO_SLICE_FAMILY
};
