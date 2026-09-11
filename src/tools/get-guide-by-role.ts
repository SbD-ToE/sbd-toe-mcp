/**
 * get_guide_by_role
 *
 * Deterministic GUIDE-mode resolution for a given risk level, optionally
 * filtered by role and/or lifecycle phase.
 *
 * Resolution order:
 *   1. Resolve consult-mode controls for the context
 *   2. Collect practices from control.source_practice_ids
 *   3. Join practice_assignments and lifecycle_user_stories by practice_id
 *   4. Normalize role and phase using canonical runtime entities
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";
import type { Practice, PracticeAssignment, UserStory } from "./ontology-loader.js";
import { roleScopeOf, getOntologyData, resolvePhaseId, resolveRoleId } from "./ontology-loader.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { guideByRoleAffordances } from "../serving/affordances.js";
import { absenceBand, absenceNaming } from "../serving/declared-absences.js";
import { referencedRoleFor, manifestGapBand, assertionFor } from "../serving/traversal-assertions.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
}

/**
 * Consumer-side role aliases (serving brief #6): natural names an agent reaches for,
 * mapped to the canonical role_id ONLY where there is a single, unambiguous content
 * home. This is a serving-layer convenience and is intentionally NOT merged into the
 * KG role.aliases (that data is the producer's). Names whose content home is ambiguous
 * or sparse in the substrate are deliberately left out and routed to Codex as
 * data-quality items rather than papered over here:
 *   - devsecops  — cross-cutting (developer + appsec-engineer + devops-sre); not one role
 *     (re-examined 2026-09-11 §1: the KG also refused the alias — audience column spreads
 *     DevSecOps across six chapters; the refusal is now declared on both sides)
 *   - architect  — substrate split (software_architect→developer vs empty arquitetos-software)
 *   - product-manager — product_owner appears under both `qa` and `product-owner`
 *   - training-manager / pentester / security — no canonical content home
 */
const CONSUMER_ROLE_ALIASES: Record<string, string> = {
  "security-engineer": "appsec-engineer",
  "application-security-engineer": "appsec-engineer",
  "sec-engineer": "appsec-engineer",
  "appsec-eng": "appsec-engineer",
  // 2026-09-11 defect wave §1/adenda: SecOps-family → operacoes. Grounds: the Manual's own
  // audience column («Operations, SOC, DevSecOps» on the OPS row) and the Orchestrator-verified
  // adenda (operacoes carries the SOC operation stories; the platform half is devops-sre and is
  // POINTED AT via the split band below). The KG publishes the same aliases from v1.26 §1.33B —
  // this map covers the currently pinned bundle until the next re-pin.
  "secops": "operacoes",
  "soc": "operacoes",
  "security-operations": "operacoes",
  "security_operations": "operacoes",
};

/** Requested tokens that mean the SecOps/SOC view — used to surface the declared split. */
const SECOPS_FAMILY_TOKENS = new Set(["secops", "soc", "security-operations", "security_operations"]);

/**
 * 2026-09-11 adenda §2 — a vista SecOps/SOC está REPARTIDA por dois papéis canónicos.
 * Fonte: adenda do despacho de defeitos (verificada pelo Orchestrator na fonte); o KG publica
 * a mesma repartição como `roles.json[].scope_split` a partir do contrato v1.26 §1.33C — quando
 * o bundle a trouxer, o band abaixo passa a citar os dados; até lá cita esta declaração.
 */
const SECOPS_SPLIT_FALLBACK = {
  perspective: "secops/soc",
  covers: {
    operacoes:
      "operação do SOC: alertas com SLA, playbooks de IR, correlação de eventos, tuning, " +
      "cobertura ATT&CK com EPSS/KEV, exercícios de IR, monitorização de fornecedores, telemetria de agentes AI",
    "devops-sre":
      "plataforma de detecção: integridade de logs WORM 90 dias, integração SIEM, detecção de falha de ingestão",
  } as Record<string, string>,
};

/** Levenshtein distance — did_you_mean for unknown roles (despacho 2026-09-11 §1). */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n]!;
}

/** Closest published role_ids/aliases to an unknown input (≤3, distance-bounded). */
function didYouMeanRoles(requested: string, roles: { role_id: string; aliases: string[] }[]): string[] {
  const candidates = new Map<string, string>(); // candidate token -> role_id it resolves to
  for (const role of roles) {
    candidates.set(role.role_id, role.role_id);
    for (const alias of role.aliases) candidates.set(alias, role.role_id);
  }
  for (const [alias, roleId] of Object.entries(CONSUMER_ROLE_ALIASES)) candidates.set(alias, roleId);
  const scored = [...candidates.entries()]
    .map(([token, roleId]) => ({ token, roleId, d: editDistance(requested, token.toLowerCase()) }))
    .filter((c) => c.d <= Math.max(2, Math.floor(requested.length / 3)))
    .sort((a, b) => a.d - b.d || a.token.localeCompare(b.token));
  const out: string[] = [];
  for (const c of scored) {
    const suggestion = c.token === c.roleId ? c.roleId : `${c.token} → ${c.roleId}`;
    if (!out.includes(suggestion)) out.push(suggestion);
    if (out.length >= 3) break;
  }
  return out;
}

function applyConsumerAlias(roleArg: string): string {
  return CONSUMER_ROLE_ALIASES[normalizeToken(roleArg)] ?? roleArg;
}

/**
 * Whether an assignment applies at its (level-tagged) risk level, read from the
 * level-specific `proportionality` string. The substrate replicates every
 * assignment across L1/L2/L3; the proportionality is what sharpens the ladder —
 * obligations like "Não", "Não aplicável", "Não obrigatório", "N/A" mean the US
 * does not apply at that level. Absent proportionality → applicable (don't drop).
 */
const NON_APPLICABLE_OBLIGATION = /^\s*(não\s+aplicável|não\s+obrigatório|não|n\/a)\b/i;
function isApplicableAtLevel(proportionality: string | undefined): boolean {
  if (!proportionality) return true;
  return !NON_APPLICABLE_OBLIGATION.test(proportionality);
}

export interface AssignmentWithStory extends PracticeAssignment {
  practice?: Practice;
  user_story?: UserStory;
  canonical_role: string;
  canonical_phase: string;
}

export interface AssignmentSlim {
  id: string;
  chapter_id: string;
  practice_id: string;
  practice_label?: string;
  role: string;
  canonical_role: string;
  phase: string;
  canonical_phase: string;
  action: string;
  /**
   * 0.20.0-beta.35 — a PROPORCIONALIDADE existe no bundle e não era servida.
   *
   * É prosa autorada que nomeia quem valida/aprova ao nível («…com validação formal por
   * AppSec Engineer»), e é o que o Manual tem de mais próximo de «quem decide o quê». Vem
   * servida COMO ESTÁ: o Manual não publica uma taxonomia decide-vs-delega, e inventar uma
   * seria o oposto de tudo o que esta linha construiu.
   */
  proportionality?: string;
  artifacts: string[];
  user_story?: {
    us_id?: string;
    title: string;
    goal?: string;
    acceptance_criteria?: string;
    // Present only in detail mode (include_detail=true) — the US DoD + join.
    checklist_items?: string[];
    bdd?: string[];
    proportionality?: UserStory["proportionality"];
    /** Level-specific obligation for the requested risk level (from the assignment). */
    proportionality_level?: string;
    sdlc_integration?: UserStory["sdlc_integration"];
  };
  /**
   * 2026-09-11 §6 — a MESMA história em várias atribuições da resposta é embebida UMA vez;
   * as repetições trazem esta referência (a US-13 saía 3× verbatim, ≈1,8k tokens).
   */
  user_story_ref?: { us_id?: string; id?: string; title: string; embedded_at_assignment_id: string; note: string };
}

/** Aggregated DoD view of a role's user stories — the "what must role X fulfil" answer. */
export interface RoleChecklistEntry {
  id?: string;
  us_id?: string;
  title: string;
  chapter_id?: string;
  checklist_items: string[];
  proportionality?: UserStory["proportionality"];
  /** Level-specific obligation for the requested risk level (from the assignment). */
  proportionality_level?: string;
}

export interface GetGuideByRoleResult {
  phase_warning?: { requested: string; resolved: null; note: string; knownPhases: string[] };
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentWithStory[];
  by_role: Record<string, AssignmentWithStory[]>;
  by_phase: Record<string, AssignmentWithStory[]>;
  /** 0.20.0-beta.31: papel canónico sem mapeamento nesta superfície. */
  unsupported_role?: { value: string; supported_values: string[]; note: string; absence?: unknown };
  /** 2026-09-11 §1: papel INEXISTENTE — erro declarado com did_you_mean, nunca canonicidade fabricada. */
  unknown_role?: { requested: string; resolved: null; did_you_mean: string[]; supported_values: string[]; note: string };
  /** 2026-09-11 adenda §2: repartição declarada (secops/soc) com ponteiro para o outro papel. */
  role_scope_split?: {
    perspective: string; role_id: string; covers: string;
    counterpart_role_ids: string[]; counterpart_covers?: Record<string, string>;
    source: string; note: string;
  };
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    /** 0.20.0-beta.31: histórias DISTINTAS — `assignmentCount` conta atribuições, não histórias. */
    distinctUserStoryCount?: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
}

export interface McpProvenance {
  /** 0.20.0-beta.23: versão do SERVIDOR que produziu esta resposta (≠ `kg`, o conhecimento servido). */
  server: string;
  /** Compact version stamp: kg release_tag of the served pin (0.13.0). */
  kg: string;
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface GetGuideByRoleOutput {
  phase_warning?: { requested: string; resolved: null; note: string; knownPhases: string[] };
  provenance: McpProvenance;
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentSlim[];
  /** Aggregated DoD checklist of the role's user stories — present only with include_detail + a role filter. */
  role_checklist?: RoleChecklistEntry[];
  /** 0.20.0-beta.31: papel canónico que esta superfície não mapeia — declarado, nunca vazio mudo. */
  unsupported_role?: { value: string; supported_values: string[]; note: string; absence?: unknown };
  /** 2026-09-11 §1: papel INEXISTENTE — erro declarado com did_you_mean, nunca canonicidade fabricada. */
  unknown_role?: GetGuideByRoleResult["unknown_role"];
  /** 2026-09-11 adenda §2: repartição declarada (secops/soc) com ponteiro para o outro papel. */
  role_scope_split?: GetGuideByRoleResult["role_scope_split"];
  role_summary: Record<string, number>;
  phase_summary: Record<string, number>;
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    /** 0.20.0-beta.31: histórias DISTINTAS — `assignmentCount` conta atribuições, não histórias. */
    distinctUserStoryCount?: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next: Affordance[];
}

export function _resolveGuideByRole(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): GetGuideByRoleResult {
  const {
    roles,
    phases = [],
    practices = [],
    assignments: allAssignments,
    userStories: allStories,
  } = ontologyData;

  const riskLevelArg = args["risk_level"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw Object.assign(
      new Error(`Invalid risk_level: "${String(riskLevelArg)}". Allowed values: L1, L2, L3.`),
      { rpcError: { code: -32602, message: `Invalid risk_level: "${String(riskLevelArg)}"` } }
    );
  }
  const riskLevel: RiskLevel = riskLevelArg;

  const consult = _resolveConsultResult(args, ontologyData);

  const roleArg = typeof args["role"] === "string" ? args["role"].trim() : null;
  /**
   * 2026-09-11 despacho §1 (BLOQUEANTE) — o `?? normalizeToken(roleArg)` promovia o input
   * cru a `canonicalRole`, e a banda beta.31 afirmava «CANÓNICO e publicado» para papéis
   * INEXISTENTES (a cura do silêncio virou fonte de invenção). Agora: papel que não resolve
   * fica NULL, filtra para zero, e sai como `unknown_role` com did_you_mean — nunca como
   * canonicidade fabricada. Papel canónico sem atribuições mantém a banda beta.31.
   */
  const canonicalRole = roleArg ? resolveRoleId(applyConsumerAlias(roleArg), roles) ?? null : null;
  const requestedRoleToken = roleArg ? normalizeToken(roleArg) : null;
  const unknownRole =
    roleArg && canonicalRole === null
      ? {
          requested: roleArg,
          resolved: null,
          did_you_mean: didYouMeanRoles(requestedRoleToken ?? "", roles),
          supported_values: roles.filter((r) => r.canonical).map((r) => r.role_id).sort(),
          note:
            `O papel \`${roleArg}\` NÃO existe no vocabulário publicado — nem como id canónico nem como ` +
            "alias. Nada é afirmado sobre ele (nenhuma atribuição, nenhuma razão para o zero além desta): " +
            "escolhe um dos `supported_values` ou um `did_you_mean`." +
            (requestedRoleToken === "devsecops"
              ? " Nota declarada: `devsecops` foi CONSIDERADO e recusado como alias — é transversal " +
                "(developer + appsec-engineer + devops-sre), não um papel; consulta esses três."
              : ""),
        }
      : undefined;

  const phaseArg = typeof args["phase"] === "string" ? args["phase"].trim() : null;
  // 0.15.0 (P0-5): alias implement→develop; fase desconhecida ⇒ aviso DECLARADO.
  const PHASE_ALIASES: Record<string, string> = { implement: "develop", implementation: "develop", implementacao: "develop" };
  // canon-first: se o vocabulário canónico já tiver a fase, o alias NÃO se aplica.
  const resolvedDirect = phaseArg ? resolvePhaseId(phaseArg, phases) : null;
  const aliasCandidate = phaseArg ? PHASE_ALIASES[phaseArg.toLowerCase()] : undefined;
  const resolvedPhase = resolvedDirect ?? (aliasCandidate ? resolvePhaseId(aliasCandidate, phases) : null);
  const canonicalPhase = phaseArg ? resolvedPhase ?? normalizeToken(phaseArg) : null;
  const phaseWarning =
    phaseArg && resolvedPhase === null
      ? {
          requested: phaseArg,
          resolved: null,
          note: "Fase desconhecida — o filtro devolve 0 assignments; usa uma das knownPhases (alias: implement→develop).",
          knownPhases: phases.map((p) => p.phase_id).filter((x): x is string => typeof x === "string"),
        }
      : null;

  const activePracticeIds = new Set(
    consult.controls.flatMap((control) => control.source_practice_ids ?? [])
  );
  const practiceById = new Map(practices.map((practice) => [practice.id, practice]));

  // Filter by level (substrate replicates assignments across L1/L2/L3) AND drop
  // the ones the level-specific proportionality marks non-applicable — this is the
  // ladder sharpening: L1 omits what only applies higher up (serving fix, brief #3a).
  let scopedAssignments = allAssignments.filter(
    (assignment) => assignment.risk_level === riskLevel && isApplicableAtLevel(assignment.proportionality)
  );
  if (activePracticeIds.size > 0) {
    scopedAssignments = scopedAssignments.filter((assignment) =>
      activePracticeIds.has(assignment.practice_id)
    );
  }

  const storyByPractice = new Map<string, UserStory>();
  const storyById = new Map<string, UserStory>();
  for (const story of allStories) {
    if (story.practice_id) storyByPractice.set(story.practice_id, story);
    if (story.id) storyById.set(story.id, story);
  }

  const enrichedAssignments: AssignmentWithStory[] = scopedAssignments.map((assignment) => {
    const practice = practiceById.get(assignment.practice_id);
    const story =
      storyByPractice.get(assignment.practice_id) ??
      (assignment.user_story_id ? storyById.get(assignment.user_story_id) : undefined);

    return {
      ...assignment,
      ...(practice ? { practice } : {}),
      ...(story ? { user_story: story } : {}),
      canonical_role: resolveRoleId(assignment.role, roles) ?? normalizeToken(assignment.role),
      canonical_phase:
        resolvePhaseId(assignment.phase, phases) ?? normalizeToken(assignment.phase),
    };
  });

  let filteredAssignments = enrichedAssignments;
  if (canonicalRole) {
    filteredAssignments = filteredAssignments.filter(
      (assignment) => assignment.canonical_role === canonicalRole
    );
  } else if (roleArg) {
    // papel não resolvido: zero por definição (declarado em unknown_role), nunca um join no cru
    filteredAssignments = [];
  }
  if (canonicalPhase) {
    filteredAssignments = filteredAssignments.filter(
      (assignment) => assignment.canonical_phase === canonicalPhase
    );
  }

  const by_role: Record<string, AssignmentWithStory[]> = {};
  const by_phase: Record<string, AssignmentWithStory[]> = {};
  for (const assignment of filteredAssignments) {
    (by_role[assignment.canonical_role] ??= []).push(assignment);
    (by_phase[assignment.canonical_phase] ??= []).push(assignment);
  }

  /**
   * 0.20.0-beta.31 — `knownRoles` é o que ESTA superfície resolve, e tem de o dizer.
   *
   * Vinha das atribuições presentes: para `role="fornecedores-terceiros"` (canónico,
   * publicado no guia e no vocabulário) a resposta trazia `assignments: []` e um
   * `knownRoles` de 13 entradas que **omitia o próprio papel que ela resolveu como
   * canónico** — a resposta continha a prova de que o papel não existia ali e nunca fazia a
   * ligação. Agora o conjunto é o do VOCABULÁRIO publicado, e o que esta superfície não tem
   * é DECLARADO em `unsupported_role`, com os que ela cobre de facto.
   */
  const rolesWithAssignments = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_role))].sort();
  const publishedRoles = buildActivationVocabulary().roles.values.map((r) => String(r.value)).sort();
  const knownRoles = [...new Set([...publishedRoles, ...rolesWithAssignments])].sort();
  const knownPhases = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_phase))].sort();
  const userStoryCount = filteredAssignments.filter((assignment) => assignment.user_story !== undefined).length;
  /**
   * 0.20.0-beta.31 — a mesma história pode estar em várias atribuições (uma por prática).
   * O avaliador leu «US-21 ×4» como duplicação; não é — são 4 atribuições distintas que
   * partilham uma história. Desduplicar perderia as atribuições; o que faltava era o
   * DENOMINADOR ao lado, para o número não poder ser mal lido.
   */
  const distinctUserStoryCount = new Set(
    filteredAssignments.map((assignment) => assignment.user_story?.id).filter((x): x is string => typeof x === "string")
  ).size;

  const roleScope = typeof canonicalRole === "string" ? roleScopeOf(canonicalRole, ontologyData.roles ?? []) : undefined;

  /**
   * 2026-09-11 adenda §2 — papel com trabalho REPARTIDO declara-o, com ponteiro para o outro
   * (never-silent aplicado a uma repartição). Data-first: usa `roles.json[].scope_split`
   * quando o bundle pinado o traz (KG v1.26 §1.33C); senão, para a família SecOps e para os
   * dois papéis da repartição, a declaração verificada da adenda.
   */
  const roleRecord = canonicalRole ? (ontologyData.roles ?? []).find((r) => r.role_id === canonicalRole) : undefined;
  const dataSplit = roleRecord?.scope_split;
  const viaSecopsFamily = requestedRoleToken !== null && SECOPS_FAMILY_TOKENS.has(requestedRoleToken);
  const fallbackApplies =
    canonicalRole !== null && Object.prototype.hasOwnProperty.call(SECOPS_SPLIT_FALLBACK.covers, canonicalRole) &&
    (viaSecopsFamily || canonicalRole === "operacoes" || canonicalRole === "devops-sre");
  const roleScopeSplit =
    canonicalRole && (dataSplit || fallbackApplies)
      ? {
          perspective: dataSplit?.perspective ?? SECOPS_SPLIT_FALLBACK.perspective,
          role_id: canonicalRole,
          covers: dataSplit?.covers ?? SECOPS_SPLIT_FALLBACK.covers[canonicalRole] ?? "",
          counterpart_role_ids:
            dataSplit?.counterpart_role_ids ??
            Object.keys(SECOPS_SPLIT_FALLBACK.covers).filter((r) => r !== canonicalRole),
          counterpart_covers:
            dataSplit?.counterpart_covers ??
            Object.fromEntries(Object.entries(SECOPS_SPLIT_FALLBACK.covers).filter(([r]) => r !== canonicalRole)),
          source: dataSplit ? "roles.json scope_split (bundle)" : "adenda 2026-09-11 verificada (data-backed no próximo re-pin)",
          note:
            "O trabalho desta vista está REPARTIDO por dois papéis canónicos — esta resposta cobre " +
            `\`${canonicalRole}\`; para a outra metade chama get_guide_by_role com o counterpart. ` +
            "Responder com um só papel, sem este aviso, seria silêncio sobre a repartição.",
        }
      : undefined;

  return {
    risk_level: riskLevel,
    roleFilter: roleArg,
    canonicalRole,
    ...(unknownRole ? { unknown_role: unknownRole } : {}),
    ...(roleScopeSplit ? { role_scope_split: roleScopeSplit } : {}),
    phaseFilter: phaseArg,
    canonicalPhase,
    ...(phaseWarning ? { phase_warning: phaseWarning } : {}),
    assignments: filteredAssignments,
    by_role,
    by_phase,
    ...(typeof canonicalRole === "string" && filteredAssignments.length === 0 && !rolesWithAssignments.includes(canonicalRole)
      ? {
          unsupported_role: {
            value: canonicalRole,
            supported_values: rolesWithAssignments,
            /**
             * 0.20.0-beta.40 — DE QUE ESPÉCIE é este vazio. Vem do índice central
             * `declared_absences` (ontologia v2.6), NUNCA inferido aqui: um consumidor
             * precisa de saber se está a olhar para uma DÍVIDA que alguém deve, ou para uma
             * FRONTEIRA que não fecha. São reacções opostas, e a superfície não tem
             * autoridade para decidir qual é.
             */
            absence: absenceBand(
              absenceNaming(canonicalRole)?.absence_id,
              `atribuições de prática para o papel \`${canonicalRole}\``
            ),
            /*
             * 0.20.0-beta.48 (v2.10) — ZERO-ESPERADO, não lacuna.
             *
             * Esta nota dizia «ausência de MAPEAMENTO nesta superfície», o que se lê como
             * lacuna que alguém há-de fechar. Para um papel `inter_instance` **é o estado
             * CORRECTO**: o fornecedor não é um actor dentro da instância — é onde OUTRA
             * instância começa. Perguntar que práticas executa é perguntar o que a instância
             * dele executa, e a resposta é «as mesmas, no seu próprio grafo». O que a NOSSA
             * instância modela é a INTERFACE. Foi por isto que o ABS-003 foi RETIRADO: a
             * premissa do registo era errada.
             */
            ...(roleScope !== undefined ? { role_scope: roleScope } : {}),
            note:
              roleScope === "inter_instance"
                ? `O papel \`${canonicalRole}\` é CANÓNICO e tem alcance **\`inter_instance\`**: não é um actor ` +
                  "dentro desta instância — é onde OUTRA começa. **Zero atribuições é o estado CORRECTO e " +
                  "esperado, não uma lacuna**: perguntar que práticas ele executa é perguntar o que a instância " +
                  "dele executa, e a resposta é «as mesmas, no seu próprio grafo». O que o Manual modela é a " +
                  "INTERFACE — cláusulas, validação, evidência entregue, acesso condicionado. Está em " +
                  "`select_sbd_toe_requirements(risk_level=…, chapters=[\"14-governanca-contratacao\"])`, " +
                  "com GOV-006 e GOV-007 como porta."
                : `O papel \`${canonicalRole}\` é CANÓNICO e publicado (vocabulário e guia), mas esta superfície não ` +
                  `tem atribuições de prática para ele: o bundle publica assignments para ${rolesWithAssignments.length} papéis. ` +
                  "NÃO é ausência de responsabilidades — é ausência de MAPEAMENTO nesta superfície. Não digas que o papel " +
                  "não tem nada a fazer, nem geres um subagente com base neste vazio: para o que o Manual exige nesta " +
                  "área usa `select_sbd_toe_requirements` (por concern ou por estrutura, ex.: " +
                  '`chapters=["14-governanca-contratacao"]`), e `get_sbd_toe_chapter_brief` para o capítulo.',
          },
        }
      : {}),
    meta: {
      assignmentCount: filteredAssignments.length,
      userStoryCount,
      distinctUserStoryCount,
      activePracticeCount: activePracticeIds.size,
      knownRoles,
      knownPhases,
      note:
        "Guide mode is grounded on consult-mode controls, then expanded via source_practice_ids, " +
        "practice_assignments and lifecycle_user_stories. Role and phase filters use canonical runtime entities. " +
        "`assignmentCount` conta ATRIBUIÇÕES (prática × papel × fase); `distinctUserStoryCount` conta as histórias " +
        "distintas — a mesma história aparece em várias atribuições e isso não é duplicação.",
    },
  };
}

function slimAssignment(assignment: AssignmentWithStory, includeDetail: boolean): AssignmentSlim {
  const slim: AssignmentSlim = {
    id: assignment.id,
    chapter_id: assignment.chapter_id,
    practice_id: assignment.practice_id,
    ...(assignment.practice?.label ? { practice_label: assignment.practice.label } : {}),
    role: assignment.role,
    canonical_role: assignment.canonical_role,
    ...(assignment.proportionality ? { proportionality: assignment.proportionality } : {}),
    phase: assignment.phase,
    canonical_phase: assignment.canonical_phase,
    action: assignment.action,
    artifacts: assignment.artifacts,
  };

  if (assignment.user_story) {
    const us = assignment.user_story;
    slim.user_story = {
      ...(us.us_id ? { us_id: us.us_id } : {}),
      title: us.title,
      ...(us.goal ? { goal: us.goal } : {}),
      ...(us.acceptance_criteria ? { acceptance_criteria: us.acceptance_criteria } : {}),
      // Level-specific obligation (always — it is the cheap, sharp ladder signal).
      ...(assignment.proportionality ? { proportionality_level: assignment.proportionality } : {}),
      // Detail mode: surface the DoD + join so the agent gets the full story in one pass.
      ...(includeDetail && us.checklist_items && us.checklist_items.length > 0
        ? { checklist_items: us.checklist_items }
        : {}),
      ...(includeDetail && us.bdd && us.bdd.length > 0 ? { bdd: us.bdd } : {}),
      ...(includeDetail && us.proportionality ? { proportionality: us.proportionality } : {}),
      ...(includeDetail && us.sdlc_integration ? { sdlc_integration: us.sdlc_integration } : {}),
    };
  }

  return slim;
}

/**
 * 2026-09-11 §6 — dedupe do conteúdo embebido: a primeira atribuição de cada história leva o
 * `user_story` completo; as seguintes levam `user_story_ref`. As atribuições continuam TODAS
 * presentes (desduplicar atribuições perderia o eixo fase — beta.31); só o texto deixa de se
 * repetir verbatim.
 */
export function dedupeEmbeddedStories(assignments: AssignmentSlim[]): AssignmentSlim[] {
  const firstById = new Map<string, string>(); // story key -> assignment id that embeds it
  return assignments.map((slim) => {
    const key = slim.user_story?.us_id ? `${slim.chapter_id}:${slim.user_story.us_id}` : undefined;
    if (!slim.user_story || !key) return slim;
    const embeddedAt = firstById.get(key);
    if (embeddedAt === undefined) {
      firstById.set(key, slim.id);
      return slim;
    }
    const { user_story, ...rest } = slim;
    return {
      ...rest,
      user_story_ref: {
        ...(user_story.us_id ? { us_id: user_story.us_id } : {}),
        title: user_story.title,
        embedded_at_assignment_id: embeddedAt,
        note: "história idêntica — conteúdo completo embebido na atribuição referida (dedupe §6, 2026-09-11)",
      },
    };
  });
}

export function handleGetGuideByRole(
  args: Record<string, unknown>
): GetGuideByRoleOutput {
  const full = _resolveGuideByRole(args, getOntologyData());
  /**
   * Reconta o mesmo corte com MENOS filtros, para isolar qual deles esvaziou o resultado.
   * Reutiliza o próprio resolvedor — não uma segunda implementação da junção, que poderia
   * divergir e fazer a banda mentir sobre o motivo.
   */
  const countAssignments = (q: { riskLevel: string; role?: string; phase?: string }): number =>
    _resolveGuideByRole(
      {
        risk_level: q.riskLevel,
        ...(q.role !== undefined ? { role: q.role } : {}),
        ...(q.phase !== undefined ? { phase: q.phase } : {})
      },
      getOntologyData()
    ).assignments.length;
  const hasFilter = full.roleFilter !== null || full.phaseFilter !== null;
  const includeDetail = args["include_detail"] === true;

  const role_summary: Record<string, number> = {};
  const phase_summary: Record<string, number> = {};

  for (const [role, items] of Object.entries(full.by_role)) {
    role_summary[role] = items.length;
  }
  for (const [phase, items] of Object.entries(full.by_phase)) {
    phase_summary[phase] = items.length;
  }

  // Role aggregation (consumer brief #2): the role's distinct user stories with their
  // DoD checklist — the "what must role X fulfil, in one request" answer. Only when a
  // role is filtered and detail is requested (it carries the heavy per-US content).
  let role_checklist: RoleChecklistEntry[] | undefined;
  if (includeDetail && full.roleFilter !== null) {
    const seen = new Set<string>();
    role_checklist = [];
    for (const assignment of full.assignments) {
      const us = assignment.user_story;
      const key = us?.id ?? us?.us_id;
      if (!us || !key || seen.has(key)) continue;
      seen.add(key);
      role_checklist.push({
        ...(us.id ? { id: us.id } : {}),
        ...(us.us_id ? { us_id: us.us_id } : {}),
        title: us.title,
        ...(us.chapter_id ? { chapter_id: us.chapter_id } : {}),
        checklist_items: us.checklist_items ?? [],
        ...(us.proportionality ? { proportionality: us.proportionality } : {}),
        ...(assignment.proportionality ? { proportionality_level: assignment.proportionality } : {}),
      });
    }
  }

  /**
   * 0.20.0-beta.41 — BANDA POR RESULTADO VAZIO, não por valor não suportado (C1).
   *
   * `role="gestao-executiva", phase="plan"` — papel suportado, fase canónica — devolvia
   * `assignments: []`, `role_summary: {}`, `phase_summary: {}` e **nem uma palavra**. A
   * `unsupported_role` só dispara quando o PAPEL não tem nada em lado nenhum; uma combinação
   * legítima sem resultados caía no vazio silencioso que a b.30 tinha fechado só para valores.
   *
   * A banda diz QUAL DOS FILTROS esvaziou o resultado — derivado, não adivinhado: reconta-se
   * o mesmo corte sem a fase e sem o papel. É a diferença entre «este papel não faz nada» e
   * «este papel não faz nada NESTA fase», que é a pergunta que o consumidor tem a seguir.
   */
  /*
   * 0.20.0-beta.43 (v2.7) — um papel REFERENCIADO no Manual mas fora do vocabulário canónico.
   * Servi-lo como 14.º seria inventar vocabulário; ignorá-lo seria dizer que não existe. Vem
   * como o que é, com as âncoras que o provam e a contagem canónica intacta.
   */
  const referencedRole =
    typeof full.roleFilter === "string" && full.roleFilter.length > 0 && full.assignments.length === 0
      ? referencedRoleFor(full.roleFilter)
      : undefined;
  /*
   * A contagem canónica vem do VOCABULÁRIO (`roles.json` = 13), não do `knownRoles` desta
   * superfície, que inclui a sentinela `unassigned`. Contar a sentinela como papel repetiria
   * aqui o erro que a b.39 corrigiu nas fases — e faria os 13 parecerem 14 justamente na
   * banda que existe para dizer que ninguém foi acrescentado ao vocabulário.
   */
  const canonicalRoleCount = (getOntologyData().roles ?? []).length;
  /*
   * 0.20.0-beta.43 — o manifesto do pino declara `DecisionInvolvement` e o bundle não traz o
   * ficheiro. É aqui que um consumidor procuraria «quem aprova o quê», e por isso é aqui que
   * a falta se declara — em vez de o vazio parecer ausência de conteúdo.
   */
  const decisionGap = manifestGapBand("decision_involvements");

  /**
   * 0.20.0-beta.44 (v2.7-r2) — QUEM DECIDE, ao lado de quem executa.
   *
   * Esta superfície sempre serviu EXECUÇÃO (atribuições de prática). A decisão é espécie
   * PARALELA e estava invisível: o papel que aprova o programa não aparecia em lado nenhum.
   * Agora aparece — com a ÂNCORA VERBATIM de onde cada envolvimento foi derivado, que é o
   * que permite contraprovar em vez de confiar.
   *
   * A asserção negativa vem da fonte e é a peça que impede a leitura errada: **não afirma
   * execução nem RACI completo**. Um papel que aprova não é, por isso, um papel que faz — e
   * a ausência de um papel aqui não é ausência de responsabilidade, é ausência de estrutura
   * publicada de onde a derivar.
   */
  const decisionBand = (() => {
    const all = getOntologyData().decisionInvolvements ?? [];
    if (all.length === 0) return undefined;
    const role = typeof full.canonicalRole === "string" ? full.canonicalRole : undefined;
    const scoped = role === undefined ? all : all.filter((d) => d.role_id === role);
    const byKind = scoped.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.kind]: (acc[d.kind] ?? 0) + 1 }), {});
    const chapters = [...new Set(scoped.map((d) => d.bundle_id))].sort();
    /*
     * 0.20.0-beta.46 (G2) — A BANDA NÃO FILTRA POR NÍVEL, E TEM DE O DIZER.
     *
     * `risk_level="L2"` devolvia 19 envolvimentos de gestão executiva — 1 aplicável a L2, 11
     * declarados só-L3, 7 sem níveis nenhuns. A banda não filtrava e **não dizia que não
     * filtrava**, e este servidor treina o consumidor a acreditar que, se algo não se aplica,
     * é dito. **É a banda mais atraente da build — âncoras verbatim a ficheiro e linha — e era
     * a que mentia por omissão.** O erro é invisível a quem confia.
     *
     * O produto é de CONSULTA: a saída não é filtrar em silêncio. A entrada fica completa e
     * passa a ser LEGÍVEL — diz-se que o nível não filtra, dá-se a contagem por nível, e
     * declaram-se os que não trazem níveis (104 dos 164 no pino). O juízo é de quem chama.
     */
    const lvl = (l: string) => scoped.filter((d) => d.applicable_levels?.[l] === true).length;
    const semNiveis = scoped.filter((d) => Object.keys(d.applicable_levels ?? {}).length === 0).length;
    const semNiveisGlobal = all.filter((d) => Object.keys(d.applicable_levels ?? {}).length === 0).length;
    return {
      asserts: assertionFor("role_holds_decision_involvement"),
      level_filtering: {
        risk_level_requested: full.risk_level,
        filters_this_band: false,
        note:
          `**O \`risk_level\` NÃO filtra esta banda.** Recebeste os ${scoped.length} envolvimentos ` +
          "publicados para este âmbito, não os aplicáveis ao teu nível — e isso é deliberado: esta é uma " +
          "superfície de CONSULTA, e filtrar em silêncio esconderia o que existe. **Lê o " +
          "`applicable_levels` de cada item antes de agir sobre ele.**",
        at_requested_level: lvl(full.risk_level),
        by_level: { L1: lvl("L1"), L2: lvl("L2"), L3: lvl("L3") },
        without_levels: {
          count: semNiveis,
          published_total: semNiveisGlobal,
          note:
            `${semNiveis} destes não declaram níveis nenhuns (${semNiveisGlobal} dos ${all.length} publicados). ` +
            "**Ausência de níveis não é «aplica-se a todos»** — é ausência de declaração na fonte, e não se " +
            "infere um alcance que o Manual não dá."
        }
      },
      scope: role ?? "todos os papéis",
      total: scoped.length,
      by_kind: byKind,
      chapters,
      published_total: all.length,
      note:
        scoped.length === 0
          ? `Nenhum envolvimento de decisão publicado para \`${role ?? "este âmbito"}\`. **Não é ausência de ` +
            "responsabilidade** — é ausência de estrutura publicada (DoD, alçadas, tabelas) de onde a derivar. " +
            `O Manual publica ${all.length} envolvimentos ao todo.`
          : "Quem **aprova** e quem é **consultado**, derivado de estruturas publicadas e com a ÂNCORA " +
            "verbatim de cada um — contrapõe o texto à leitura em vez de confiares nela. Espécie PARALELA " +
            "às atribuições de prática: estas dizem quem EXECUTA, esta diz quem DECIDE, e as contagens de " +
            "execução não mudam.",
      values: scoped.slice(0, 25).map((d) => ({
        involvement_id: d.involvement_id,
        kind: d.kind,
        chapter: d.bundle_id,
        applicable_levels: d.applicable_levels,
        anchor: d.anchor,
        anchor_text: d.anchor_text
      })),
      ...(scoped.length > 25
        ? { truncated: { returned: 25, total: scoped.length, reach_with: `resolve_entities(record_type="decision_involvement")` } }
        : {})
    };
  })();

  const emptyCombination = (() => {
    if (!hasFilter || full.assignments.length > 0 || full.unsupported_role !== undefined) return undefined;
    const filters = [
      ...(full.canonicalRole !== null && full.canonicalRole !== undefined ? [`role="${String(full.canonicalRole)}"`] : []),
      ...(full.canonicalPhase !== null && full.canonicalPhase !== undefined ? [`phase="${String(full.canonicalPhase)}"`] : []),
      `risk_level="${full.risk_level}"`
    ];
    const roleOnly =
      full.canonicalRole !== null && full.canonicalRole !== undefined
        ? countAssignments({ riskLevel: full.risk_level, role: String(full.canonicalRole) })
        : undefined;
    const phaseOnly =
      full.canonicalPhase !== null && full.canonicalPhase !== undefined
        ? countAssignments({ riskLevel: full.risk_level, phase: String(full.canonicalPhase) })
        : undefined;
    const narrowed =
      roleOnly !== undefined && phaseOnly !== undefined && roleOnly > 0 && phaseOnly > 0
        ? "combination"
        : roleOnly === 0
          ? "role"
          : phaseOnly === 0
            ? "phase"
            : "unknown";
    return {
      filters_applied: filters,
      assignments: 0,
      emptied_by: narrowed,
      ...(roleOnly !== undefined ? { assignments_for_role_alone: roleOnly } : {}),
      ...(phaseOnly !== undefined ? { assignments_for_phase_alone: phaseOnly } : {}),
      note:
        narrowed === "combination"
          ? "VAZIO POR COMBINAÇÃO: cada filtro tem resultados por si, e o cruzamento não tem nenhum. " +
            "**Não concluas que o papel não tem nada a fazer** — conclui que o bundle não lhe atribui " +
            "práticas NESTA fase. Tira a fase para veres o que ele faz."
          : narrowed === "role"
            ? "VAZIO PELO PAPEL: este papel não tem atribuições ao nível pedido, com ou sem fase."
            : narrowed === "phase"
              ? "VAZIO PELA FASE: esta fase não tem atribuições ao nível pedido, com ou sem papel."
              : "VAZIO, e o servidor não conseguiu isolar qual dos filtros o esvaziou — declara-se assim.",
      reach_with:
        full.canonicalRole !== null && full.canonicalRole !== undefined
          ? `get_guide_by_role(risk_level="${full.risk_level}", role="${String(full.canonicalRole)}")`
          : `get_guide_by_role(risk_level="${full.risk_level}")`
    };
  })();

  /**
   * 0.20.0-beta.39 — O RÓTULO NOMEIA UM NÍVEL DIFERENTE DO QUE PEDISTE.
   *
   * A auditoria viu «Revisão formal de arquitetura para L3» servida sob `risk_level="L2"` e
   * perguntou se era serviço ou conteúdo. **Não é nenhum dos dois.** A mesma prática é
   * publicada nos três níveis com proporcionalidade GRADUADA — L1 «Não», L2 «Recomendado -
   * Revisão peer reforçada», L3 «Obrigatório - Processo formal e auditável» — e o nível
   * filtra correctamente. O que engana é o NOME da prática, que cita L3 e viaja para uma
   * resposta de L2 sem nada o qualificar.
   *
   * São 16 atribuições em 1296. A `proportionality` já vinha servida ao lado; faltava dizer
   * que o nível no rótulo não é o nível pedido — e é isso, e só isso, que esta banda faz.
   */
  const levelNamedInLabel = (() => {
    const requested = full.risk_level;
    const values = (hasFilter ? full.assignments : [])
      .map((a) => {
        const named = /(?:^|[-_ ])l([123])(?:[-_ ]|$)/i.exec(a.practice_id ?? "");
        if (named === null || `L${named[1]}` === requested) return undefined;
        return {
          practice_id: a.practice_id,
          level_in_label: `L${named[1]}`,
          served_at: requested,
          proportionality_at_served_level: a.proportionality ?? null
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    return {
      count: values.length,
      note:
        "O NOME destas práticas cita um nível diferente do que pediste. **Não é erro de nível**: a mesma " +
        "prática é publicada nos três níveis e o que muda é a `proportionality` — ao teu nível é a que vem " +
        "em `proportionality_at_served_level`, não a do nome. Lê a proporcionalidade, não o rótulo.",
      values
    };
  })();

  return {
    ...(full.phase_warning ? { phase_warning: full.phase_warning } : {}),
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "guide_resolution_pipeline",
      source_data:
        "runtime/controls.json + runtime/practices.json + runtime/assignments.json + runtime/user_stories.json + runtime/roles.json + runtime/phases.json",
      note:
        "Guide mode uses the deterministic runtime bundle: controls activate practices, then assignments and user stories are joined structurally by practice_id.",
    },
    risk_level: full.risk_level,
    roleFilter: full.roleFilter,
    canonicalRole: full.canonicalRole,
    phaseFilter: full.phaseFilter,
    canonicalPhase: full.canonicalPhase,
    assignments: hasFilter ? dedupeEmbeddedStories(full.assignments.map((a) => slimAssignment(a, includeDetail))) : [],
    ...(emptyCombination ? { empty_result: emptyCombination } : {}),
    ...(levelNamedInLabel.count > 0 ? { level_named_in_label: levelNamedInLabel } : {}),
    ...(role_checklist ? { role_checklist } : {}),
    ...(full.unsupported_role ? { unsupported_role: full.unsupported_role } : {}),
    // 2026-09-11 §1: o papel referenciado-não-canónico (rh-peopleops) tem banda própria;
    // unknown_role só sai quando NEM canónico NEM referenciado.
    ...(full.unknown_role && !referencedRole ? { unknown_role: full.unknown_role } : {}),
    ...(full.role_scope_split ? { role_scope_split: full.role_scope_split } : {}),
    ...(decisionBand ? { decision_involvements: decisionBand } : {}),
    ...(decisionGap
      ? {
          decision_involvement_unavailable: {
            ...decisionGap,
            what_it_would_answer:
              "quem APROVA e quem é CONSULTADO por capítulo — a peça que falta ao «o que eu decido vs. o que " +
              "delego». Esta superfície serve EXECUÇÃO (atribuições de prática); a decisão é outra espécie e " +
              "viria dessa entidade."
          }
        }
      : {}),
    ...(referencedRole
      ? {
          referenced_role: {
            requested: String(full.roleFilter ?? ""),
            referenced_role_id: referencedRole.referenced_role_id,
            label: referencedRole.label,
            canonical: false,
            anchors: referencedRole.anchors,
            ...(referencedRole.absence_ref !== undefined
              ? { absence: absenceBand(referencedRole.absence_ref, `papel referenciado \`${referencedRole.label}\``) }
              : {}),
            note:
              "**REFERENCIADO, NÃO CANÓNICO.** O Manual NOMEIA este papel — as âncoras acima são as " +
              "passagens autoradas — mas ele não está no vocabulário dos papéis canónicos, e por isso não " +
              "tem atribuições nesta superfície. **Não é o 14.º papel:** os canónicos continuam a ser " +
              `${canonicalRoleCount}. Não o adiciones ao vocabulário e não infiras dele responsabilidades ` +
              "que o Manual não atribui — lê as âncoras, que é o que existe."
          }
        }
      : {}),
    role_summary,
    phase_summary,
    meta: {
      ...full.meta,
      note: hasFilter
        ? full.meta.note
        : `${full.meta.note} No role/phase filter — assignments omitted. Specify role= or phase= for details.`,
    },
    /*
     * 0.20.0-beta.41 — o `next` REFLECTE a banda, não apenas evita contradizê-la (b.39). Um
     * vazio por combinação tem um caminho de recuperação óbvio — tirar o filtro que o
     * esvaziou — e é esse que passa à frente.
     */
    next:
      emptyCombination !== undefined
        ? [
            {
              intent:
                emptyCombination.emptied_by === "combination"
                  ? "O mesmo papel SEM a fase que esvaziou o resultado"
                  : "O mesmo corte com menos filtros",
              tool: "get_guide_by_role",
              with:
                full.canonicalRole !== null && full.canonicalRole !== undefined
                  ? `risk_level="${full.risk_level}", role="${String(full.canonicalRole)}"`
                  : `risk_level="${full.risk_level}"`,
              kind: "structural" as const
            },
            ...guideByRoleAffordances(full.risk_level, full.canonicalRole)
          ]
        : guideByRoleAffordances(full.risk_level, full.canonicalRole),
  };
}
