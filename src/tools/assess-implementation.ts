/**
 * assess_sbd_toe_implementation
 *
 * Progress / "how implemented am I" — measures an org's submitted KPI values against
 * the published per-level thresholds (metrics.json, thresholds_by_level_parsed) and
 * returns posture + gaps. The V3 audit over the KPIs.
 *
 * Tier: OSS, STATELESS self-report — values in, posture out, NOTHING persisted. The
 * tracked/observed mode (progress over time) is the Premium state layer (V3) and is
 * deliberately not implemented here.
 *
 * Grounding: thresholds come from the published bundle; never invented. A KPI with a
 * threshold at the level but no submitted value is `not_reported` (never assumed pass).
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { resolveChapterBundle } from "../serving/chunk-index.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

const VALID_RISK = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK)[number];

interface ParsedThreshold {
  comparable: boolean;
  operator: "gte" | "lte" | "eq" | string;
  value: number;
  unit?: string;
  raw?: string;
}

interface MetricRecord {
  metric_id: string;
  label: string;
  chapter_id?: string;
  thresholds_by_level_parsed?: Record<string, ParsedThreshold | null>;
}

let cachedMetrics: MetricRecord[] | undefined;
function loadMetrics(): MetricRecord[] {
  if (cachedMetrics !== undefined) return cachedMetrics;
  try {
    const parsed = JSON.parse(readFileSync(resolveAppPath("data/publish/runtime/metrics.json"), "utf-8")) as {
      items?: MetricRecord[];
    };
    cachedMetrics = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    cachedMetrics = [];
  }
  return cachedMetrics;
}

function evaluate(value: number, t: ParsedThreshold): boolean {
  switch (t.operator) {
    case "gte":
      return value >= t.value;
    case "lte":
      return value <= t.value;
    case "eq":
      return value === t.value;
    default:
      return false;
  }
}

type KpiStatus = "meets" | "below" | "not_reported" | "not_comparable";

export interface KpiResult {
  metric_id: string;
  label: string;
  chapter?: string;
  threshold_raw?: string;
  threshold_value?: number;
  operator?: string;
  value?: number;
  status: KpiStatus;
}

export interface AssessData {
  risk_level: string;
  posture: "above" | "at" | "below";
  per_kpi: KpiResult[];
  gaps: KpiResult[];
  totals: { applicable: number; meets: number; gaps: number; not_reported: number };
  unknown_metrics: string[];
  mode: "self_report_stateless";
}

export function handleAssessImplementation(args: Record<string, unknown>): ProtocolEnvelope<AssessData> {
  const riskArg = args["risk_level"];
  if (typeof riskArg !== "string" || !(VALID_RISK as readonly string[]).includes(riskArg)) {
    throw Object.assign(new Error(`Invalid risk_level: "${String(riskArg)}". Allowed: L1, L2, L3.`), {
      rpcError: { code: -32602, message: "Invalid risk_level" }
    });
  }
  const riskLevel = riskArg as RiskLevel;

  const kpiValuesArg = args["kpi_values"];
  if (typeof kpiValuesArg !== "object" || kpiValuesArg === null || Array.isArray(kpiValuesArg)) {
    throw Object.assign(new Error('"kpi_values" must be an object mapping metric_id → numeric value.'), {
      rpcError: { code: -32602, message: "Invalid kpi_values" }
    });
  }
  const submitted = new Map<string, number>();
  for (const [k, v] of Object.entries(kpiValuesArg as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) submitted.set(k, v);
  }

  const metrics = loadMetrics();
  const knownIds = new Set(metrics.map((m) => m.metric_id));
  const perKpi: KpiResult[] = [];

  for (const m of metrics) {
    const t = m.thresholds_by_level_parsed?.[riskLevel];
    if (!t) continue; // threshold null / "-" → not applicable at this level (out of scope)

    const chapter = m.chapter_id ? resolveChapterBundle(m.chapter_id) ?? m.chapter_id : undefined;
    const base: KpiResult = {
      metric_id: m.metric_id,
      label: m.label,
      ...(chapter ? { chapter } : {}),
      ...(t.raw ? { threshold_raw: t.raw } : {}),
      threshold_value: t.value,
      operator: t.operator,
      status: "not_reported"
    };

    if (!submitted.has(m.metric_id)) {
      perKpi.push(base);
      continue;
    }
    const value = submitted.get(m.metric_id) as number;
    if (!t.comparable) {
      perKpi.push({ ...base, value, status: "not_comparable" });
      continue;
    }
    perKpi.push({ ...base, value, status: evaluate(value, t) ? "meets" : "below" });
  }

  const applicable = perKpi.length;
  const meets = perKpi.filter((k) => k.status === "meets").length;
  const notReported = perKpi.filter((k) => k.status === "not_reported").length;
  const gaps = perKpi.filter((k) => k.status !== "meets");

  // posture: below if any applicable KPI is unmet/unreported; above if all met AND
  // at least one strictly exceeds its threshold; otherwise at.
  let posture: AssessData["posture"];
  if (gaps.length > 0 || applicable === 0) {
    posture = applicable === 0 ? "below" : "below";
  } else {
    const exceeds = perKpi.some(
      (k) => k.operator === "gte" && k.value !== undefined && k.threshold_value !== undefined && k.value > k.threshold_value
    );
    posture = exceeds ? "above" : "at";
  }

  const unknownMetrics = [...submitted.keys()].filter((id) => !knownIds.has(id));

  return {
    data: {
      risk_level: riskLevel,
      posture,
      per_kpi: perKpi,
      gaps,
      totals: { applicable, meets, gaps: gaps.length, not_reported: notReported },
      unknown_metrics: unknownMetrics,
      mode: "self_report_stateless"
    },
    provenance: {
      content_type: "derived",
      produced_by: "implementation_assessment_self_report",
      source_data: "data/publish/runtime/metrics.json (thresholds_by_level_parsed) + submitted kpi_values",
      note:
        "Stateless self-report (OSS): submitted values compared to published per-level thresholds; " +
        "nothing persisted, nothing invented. A KPI with a threshold but no value is not_reported (never a pass). " +
        "Tracked/observed progress over time is the Premium state layer, not this tool."
    },
    next: boundAffordances([
      {
        intent: "close a gap: get the implementation checklist for the gap's chapter",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: "chapter (from a gap above)",
        kind: "structural"
      },
      {
        intent: "get the level-sharp work for the role that owns the gap",
        tool: "get_guide_by_role",
        with: `risk_level="${riskLevel}", role`,
        kind: "semantic"
      }
    ])
  };
}

/** Test-only: clear the metrics cache. */
export function _resetMetricsCache(): void {
  cachedMetrics = undefined;
}
