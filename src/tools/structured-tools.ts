import {
  CANONICAL_ANCHOR,
  CURATED_TITLES,
  GRADUATED_SEMANTICS,
  demandByLevel,
  gradedChapters
} from "../serving/applicability.js";
import { readFileSync } from "node:fs";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";
import { resolveAppPath } from "../config.js";
import type { LooseRecord } from "../types.js";
import { getOntologyData } from "./ontology-loader.js";
import { describeRequirementCitation, describeRequirementGap } from "../serving/requirement-id.js";
import {
  listChaptersAffordances,
  queryEntitiesAffordances,
  chapterBriefAffordances,
  mapApplicabilityAffordances
} from "../serving/affordances.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

// Curated display titles live in ONE place now (serving/applicability.ts).
const READABLE_TITLES: Record<string, string> = CURATED_TITLES;

// (ciclo 0.14.0) ACTIVE_CHAPTERS_BY_RISK morreu — a noção binária desaparece do
// serving (decisão do Author, 2026-09-01). A aplicabilidade é GRADUADA e derivada
// dos dados: ver src/serving/applicability.ts.

const RISK_ORDER: readonly RiskLevel[] = ["L1", "L2", "L3"];

interface ChapterApplicability {
  applicability: { L1: boolean; L2: boolean; L3: boolean };
  /** Dominant authored demand per level (obrigatorio/recomendado/opcional/specific;
   * foundational = no assignments) — replaces the retired binary `minLevel` theory. */
  demand_by_level: Record<RiskLevel, string>;
}

/**
 * Graduated applicability (ciclo 0.14.0): a chapter is NEVER excluded by level —
 * presence is unconditional and the demand scales, derived from the authored
 * assignment proportionality (src/serving/applicability.ts).
 */
function chapterApplicability(chapterId: string): ChapterApplicability {
  return {
    applicability: { L1: true, L2: true, L3: true },
    demand_by_level: demandByLevel(chapterId)
  };
}

let cachedBundleCatalog: LooseRecord[] | undefined;
let cachedMcpChunks: LooseRecord[] | undefined;

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

function getStr(record: LooseRecord, key: string): string | undefined {
  const val = record[key];
  return typeof val === "string" ? val : undefined;
}

function getStrArr(record: LooseRecord, key: string): string[] {
  const val = record[key];
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function loadJsonLines(relativePath: string): LooseRecord[] {
  const path = resolveAppPath(relativePath);
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as LooseRecord);
}

function loadBundleCatalog(): LooseRecord[] {
  if (!cachedBundleCatalog) {
    cachedBundleCatalog = loadJsonLines("data/publish/indexes/bundle_catalog.jsonl");
  }
  return cachedBundleCatalog;
}

function loadMcpChunks(): LooseRecord[] {
  if (!cachedMcpChunks) {
    cachedMcpChunks = loadJsonLines("data/publish/indexes/mcp_chunks.jsonl");
  }
  return cachedMcpChunks;
}

function summarizeChunkText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const compact = text
    .replace(/^#+\s.*$/gmu, "")
    .replace(/^---$/gmu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return compact.length > 0 ? compact : undefined;
}

export function handleListSbdToeChapters(args: Record<string, unknown>): unknown {
  return { ...(handleListSbdToeChaptersCore(args) as Record<string, unknown>), next: listChaptersAffordances() };
}

function handleListSbdToeChaptersCore(
  args: Record<string, unknown>
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (riskLevelArg !== undefined && !isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`
    );
  }
  const riskLevel = isValidRiskLevel(riskLevelArg) ? riskLevelArg : undefined;

  const titleByChapter = new Map(
    loadBundleCatalog()
      .map((item) => [getStr(item, "bundle_id"), getStr(item, "title")] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
  );

  // Ciclo 0.14.0 (graduated): NUNCA filtrar capítulos por nível — presença sempre;
  // cada linha carrega demand_by_level; riskLevel passa a ser anotação, não filtro.
  void riskLevel;
  const chapterIds = Object.keys(READABLE_TITLES);

  const chapters = chapterIds.map((id) => {
    const title = titleByChapter.get(id) ?? READABLE_TITLES[id] ?? id;
    return {
      id,
      title,
      readableTitle: READABLE_TITLES[id] ?? title,
      ...chapterApplicability(id),
    };
  });

  return { chapters };
}

/**
 * Exact entity-ID lookup across the runtime entity indexes. query_entities is a
 * semantic search over chunks, so an exact id (e.g. CTRL-<domain>-<slug>-<hash>)
 * never matches and returns 0. This resolves a real id directly from the entity
 * index before falling back to semantic search. Returns undefined when the query
 * is not an exact id (then the caller runs the semantic path).
 */
function exactEntityLookup(query: string): Record<string, unknown> | undefined {
  const od = getOntologyData();
  const collections: Array<[string, ReadonlyArray<Record<string, unknown>>, string]> = [
    ["control", od.controls as unknown as Record<string, unknown>[], "control_id"],
    ["requirement", od.requirements as unknown as Record<string, unknown>[], "requirement_id"],
    ["threat", od.threats as unknown as Record<string, unknown>[], "id"],
    ["artifact", (od.artifacts ?? []) as unknown as Record<string, unknown>[], "artifact_type_id"],
    ["role", od.roles as unknown as Record<string, unknown>[], "role_id"],
  ];
  for (const [entityType, items, idField] of collections) {
    const match = items.find((item) => item[idField] === query);
    if (match) return { entity_type: entityType, ...match };
  }
  return undefined;
}

export async function handleQuerySbdToeEntities(
  args: Record<string, unknown>
): Promise<unknown> {
  const core = (await handleQuerySbdToeEntitiesCore(args)) as Record<string, unknown>;
  // Informative (not a gap): a cited, unpublished base-form id (illustrative REQ-NNN example
  // ids, CWE-/SHA- tokens) keeps the semantic path but says so — never silent, never aliased.
  const query = args["query"];
  if (typeof query === "string" && core["match"] === undefined) {
    const knownRequirementIds = new Set(getOntologyData().requirements.map((r) => r.requirement_id));
    const citation = describeRequirementCitation(query, knownRequirementIds);
    if (citation) core["citation_note"] = citation;
  }
  return { ...core, next: queryEntitiesAffordances() };
}

async function handleQuerySbdToeEntitiesCore(
  args: Record<string, unknown>
): Promise<unknown> {
  const query = args["query"];
  if (typeof query !== "string" || query.length < 1 || query.length > 200) {
    throw new Error(
      'O argumento "query" é obrigatório e deve ter entre 1 e 200 caracteres.'
    );
  }

  // Exact entity-id lookup first: a real id resolves deterministically from the
  // entity index instead of returning 0 from the semantic search over chunks.
  const exact = exactEntityLookup(query);
  if (exact) {
    return { entities: [exact], total: 1, match: "exact_id" };
  }

  // Requirement-shaped id (contract v1.10 §1.18 grammar or the legacy REQ-<CAT>-NNN
  // citation shape) that the bundle does not carry but the corpus cites: answer with a
  // DECLARED gap («citação legada não resolvível (finding editorial em curso)»), never
  // «requisito inexistente», and never a silent semantic fallback (Codex handover
  // 2026-08-29, gap (b)). A token nobody cites keeps the semantic fallback below.
  const knownRequirementIds = new Set(getOntologyData().requirements.map((r) => r.requirement_id));
  const requirementGap = describeRequirementGap(query, knownRequirementIds);
  if (requirementGap) {
    return { entities: [], total: 0, match: "declared_gap", declared_gap: requirementGap };
  }

  const topKArg = args["topK"];
  if (topKArg !== undefined) {
    if (
      typeof topKArg !== "number" ||
      !Number.isInteger(topKArg) ||
      topKArg < 1 ||
      topKArg > 15
    ) {
      throw new Error('O argumento "topK" deve ser um inteiro entre 1 e 15.');
    }
  }
  const topK = typeof topKArg === "number" ? topKArg : 5;

  const riskLevelArg = args["riskLevel"];
  if (riskLevelArg !== undefined && !isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`
    );
  }
  const riskLevel = isValidRiskLevel(riskLevelArg) ? riskLevelArg : undefined;

  const entityType =
    typeof args["entityType"] === "string" ? args["entityType"] : undefined;
  const chapterId =
    typeof args["chapterId"] === "string" ? args["chapterId"] : undefined;

  // Filters select over `retrieved` — the FULL ranked list of chunks scored for the
  // query (the gateway only slices `selected` to topK) — so a typed / level-scoped
  // query has the whole corpus as its pool, not just the top-K.
  const hasFilter = entityType !== undefined || chapterId !== undefined || riskLevel !== undefined;
  const bundle = await retrievePublishedContext(query, topK);
  const pool = bundle.retrieved;
  let results = pool;

  if (entityType !== undefined) {
    // The substrate carries no per-chunk `entity_type`; entity types reach a chunk through
    // chunk_entity_mentions (joined by the gateway as `entity_mentions_flat`:
    // Requirement / UserStory / Metric / Threat).
    const wanted = normalizeEntityTypeToken(entityType);
    results = results.filter((r) => chunkEntityTypeTokens(r.raw).some((t) => t === wanted));
  }

  if (chapterId !== undefined) {
    // Chapter = the chunk's bundle (`bundle_id`, surfaced as `chapter`); accepts the full
    // bundle id or its numeric prefix ("06" → "06-desenvolvimento-seguro").
    results = results.filter((r) => {
      const bundleId = r.raw["bundle_id"];
      return (
        (typeof r.chapter === "string" && r.chapter.includes(chapterId)) ||
        (typeof bundleId === "string" && (bundleId === chapterId || bundleId.startsWith(chapterId)))
      );
    });
  }

  if (riskLevel !== undefined) {
    // Risk facet: `filter_tags.risk_level` (contract v1.4 faceting). Strict: a chunk
    // without a risk facet does not match — declared below.
    results = results.filter((r) => chunkRiskLevels(r.raw).includes(riskLevel));
  }

  // Strip internal fields (raw Algolia record, scoring) — not useful to the agent.
  const entities = results.slice(0, topK).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ raw, algoliaRank, localScore, indexName, ...rest }) => rest
  );
  if (!hasFilter) return { entities, total: results.length };
  const withRiskFacet = riskLevel === undefined ? undefined : pool.filter((r) => chunkRiskLevels(r.raw).length > 0).length;
  return {
    entities,
    total: results.length,
    filters: {
      applied: {
        ...(entityType !== undefined ? { entityType } : {}),
        ...(chapterId !== undefined ? { chapterId } : {}),
        ...(riskLevel !== undefined ? { riskLevel } : {}),
      },
      retrieval_pool: pool.length,
      matched: results.length,
      ...(withRiskFacet !== undefined ? { pool_with_risk_facet: withRiskFacet } : {}),
      note:
        "Filters select over the full ranked retrieval for the query. entityType matches the entity " +
        "types a chunk mentions (Requirement, UserStory, Metric, Threat); riskLevel matches the chunk's " +
        "published risk facet only — chunks without a facet are not returned (declared, not silent).",
    },
  };
}

const ENTITY_TYPE_ALIASES: Record<string, string> = {
  requirements: "requirement",
  req: "requirement",
  userstories: "userstory",
  user_story: "userstory",
  user_stories: "userstory",
  us: "userstory",
  metrics: "metric",
  kpi: "metric",
  threats: "threat",
};

function normalizeEntityTypeToken(value: string): string {
  const base = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const aliased = ENTITY_TYPE_ALIASES[base] ?? base;
  return aliased.replace(/_/g, "");
}

function chunkEntityTypeTokens(raw: LooseRecord): string[] {
  const arr = raw["entity_mentions_flat"];
  if (!Array.isArray(arr)) return [];
  return arr.filter((v): v is string => typeof v === "string").map(normalizeEntityTypeToken);
}

function chunkRiskLevels(raw: LooseRecord): string[] {
  const tags = raw["filter_tags"];
  if (typeof tags === "object" && tags !== null) {
    const rl = (tags as Record<string, unknown>)["risk_level"];
    if (Array.isArray(rl)) return rl.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export function handleGetSbdToeChapterBrief(args: Record<string, unknown>): unknown {
  const chapterId = typeof args["chapterId"] === "string" ? args["chapterId"] : undefined;
  return { ...(handleGetSbdToeChapterBriefCore(args) as Record<string, unknown>), next: chapterBriefAffordances(chapterId) };
}

function handleGetSbdToeChapterBriefCore(
  args: Record<string, unknown>
): unknown {
  const chapterId = args["chapterId"];
  if (typeof chapterId !== "string" || chapterId.trim().length === 0) {
    throw new Error('O argumento "chapterId" é obrigatório e não pode ser vazio.');
  }

  const bundle = loadBundleCatalog().find((item) => getStr(item, "bundle_id") === chapterId);
  if (!bundle && READABLE_TITLES[chapterId] === undefined) {
    return { id: chapterId, found: false };
  }

  const ontology = getOntologyData();
  const phases = Array.from(
    new Set(
      ontology.assignments
        .filter((assignment) => assignment.chapter_id === chapterId && assignment.phase.length > 0)
        .map((assignment) => assignment.phase)
    )
  ).sort();
  const roles = Array.from(
    new Set(
      ontology.assignments
        .filter((assignment) => assignment.chapter_id === chapterId && assignment.role.length > 0)
        .map((assignment) => assignment.role)
    )
  ).sort();
  const artifacts = Array.from(
    new Set(
      (ontology.artifactRequirements ?? [])
        .filter((artifactRequirement) => (artifactRequirement.chapter_ids ?? []).includes(chapterId))
        .map((artifactRequirement) => artifactRequirement.artifact_type_id)
    )
  ).sort();
  const introChunk = loadMcpChunks().find((item) => {
    const bundleId = getStr(item, "bundle_id");
    const documentRole = getStr(item, "document_role");
    const documentId = getStr(item, "document_id");
    const summaryDocumentId = bundle ? getStr(bundle, "summary_document_id") : undefined;
    return (
      bundleId === chapterId &&
      (documentRole === "intro" || documentId === summaryDocumentId)
    );
  });

  const objective = summarizeChunkText(
    (introChunk ? getStr(introChunk, "text") : undefined) ??
      (introChunk ? getStr(introChunk, "vector_text") : undefined)
  );

  return {
    id: chapterId,
    found: true,
    title: READABLE_TITLES[chapterId] ?? (bundle ? getStr(bundle, "title") : undefined) ?? chapterId,
    ...(objective !== undefined ? { objective } : {}),
    ...(roles.length > 0 ? { role: roles } : {}),
    ...(phases.length > 0 ? { phases } : {}),
    ...(artifacts.length > 0 ? { artifacts } : {})
  };
}

const VALID_TECHNOLOGIES = [
  "containers", "serverless", "kubernetes", "ci-cd", "iac", "api-gateway",
  "mobile", "spa", "microservices", "legacy-integration", "ml-ai", "data-pipeline",
  "sca-sbom", "sast", "dast", "secrets-management", "monitoring", "iam",
  "network-segmentation", "cryptography"
] as const;

type Technology = (typeof VALID_TECHNOLOGIES)[number];

const VALID_PROJECT_ROLES = [
  "developer", "architect", "security", "devops", "manager"
] as const;

type ProjectRole = (typeof VALID_PROJECT_ROLES)[number];

function isValidTechnology(value: unknown): value is Technology {
  return typeof value === "string" && (VALID_TECHNOLOGIES as readonly string[]).includes(value);
}

function isValidProjectRole(value: unknown): value is ProjectRole {
  return typeof value === "string" && (VALID_PROJECT_ROLES as readonly string[]).includes(value);
}

interface ActivatedBundle {
  chapterId: string;
  status: "active" | "conditional";
  reason: string;
}

interface ActivatedBundles {
  foundationBundles: ActivatedBundle[];
  domainBundles: ActivatedBundle[];
  operationalBundles: ActivatedBundle[];
}

function buildActivatedBundles(
  riskLevel: RiskLevel,
  technologies: Technology[]
): ActivatedBundles {
  const techSet = new Set(technologies);

  const foundationBundles: ActivatedBundle[] = [
    { chapterId: "01-classificacao-aplicacoes", status: "active", reason: "Obrigatório L1+" },
    { chapterId: "02-requisitos-seguranca",      status: "active", reason: "Obrigatório L1+" },
    { chapterId: "03-threat-modeling",           status: "active", reason: "Obrigatório L1+" }
  ];

  const domainBundles: ActivatedBundle[] = [];
  if (techSet.has("sca-sbom") || techSet.has("sast") || techSet.has("dast")) {
    domainBundles.push({
      chapterId: "05-dependencias-sbom-sca",
      status: "active",
      reason: `technologies inclui ${(["sca-sbom", "sast", "dast"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  domainBundles.push({
    chapterId: "06-desenvolvimento-seguro",
    status: "active",
    reason: `presença graduada em ${riskLevel} — exigência conforme proportionality autorada (ciclo 0.14.0)`
  });
  if (techSet.has("iac") || techSet.has("containers") || techSet.has("kubernetes")) {
    domainBundles.push({
      chapterId: "08-iac-infraestrutura",
      status: "active",
      reason: `technologies inclui ${(["iac", "containers", "kubernetes"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  if (techSet.has("containers") || techSet.has("kubernetes")) {
    domainBundles.push({
      chapterId: "09-containers-imagens",
      status: "active",
      reason: `technologies inclui ${(["containers", "kubernetes"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  if (techSet.has("sast") || techSet.has("dast")) {
    domainBundles.push({
      chapterId: "10-testes-seguranca",
      status: "active",
      reason: `technologies inclui ${(["sast", "dast"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }

  const operationalBundles: ActivatedBundle[] = [];
  if (techSet.has("ci-cd")) {
    operationalBundles.push({
      chapterId: "07-cicd-seguro",
      status: "active",
      reason: "technologies inclui ci-cd"
    });
  }
  if (riskLevel === "L2" || riskLevel === "L3") {
    operationalBundles.push({
      chapterId: "11-deploy-seguro",
      status: "active",
      reason: "L2+"
    });
  }
  if (techSet.has("monitoring")) {
    operationalBundles.push({
      chapterId: "12-monitorizacao-operacoes",
      status: "active",
      reason: "technologies inclui monitoring"
    });
  }

  return { foundationBundles, domainBundles, operationalBundles };
}

export function handleMapSbdToeApplicability(args: Record<string, unknown>): unknown {
  const riskLevel = typeof args["riskLevel"] === "string" ? args["riskLevel"] : undefined;
  return { ...(handleMapSbdToeApplicabilityCore(args) as Record<string, unknown>), next: mapApplicabilityAffordances(riskLevel) };
}

function handleMapSbdToeApplicabilityCore(
  args: Record<string, unknown>
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel é obrigatório e deve ser L1, L2 ou L3. Recebido: "${String(riskLevelArg)}".`
    );
  }
  const riskLevel = riskLevelArg;

  // Validate optional technologies allowlist
  const technologiesArg = args["technologies"];
  let technologies: Technology[] = [];
  if (technologiesArg !== undefined) {
    if (!Array.isArray(technologiesArg)) {
      const err: { code: number; message: string; data: unknown } = {
        code: -32602,
        message: 'O argumento "technologies" deve ser um array.',
        data: null
      };
      throw Object.assign(new Error(err.message), { rpcError: err });
    }
    const invalidTechs = (technologiesArg as unknown[]).filter((t) => !isValidTechnology(t));
    if (invalidTechs.length > 0) {
      const err = {
        code: -32602,
        message: `Valores inválidos em "technologies": ${invalidTechs.map(String).join(", ")}. Valores permitidos: ${VALID_TECHNOLOGIES.join(", ")}.`,
        data: { invalidValues: invalidTechs }
      };
      throw Object.assign(new Error(err.message), { rpcError: err });
    }
    technologies = (technologiesArg as unknown[]).filter(isValidTechnology);
  }

  // Validate optional projectRole allowlist
  const projectRoleArg = args["projectRole"];
  if (projectRoleArg !== undefined && !isValidProjectRole(projectRoleArg)) {
    const err = {
      code: -32602,
      message: `Valor inválido em "projectRole": "${String(projectRoleArg)}". Valores permitidos: ${VALID_PROJECT_ROLES.join(", ")}.`,
      data: { invalidValue: projectRoleArg }
    };
    throw Object.assign(new Error(err.message), { rpcError: err });
  }

  // Ciclo 0.14.0 (decisão do Author): aplicabilidade GRADUADA — presença sempre,
  // exigência derivada dos assignments autorados; active/excluded binários morreram.
  const projectRoleForView = typeof args["projectRole"] === "string" ? (args["projectRole"] as string) : undefined;
  const chapters = gradedChapters(riskLevel, projectRoleForView);

  const activatedBundles = buildActivatedBundles(riskLevel, technologies);

  // conditional = chapters activated by the provided CONTEXT (technologies),
  // beyond the risk baseline. Previously hardcoded [] (a dead field while the
  // context activation lived only in activatedBundles). Now derived from the
  // technology-driven bundles, so the model is coherent: `active` is the risk
  // baseline, `conditional` is the context overlay, `activatedBundles` is the
  // full structured view. Empty when no technologies are supplied.
  const conditionalSeen = new Set<string>();
  const conditional: Array<{ chapterId: string; reason: string }> = [];
  for (const bundle of [
    ...activatedBundles.foundationBundles,
    ...activatedBundles.domainBundles,
    ...activatedBundles.operationalBundles
  ]) {
    if (
      bundle.reason.toLowerCase().includes("technologies inclui") &&
      !conditionalSeen.has(bundle.chapterId)
    ) {
      conditionalSeen.add(bundle.chapterId);
      conditional.push({ chapterId: bundle.chapterId, reason: bundle.reason });
    }
  }

  return {
    riskLevel,
    semantics: GRADUATED_SEMANTICS,
    canonical_anchor: CANONICAL_ANCHOR,
    chapters,
    conditional,
    activatedBundles
  };
}
