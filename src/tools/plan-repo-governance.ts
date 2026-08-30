/**
 * plan_sbd_toe_repo_governance
 *
 * Returns the list of artefacts/documents identified in the SbD-ToE manual,
 * grouped by chapter, with their risk level applicability.
 * Optionally filtered by riskLevel (L1/L2/L3).
 *
 * All data comes from the entities index — nothing is invented.
 * Document templates are not provided by the manual; the LLM may generate
 * them if asked, using the artefact list as a guide.
 */

import { chapterNumber, getOntologyData, type Requirement } from "./ontology-loader.js";
import { paginate, type PageCoverage, type SizeEstimate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { planRepoGovernanceAffordances } from "../serving/affordances.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

/**
 * Requirement-first applicability ladder (serving fix, brief #3b). A chapter's
 * active risk levels are derived from the requirements that actually apply there
 * (`requirements.applicable_levels`, the sharp ladder) — NOT a hardcoded chapter
 * on/off table. Controls/artefacts are the floor: an artefact rides the levels at
 * which its chapter carries an applicable requirement; a chapter with no
 * requirements at all stays floor-present at every level (baseline, not sharpened).
 */
function activeLevelsByChapter(requirements: readonly Requirement[]): Map<number, Set<RiskLevel>> {
  const byChapter = new Map<number, Set<RiskLevel>>();
  for (const req of requirements) {
    if (Number.isNaN(req.source_chapter)) continue;
    const set = byChapter.get(req.source_chapter) ?? new Set<RiskLevel>();
    for (const level of VALID_RISK_LEVELS) {
      if (req.applicable_levels[level]) set.add(level);
    }
    byChapter.set(req.source_chapter, set);
  }
  return byChapter;
}

function chapterActiveLevels(
  chapterId: string,
  ladder: Map<number, Set<RiskLevel>>
): RiskLevel[] {
  const num = chapterNumber(chapterId);
  const fromRequirements = Number.isNaN(num) ? undefined : ladder.get(num);
  // Floor: a chapter without requirements is baseline-present at every level.
  if (fromRequirements === undefined || fromRequirements.size === 0) {
    return [...VALID_RISK_LEVELS];
  }
  return VALID_RISK_LEVELS.filter((level) => fromRequirements.has(level));
}

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

export interface ManualArtefact {
  artefactId: string;
  chapterId: string;
  riskLevels: string[];
}

export interface ArtefactsByChapter {
  chapterId: string;
  artefacts: ManualArtefact[];
}

export interface PlanRepoGovernanceResult {
  riskLevel: string | null;
  totalArtefacts: number;
  byChapter: ArtefactsByChapter[];
  /** Coverage-preserving page cursor over `byChapter` (follow `nextOffset`). */
  coverage: PageCoverage;
  /** Estimated serialized size of the returned `byChapter` page ({ chars, approx_tokens }). */
  size_estimate: SizeEstimate;
  note: string;
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next: Affordance[];
}

export function handlePlanRepoGovernance(args: Record<string, unknown>): PlanRepoGovernanceResult {
  // riskLevel is optional — if provided, filter to artefacts applicable at that level
  const riskLevelArg = args["riskLevel"];
  let riskLevel: RiskLevel | null = null;
  if (riskLevelArg !== undefined && riskLevelArg !== null && riskLevelArg !== "") {
    if (!isValidRiskLevel(riskLevelArg)) {
      throw Object.assign(
        new Error(`riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`),
        { rpcError: { code: -32602, message: `Invalid riskLevel: "${String(riskLevelArg)}"` } }
      );
    }
    riskLevel = riskLevelArg;
  }

  const artMap = new Map<string, { artefactId: string; chapterId: string; riskLevels: Set<string> }>();

  // Artefacts come from the runtime bundle (artifact_requirements × requirement ladder).
  // The Algolia-era snapshot-cache path was retired (never reached at runtime).
  const ontology = getOntologyData();
  const ladder = activeLevelsByChapter(ontology.requirements ?? []);
  for (const artifactRequirement of ontology.artifactRequirements ?? []) {
    for (const chapterId of artifactRequirement.chapter_ids ?? []) {
      const chapterRiskLevels = chapterActiveLevels(chapterId, ladder);
      const key = `${chapterId}::${artifactRequirement.artifact_type_id}`;
      if (!artMap.has(key)) {
        artMap.set(key, {
          artefactId: artifactRequirement.artifact_type_id,
          chapterId,
          riskLevels: new Set(chapterRiskLevels)
        });
      } else {
        const existing = artMap.get(key)!;
        for (const rl of chapterRiskLevels) existing.riskLevels.add(rl);
      }
    }
  }

  // Build flat list, filter by riskLevel if provided
  const artefacts: ManualArtefact[] = [];
  for (const meta of artMap.values()) {
    const rls = [...meta.riskLevels].sort();
    if (riskLevel !== null && !rls.includes(riskLevel)) continue;
    artefacts.push({ artefactId: meta.artefactId, chapterId: meta.chapterId, riskLevels: rls });
  }

  // Group by chapter, sorted by chapterId
  const chapterMap = new Map<string, ManualArtefact[]>();
  for (const art of artefacts) {
    const list = chapterMap.get(art.chapterId) ?? [];
    list.push(art);
    chapterMap.set(art.chapterId, list);
  }

  const byChapter: ArtefactsByChapter[] = [...chapterMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chapterId, arts]) => ({ chapterId, artefacts: arts }));

  // Coverage-preserving pagination over byChapter. Opt-in: without offset/limit
  // the default page covers every chapter (non-breaking), but `coverage` and
  // `size_estimate` are always returned so consumers can budget and page.
  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    byChapter,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : undefined,
    },
    byChapter.length || 1
  );

  return {
    riskLevel,
    totalArtefacts: artefacts.length,
    byChapter: page.items,
    coverage: page.coverage,
    size_estimate: page.size_estimate,
    note:
      "Artefacts sourced from the published SbD-ToE runtime and manual chapter applicability model. " +
      "The manual does not provide document templates — if a template is needed, " +
      "ask the LLM to generate one based on the artefact description. " +
      "byChapter is coverage-preserving paginated — follow coverage.nextOffset to page.",
    next: planRepoGovernanceAffordances(riskLevel)
  };
}
