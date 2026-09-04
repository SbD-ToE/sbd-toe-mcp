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

import { servedKgReleaseTag } from "../version-info.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { resolveChapterBundle } from "../serving/chunk-index.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

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
  org_profile?: string;
  horizon?: number;
  phases: RolloutPhase[];
  totals: { phases: number };
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

  return {
    data: {
      ...(orgProfile ? { org_profile: orgProfile } : {}),
      ...(horizon ? { horizon } : {}),
      phases: page.items,
      totals: { phases: ordered.length },
      model: "phase-ordered-mvp"
    },
    provenance: {
      kg: servedKgReleaseTag(),
      content_type: "derived",
      produced_by: "rollout_planner_mvp",
      source_data: "data/publish/runtime/phases.json (phase-order I-2) + chapter mapping",
      note:
        "Phase-ordered rollout MVP: canonical lifecycle phases mapped to manual chapters. " +
        "The dependency DAG is deferred (S-2) — this is a linear order, declared as such; nothing invented."
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
