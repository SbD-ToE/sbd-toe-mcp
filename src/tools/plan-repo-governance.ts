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
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { paginate, type PageCoverage, type SizeEstimate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { planRepoGovernanceAffordances } from "../serving/affordances.js";
import { structuralProvenance } from "../serving/protocol-envelope.js";
import { assertionFor } from "../serving/traversal-assertions.js";

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
  /** 0.20.0-beta.42 — proveniência da projecção (célula `provenance` da matriz). */
  provenance?: Record<string, unknown>;
  /** 0.20.0-beta.46 — o que o `riskLevel` faz, e o que não faz. */
  risk_level_effect?: Record<string, unknown>;
  riskLevel: string | null;
  totalArtefacts: number;
  /** 0.16.0 (v1.16 §1.23): totais com SEMÂNTICA declarada — distinct vs relações capítulo×artefacto. */
  artefact_totals: { distinct_count: number; chapter_relation_count: number; count_semantics: string };
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
      // 0.15.0: default PAGINADO (5 capítulos).
      limit: typeof limitArg === "number" ? limitArg : 5,
    },
    byChapter.length || 1
  );

  return {
    provenance: structuralProvenance(
      "repo_governance_projection",
      "runtime/artifact_requirements.json + runtime/assignments.json",
      "Artefactos de governação do repositório por capítulo, derivados dos ArtifactRequirement " +
        "publicados. É projecção: a relação capítulo↔artefacto não é posse nem obrigação de produção."
    ),
    riskLevel,
    /*
     * 0.20.0-beta.46 (G4) — o que o `riskLevel` FAZ e o que NÃO faz.
     *
     * Vendia-se como filtro sobre o `required_for_levels`, que a superfície irmã declara não
     * discriminar quase nada (2 de 45 registos têm algum nível a `false`). O efeito é real mas
     * global e pequeno; por capítulo, é quase sempre nulo. Dizê-lo é o mínimo: um consumidor
     * que veja o argumento aceite conclui que a lista foi recortada para ele.
     */
    risk_level_effect: {
      filters: true,
      basis: "`required_for_levels` dos ArtifactRequirement publicados",
      note:
        "**Filtra pouco, e por desenho.** O campo que o suporta é quase degenerado — 2 de 45 registos " +
        "declaram algum nível a `false`; os restantes são `{L1,L2,L3: true}`. Por isso a maioria dos " +
        "capítulos devolve o MESMO conjunto em L1, L2 e L3. Não leias a presença do argumento como " +
        "garantia de que a lista foi recortada ao teu nível.",
      asserts: assertionFor("artifact_defining_chapters")
    },
    totalArtefacts: artefacts.length,
    artefact_totals: loadArtefactTotals(),
    byChapter: page.items,
    coverage: page.coverage,
    size_estimate: page.size_estimate,
    note:
      "Artefacts sourced from the published SbD-ToE runtime. totalArtefacts conta relações capítulo×artefacto na página-filtro; artefact_totals traz distinct_count vs chapter_relation_count com a semântica declarada pelo bundle (v1.16). " +
      "The manual does not provide document templates — if a template is needed, " +
      "ask the LLM to generate one based on the artefact description. " +
      "byChapter is coverage-preserving paginated — follow coverage.nextOffset to page.",
    next: planRepoGovernanceAffordances(riskLevel)
  };
}


let cachedTotals: { distinct_count: number; chapter_relation_count: number; count_semantics: string } | undefined;
/** Meta do runtime/artifacts.json (v1.16 §1.23) — nunca recontado em código. */
function loadArtefactTotals() {
  if (!cachedTotals) {
    const j = JSON.parse(readFileSync(resolveAppPath("data/publish/runtime/artifacts.json"), "utf-8")) as Record<string, unknown>;
    cachedTotals = {
      distinct_count: typeof j["distinct_count"] === "number" ? (j["distinct_count"] as number) : -1,
      chapter_relation_count: typeof j["chapter_relation_count"] === "number" ? (j["chapter_relation_count"] as number) : -1,
      count_semantics: typeof j["count_semantics"] === "string" ? (j["count_semantics"] as string) : "n/d (bundle sem meta)"
    };
  }
  return cachedTotals;
}
