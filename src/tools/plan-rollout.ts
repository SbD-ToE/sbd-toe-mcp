/**
 * plan_sbd_toe_rollout  (MVP)
 *
 * A phased rollout roadmap: the canonical lifecycle phases (phases.json, the
 * phase-order I-2), each mapped to its manual chapter and the work to land there.
 * MVP = phase-ordered; the real dependency DAG is deferred (S-2). Grounded in the
 * published runtime phases + chunk surface; nothing invented. Implementation-view
 * family; serves NOW via v1.4.
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { resolveChapterBundle } from "../serving/chunk-index.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";
import { chapterSet, chapterTitle, demandByLevel } from "../serving/applicability.js";

interface PhaseRecord {
  phase_id: string;
  label: string;
  order: number;
  manual_chapter?: number | string;
}

export interface RolloutPhase {
  order: number;
  phase_id: string;
  label: string;
  chapter?: string;
}

export interface RolloutData {
  org_profile?: { value: string; role: string; affects_result: boolean; note: string };
  horizon?: number;
  phases: RolloutPhase[];
  totals: { phases: number; chapters_covered?: number; chapters_in_manual?: number };
  /** 0.20.0-beta.39 — o que o roteiro NÃO cobre, com a exigência por nível e como lá chegar. */
  chapters_not_in_roadmap?: {
    note: string;
    count: number;
    of_total: number;
    mandatory_at_some_level: number;
    chapters: Array<{ chapter: string; title: string; demand_by_level: Record<string, string>; reach_with: string }>;
  };
  model: "phase-ordered-mvp";
}

function loadPhases(): PhaseRecord[] {
  let raw: string;
  try {
    raw = readFileSync(resolveAppPath("data/publish/runtime/phases.json"), "utf-8");
  } catch {
    return [];
  }
  const parsed = JSON.parse(raw) as { items?: unknown[] } | unknown[];
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
  const phases: PhaseRecord[] = [];
  for (const it of items) {
    if (typeof it !== "object" || it === null) continue;
    const rec = it as Record<string, unknown>;
    const phase_id = typeof rec["phase_id"] === "string" ? rec["phase_id"] : "";
    if (!phase_id) continue;
    phases.push({
      phase_id,
      label: typeof rec["label"] === "string" ? rec["label"] : phase_id,
      order: typeof rec["order"] === "number" ? rec["order"] : Number.MAX_SAFE_INTEGER,
      ...(rec["manual_chapter"] !== undefined
        ? { manual_chapter: rec["manual_chapter"] as number | string }
        : {})
    });
  }
  return phases.sort((a, b) => a.order - b.order);
}

export function handlePlanRollout(args: Record<string, unknown>): ProtocolEnvelope<RolloutData> {
  const orgProfile = typeof args["orgProfile"] === "string" && args["orgProfile"].trim()
    ? args["orgProfile"].trim()
    : undefined;
  const horizon = typeof args["horizon"] === "number" && args["horizon"] > 0 ? args["horizon"] : undefined;

  const ordered: RolloutPhase[] = loadPhases().map((p) => {
    const chapter =
      p.manual_chapter !== undefined ? resolveChapterBundle(String(p.manual_chapter)) : undefined;
    return {
      order: p.order,
      phase_id: p.phase_id,
      label: p.label,
      ...(chapter ? { chapter } : {})
    };
  });

  // horizon caps how many phases the roadmap spans (coverage-preserving via the cursor).
  const offsetArg = args["offset"];
  const page = paginate(
    ordered,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: horizon ?? (typeof args["limit"] === "number" ? (args["limit"] as number) : undefined)
    },
    ordered.length || 1
  );

  const coverage: PageCoverage & { phases: number } = { ...page.coverage, phases: ordered.length };

  /**
   * 0.20.0-beta.39 — BANDA DE OMISSÃO (a classe da b.39: as bandas existiam onde o servidor
   * CALCULA e faltavam onde PROJECTA).
   *
   * O roteiro é uma projecção das FASES do ciclo de vida sobre capítulos, e as fases não
   * cobrem os 15 — cobrem 8. Quem seguisse o roteiro não implementava desenvolvimento
   * seguro nem IaC, e **nada lho dizia**. Não é um defeito da ordem: é o silêncio sobre o
   * que ficou fora. Modelo copiado do `out_of_scope_chapters` do `select` — cada capítulo
   * omitido traz a sua exigência por nível e uma chamada COPIÁVEL para o alcançar.
   */
  const covered = new Set(ordered.map((p) => p.chapter).filter((c): c is string => typeof c === "string"));
  const omitted = chapterSet()
    .filter((c) => !covered.has(c))
    .map((chapter) => ({
      chapter,
      title: chapterTitle(chapter),
      demand_by_level: demandByLevel(chapter),
      reach_with: `get_sbd_toe_chapter_implementation_checklist(chapter="${chapter}")`
    }));
  const mandatoryOmitted = omitted.filter((o) =>
    Object.values(o.demand_by_level).some((d) => d === "obrigatorio")
  );
  const chapters_not_in_roadmap = {
    note:
      "O roteiro projecta as FASES do ciclo de vida sobre capítulos, e as fases NÃO cobrem os 15. " +
      "Estes ficam fora do roteiro — o que não é o mesmo que ficarem fora do Manual: alguns são " +
      "`obrigatorio` ao teu nível. Seguir só o roteiro deixa-os por implementar.",
    count: omitted.length,
    of_total: chapterSet().length,
    mandatory_at_some_level: mandatoryOmitted.length,
    chapters: omitted
  };

  return {
    data: {
      ...(orgProfile
        ? {
            org_profile: {
              value: orgProfile,
              role: "recorded_context",
              affects_result: false,
              note:
                "0.20.0-beta.39: o `orgProfile` é ECOADO, não usado — o roteiro é a ordem das fases " +
                "publicadas e não muda com o perfil da organização. A mesma disciplina do `select` " +
                "(`task_context`: contexto registado, `affects_selection: false`). Se o vires ecoado e " +
                "concluíres que o roteiro foi adaptado a ti, concluíste a mais."
            }
          }
        : {}),
      ...(horizon ? { horizon } : {}),
      phases: page.items,
      totals: { phases: ordered.length, chapters_covered: covered.size, chapters_in_manual: chapterSet().length },
      ...(omitted.length > 0 ? { chapters_not_in_roadmap } : {}),
      model: "phase-ordered-mvp"
    },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "rollout_planner_mvp",
      source_data: "data/publish/runtime/phases.json (phase-order I-2) + chapter mapping",
      note:
        "Phase-ordered rollout MVP: canonical lifecycle phases mapped to manual chapters. " +
        "The dependency DAG is deferred (S-2) — this is a linear order, declared as such; nothing invented. " +
        "0.20.0-beta.39: a cobertura em capítulos é PARCIAL por construção (as fases não cobrem os 15) e o " +
        "que fica fora vem declarado em `chapters_not_in_roadmap` — o roteiro nunca é o âmbito do Manual."
    },
    coverage,
    next: boundAffordances([
      {
        intent: "get the implementation checklist for a phase's chapter",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: "chapter (o capítulo da fase acima)",
        kind: "structural"
      },
      {
        intent: "get the governance/RACI model that drives the rollout",
        tool: "get_sbd_toe_operating_model",
        with: "orgScope",
        kind: "semantic"
      }
    ])
  };
}
