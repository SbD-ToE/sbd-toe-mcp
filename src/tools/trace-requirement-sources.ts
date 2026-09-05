/**
 * trace_sbd_toe_requirement_sources — walkthrough estação 3 (0.18.0, contrato v1.17
 * §1.24): a rastreabilidade requisito→fonte SERVIDA a partir das superfícies
 * publicadas pelo Codex — nada é composto nem inventado aqui.
 *
 * Por requisito: fontes DIRECTAS (source_anchors, com proveniência — autoria do
 * Manual) e cadeia COMPENSADA (REQ→CTRL→ACO→fontes, tipo/confiança por salto,
 * rótulo `coverage_compensated`). A distinção nunca se esbate: «cobertura, não
 * autoria» (nota epistémica normativa da ontologia v2.4). Os sem-fonte-declarada
 * aparecem DECLARADOS. Bundles anteriores a kg-2026-09-03 não publicam a
 * superfície — erro declarado, nunca inventado.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { boundAffordances, type Affordance } from "../serving/protocol-envelope.js";

const COVERAGE_PATH = "data/publish/semantic/requirement_source_coverage.jsonl";

interface CoverageMeta {
  counts?: Record<string, number>;
  coverage_rule?: string;
  epistemic_note?: string;
}

let cachedMeta: CoverageMeta | undefined;
let cachedRows: Map<string, Record<string, unknown>> | undefined;

function loadCoverage(): { meta: CoverageMeta; rows: Map<string, Record<string, unknown>> } | null {
  const p = resolveAppPath(COVERAGE_PATH);
  if (!existsSync(p)) return null;
  if (!cachedRows) {
    const lines = readFileSync(p, "utf-8").split("\n").filter((l: string) => l.trim().length > 0);
    const parsed = lines.map((l: string) => JSON.parse(l) as Record<string, unknown>);
    cachedMeta = (parsed[0] && parsed[0]["requirement_id"] === undefined ? (parsed[0] as CoverageMeta) : {}) as CoverageMeta;
    cachedRows = new Map(
      parsed
        .filter((r: Record<string, unknown>) => typeof r["requirement_id"] === "string")
        .map((r: Record<string, unknown>) => [r["requirement_id"] as string, r] as const)
    );
  }
  return { meta: cachedMeta ?? {}, rows: cachedRows };
}

export interface TraceSourcesOutput {
  provenance: {
    kg: string;
    server: string;
    content_type: "canonical";
    produced_by: "requirement_source_trace";
    source_data: string;
    note: string;
  };
  meta: CoverageMeta & { note: string };
  requirements: Array<Record<string, unknown>>;
  /** Ids pedidos sem linha na superfície publicada — declarados, nunca omitidos. */
  unknown_requirement_ids: string[];
  coverage: { total: number; returned: number; offset: number; nextOffset: number | null; hasMore: boolean };
  next: Affordance[];
}

export function handleTraceRequirementSources(args: Record<string, unknown>): TraceSourcesOutput {
  const idsArg = Array.isArray(args["requirement_ids"])
    ? (args["requirement_ids"] as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (idsArg.length === 0) {
    throw Object.assign(new Error('"requirement_ids" é obrigatório (1..50 ids, ex.: ["DEP-001","FIL-002"]).'), {
      rpcError: { code: -32602, message: 'Missing "requirement_ids"' }
    });
  }
  const data = loadCoverage();
  if (!data) {
    throw Object.assign(
      new Error(
        "Superfície requirement_source_coverage não publicada neste bundle (requer kg-2026-09-03 / contrato v1.17 §1.24) — deployment com pin anterior; nada é inventado."
      ),
      { rpcError: { code: -32603, message: "source-coverage surface absent in the pinned bundle" } }
    );
  }
  const includeChains = args["include_chains"] !== false;
  const offset = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limit = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 20;
  const pageIds = idsArg.slice(offset, offset + limit);
  const nextOffset = offset + pageIds.length < idsArg.length ? offset + pageIds.length : null;

  const unknown: string[] = [];
  const requirements: Array<Record<string, unknown>> = [];
  for (const id of pageIds) {
    const row = data.rows.get(id);
    if (!row) { unknown.push(id); continue; }
    const out: Record<string, unknown> = { ...row };
    // `direct` na superfície publicada é {provenance:{file,line,marker…}, source_anchors:[…]}.
    const direct = row["direct"] as { source_anchors?: unknown[] } | undefined;
    out["coverage_status"] =
      Array.isArray(direct?.source_anchors) && direct.source_anchors.length > 0
        ? "direct"
        : row["compensated"]
          ? "coverage_compensated"
          : "no_source_declared";
    if (!includeChains && out["compensated"] && typeof out["compensated"] === "object") {
      const comp = { ...(out["compensated"] as Record<string, unknown>) };
      const chains = comp["chains"];
      comp["chains_count"] = Array.isArray(chains) ? chains.length : 0;
      delete comp["chains"];
      comp["chains_ref"] = "re-chama com include_chains=true para as cadeias completas";
      out["compensated"] = comp;
    }
    requirements.push(out);
  }

  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "canonical",
      produced_by: "requirement_source_trace",
      source_data:
        "data/publish/semantic/requirement_source_coverage.jsonl (pré-composta pelo KG: source_anchors + requirement_control_links × ctrl_acore_alignment × landings ES→ACore)",
      note:
        "Rows servidas VERBATIM da superfície publicada. Directas = autoria do Manual (marcador «Fontes»); compensadas = cobertura por correspondência entre modelos — cobertura, NÃO autoria (nota epistémica da ontologia v2.4). related não cobre."
    },
    meta: {
      ...data.meta,
      note: "counts do bundle: with_direct_anchors / with_compensated_coverage / without_any_source_declared — os sem-fonte estão DECLARADOS, nunca omitidos."
    },
    requirements,
    unknown_requirement_ids: unknown,
    coverage: { total: idsArg.length, returned: pageIds.length - unknown.length, offset, nextOffset, hasMore: nextOffset !== null },
    next: boundAffordances([
      { intent: "resolver um CTRL/ACO da cadeia em detalhe", tool: "resolve_entities", with: 'record_type="control" | "control_objective", filters', kind: "structural" },
      { intent: "provar estes requisitos (lado EXPECTED)", tool: "get_sbd_toe_verification_matrix", with: "risk_level + requirement_ids", kind: "structural" },
      { intent: "ver as cadeias de alinhamento CTRL↔ACore completas destes requisitos", tool: "trace_sbd_toe_requirement_sources", with: "requirement_ids + include_chains=true", kind: "semantic" }
    ])
  };
}

export function _resetTraceSourcesCacheForTests(): void {
  cachedMeta = undefined;
  cachedRows = undefined;
}
