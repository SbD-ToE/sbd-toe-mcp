/**
 * select_sbd_toe_requirements — the MP1 selection operation as a first-class
 * consultive tool (L3, OSS line; G-mp1a decision 1, O2, 2026-08-31).
 *
 * "Estou a desenvolver X com Y — que requisitos se aplicam?" answered by the
 * reference semantics the ontology declares (`requirement_selection_model` v2.2):
 * baseline(cap. 02, by level) ∪ domain chapters activated by the context ⊕ overlay
 * (extend), narrowed by the task's declared signals. Both bands are returned:
 * `selected[]` (with per-item selection_trace) and `narrowed_out[]` (grouped by
 * category, with reason) — never silent. Deterministic; paginated (G1).
 */
import { servedKgReleaseTag } from "../version-info.js";
import { runSelection, type SelectionContextInput, type SelectionResult } from "../serving/selection.js";
import { getRegulatoryOverlay, type RegulatoryObligation } from "./regulatory-overlay-loader.js";
import { selectRequirementsAffordances } from "../serving/affordances.js";
import type { Affordance } from "../serving/protocol-envelope.js";

const DEFAULT_LIMIT = 100;

export interface SelectRequirementsOutput {
  provenance: {
    kg: string;
    content_type: "derived";
    produced_by: "mp1_selection_engine";
    source_data: string;
    note: string;
  };
  risk_level: string;
  selection: {
    selected: SelectionResult["selected"];
    narrowed_out: SelectionResult["narrowed_out"];
    excluded_by_level: SelectionResult["excluded_by_level"];
  };
  basis_summary: SelectionResult["basis_summary"];
  lexical_dominance_warning?: SelectionResult["lexical_dominance_warning"];
  empty_selection_warning?: SelectionResult["empty_selection_warning"];
  context: {
    activated_chapters: SelectionResult["activated_chapters"];
    activated_categories: string[];
  };
  activation_trace: SelectionResult["activation"]["trace"];
  overlay: {
    status: "skipped" | "absent" | "resolved";
    operator: "extend";
    obligations: Array<Pick<RegulatoryObligation, "obligation_id" | "framework_id" | "title">>;
    note: string;
  };
  coverage: {
    total: number;
    returned: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
    narrowed_out_requirements: number;
    excluded_by_level_requirements: number;
  };
  meta: { eligible: number; note: string; notes: string[] };
  next?: Affordance[];
}

export function handleSelectRequirements(args: Record<string, unknown>): SelectRequirementsOutput {
  const risk = args["risk_level"];
  if (risk !== "L1" && risk !== "L2" && risk !== "L3") {
    throw Object.assign(new Error(`Invalid risk_level: "${String(risk)}". Allowed: L1, L2, L3.`), {
      rpcError: { code: -32602, message: `Invalid risk_level: "${String(risk)}"` }
    });
  }
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
  const arr = (k: string) =>
    Array.isArray(args[k]) ? (args[k] as unknown[]).filter((x): x is string => typeof x === "string") : undefined;

  const task = str("task"), stack = str("stack"), exposure = str("exposure"), dataSensitivity = str("data_sensitivity");
  const concerns = arr("concerns"), changedFiles = arr("changed_files"), technologies = arr("technologies");
  const context: SelectionContextInput = {
    risk_level: risk,
    ...(task !== undefined ? { task } : {}),
    ...(stack !== undefined ? { stack } : {}),
    ...(exposure !== undefined ? { exposure } : {}),
    ...(dataSensitivity !== undefined ? { data_sensitivity: dataSensitivity } : {}),
    ...(concerns !== undefined ? { concerns } : {}),
    ...(changedFiles !== undefined ? { changed_files: changedFiles } : {}),
    ...(technologies !== undefined ? { technologies } : {})
  };
  const result = runSelection(context);

  // Overlay — operator `extend` only (the `replace` operator awaits ADR 0014).
  const frameworks = arr("regulatory_frameworks") ?? [];
  const wantsOverlay = args["include_regulatory_overlay"] === true || frameworks.length > 0;
  let overlay: SelectRequirementsOutput["overlay"] = {
    status: "skipped",
    operator: "extend",
    obligations: [],
    note: "Overlay não pedido (include_regulatory_overlay / regulatory_frameworks ausentes)."
  };
  if (wantsOverlay) {
    const data = getRegulatoryOverlay();
    if (data.status === "absent") {
      overlay = { status: "absent", operator: "extend", obligations: [], note: `Overlay regulatório ausente: ${data.absentReason ?? "not published"}.` };
    } else {
      const wanted = new Set(frameworks.map((f) => f.toUpperCase()));
      const obligations = data.obligations
        .filter((o) => wanted.size === 0 || wanted.has(o.framework_id.toUpperCase()) || wanted.has(o.framework_id.replace(/^EXT-/, "").toUpperCase()))
        .map((o) => ({ obligation_id: o.obligation_id, framework_id: o.framework_id, title: o.title }));
      overlay = {
        status: "resolved",
        operator: "extend",
        obligations,
        note: "Operador `extend`: obrigações do overlay ACRESCEM à selecção por categoria; `replace` aguarda o modelo de overlay (ADR 0014)."
      };
    }
  }

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : DEFAULT_LIMIT;
  const page = result.selected.slice(offsetArg, offsetArg + limitArg);
  const nextOffset = offsetArg + page.length < result.selected.length ? offsetArg + page.length : null;

  return {
    provenance: {
      kg: servedKgReleaseTag(),
      content_type: "derived",
      produced_by: "mp1_selection_engine",
      source_data:
        "runtime/requirements.json + ontology requirement_selection_model (v2.2) + review-scope path map + activation lexicon",
      note:
        "Selecção MP1: baseline(cap. 02, nível) ∪ capítulos activados pelo contexto ⊕ overlay(extend), com narrowing " +
        "determinístico e declarado pela tarefa. Cada inclusão tem selection_trace; cada exclusão elegível está em " +
        "narrowed_out com razão — nunca em silêncio. Nada é inventado."
    },
    risk_level: risk,
    selection: { selected: page, narrowed_out: result.narrowed_out, excluded_by_level: result.excluded_by_level },
    context: { activated_chapters: result.activated_chapters, activated_categories: result.activated_categories },
    activation_trace: result.activation.trace,
    overlay,
    basis_summary: result.basis_summary,
    ...(result.empty_selection_warning ? { empty_selection_warning: result.empty_selection_warning } : {}),
    ...(result.lexical_dominance_warning ? { lexical_dominance_warning: result.lexical_dominance_warning } : {}),
    coverage: {
      total: result.selected.length,
      returned: page.length,
      offset: offsetArg,
      nextOffset,
      hasMore: nextOffset !== null,
      excluded_by_level_requirements: result.excluded_by_level.reduce((n, g) => n + g.count, 0),
      narrowed_out_requirements: result.narrowed_out.reduce((n, g) => n + g.count, 0)
    },
    meta: {
      eligible: result.eligible_count,
      note:
        "coverage pagina `selected`; `narrowed_out` vem completo (agrupado por categoria). O veredicto de nível usa o catálogo publicado.",
      notes: result.notes
    },
    next: selectRequirementsAffordances(risk, page.map((x) => x.requirement_id), result.empty_selection_warning?.candidate_concerns ?? result.lexical_dominance_warning?.candidate_concerns)
  };
}
