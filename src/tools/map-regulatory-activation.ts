/**
 * map_sbd_toe_regulatory_activation
 *
 * Regulatory lens (Implementation-view family) — the REVERSE of provenance:
 * "framework X → which manual areas to activate". Given a regulatory framework
 * (DORA / NIS2 / CRA / RGPD), groups the published overlay mappings by manual
 * chapter so an agent sees, coverage-preserving, exactly which areas the framework
 * touches and how to act on them.
 *
 * Data = the published overlay mappings (data/publish/overlay/overlay_mappings.jsonl);
 * nothing is invented. Reference implementation of the protocol envelope
 * ({ data, provenance, coverage?, next }).
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { chapterNumber } from "./ontology-loader.js";
import { loadRegulatoryOverlay, type RegulatoryMapping } from "./regulatory-overlay-loader.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import {
  boundAffordances,
  type Affordance,
  type ProtocolEnvelope
} from "../serving/protocol-envelope.js";

export interface ActivatedArea {
  /** Manual chapter id (e.g. "08-iac-infraestrutura"), or "(cross-cutting)". */
  chapter: string;
  /** Number of overlay mappings the framework projects onto this area. */
  mapping_count: number;
  /** Distinct obligations of the framework that touch this area. */
  obligation_count: number;
  /** Mapping counts broken down by target type (Practice/Requirement/Control/…). */
  by_target_type: Record<string, number>;
  /** A representative citation from the framework for this area (first non-empty). */
  example_citation?: string;
}

export interface RegulatoryActivationData {
  framework: { id: string; short_code: string; name: string };
  activated: ActivatedArea[];
  totals: {
    mappings: number;
    obligations: number;
    chapters: number;
  };
}

const CHAPTER_FROM_TARGET = /^(\d{2}-[a-z0-9-]+)/i;

/** Extracts the manual chapter id from a mapping target_id, or null if cross-cutting. */
function chapterOfTarget(targetId: string): string | null {
  const match = CHAPTER_FROM_TARGET.exec(targetId);
  return match?.[1] ?? null;
}

const CROSS_CUTTING = "(cross-cutting)";

function buildAffordances(frameworkShort: string): Affordance[] {
  return boundAffordances([
    {
      intent: "scope the activated areas to a risk level + see active chapters/controls",
      tool: "map_sbd_toe_applicability",
      with: "risk_level (L1/L2/L3); cross-reference the chapters above",
      kind: "semantic"
    },
    {
      intent: "turn an activated chapter into the per-role work to do",
      tool: "get_guide_by_role",
      with: "risk_level + role (and optionally a chapter's role)",
      kind: "semantic"
    },
    {
      intent: "get the security requirements for an activated area",
      tool: "consult_security_requirements",
      with: `risk_level + <=3 concerns from the activated chapters (${frameworkShort})`,
      kind: "structural"
    }
  ]);
}

export function handleMapRegulatoryActivation(
  args: Record<string, unknown>
): ProtocolEnvelope<RegulatoryActivationData> {
  const frameworkArg = typeof args["framework"] === "string" ? args["framework"].trim() : "";
  if (!frameworkArg) {
    throw Object.assign(new Error('The "framework" argument is required.'), {
      rpcError: { code: -32602, message: 'Missing "framework"' }
    });
  }

  const overlay = loadRegulatoryOverlay();
  const knownShort = [...overlay.frameworksByShortCode.keys()].sort();

  if (overlay.status !== "published" || overlay.frameworks.length === 0) {
    throw Object.assign(new Error("Regulatory overlay is not available in this bundle."), {
      rpcError: { code: -32603, message: "overlay unavailable" }
    });
  }

  // Resolve framework: accept short code (DORA), full id (EXT-DORA), case-insensitive.
  const token = frameworkArg.toUpperCase();
  const framework =
    overlay.frameworksByShortCode.get(token) ??
    overlay.frameworksByShortCode.get(token.replace(/^EXT-/, "")) ??
    overlay.frameworksById.get(token) ??
    overlay.frameworksById.get(`EXT-${token}`);
  if (!framework) {
    throw Object.assign(
      new Error(`Unknown framework: "${frameworkArg}". Known frameworks: ${knownShort.join(", ")}.`),
      { rpcError: { code: -32602, message: `Unknown framework: "${frameworkArg}"` } }
    );
  }

  const mappings: RegulatoryMapping[] = overlay.mappings.filter(
    (m) => m.framework_id === framework.framework_id
  );

  // Group by manual chapter (the "which areas to activate" answer).
  const byChapter = new Map<
    string,
    { count: number; obligations: Set<string>; byType: Record<string, number>; citation?: string }
  >();
  for (const m of mappings) {
    const chapter = chapterOfTarget(m.target_id) ?? CROSS_CUTTING;
    const group = byChapter.get(chapter) ?? { count: 0, obligations: new Set<string>(), byType: {} };
    group.count += 1;
    if (m.obligation_id) group.obligations.add(m.obligation_id);
    group.byType[m.target_type] = (group.byType[m.target_type] ?? 0) + 1;
    if (!group.citation && m.citation) group.citation = m.citation;
    byChapter.set(chapter, group);
  }

  // Sort: real chapters by number ascending, cross-cutting last.
  const activated: ActivatedArea[] = [...byChapter.entries()]
    .sort(([a], [b]) => {
      if (a === CROSS_CUTTING) return 1;
      if (b === CROSS_CUTTING) return -1;
      return chapterNumber(a) - chapterNumber(b);
    })
    .map(([chapter, g]) => ({
      chapter,
      mapping_count: g.count,
      obligation_count: g.obligations.size,
      by_target_type: g.byType,
      ...(g.citation ? { example_citation: g.citation } : {})
    }));

  const distinctObligations = new Set(mappings.map((m) => m.obligation_id).filter(Boolean)).size;

  // Coverage-preserving pagination over the activated areas.
  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    activated,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : undefined
    },
    activated.length || 1
  );

  const coverage: PageCoverage & { mappings: number; obligations: number; chapters: number } = {
    ...page.coverage,
    mappings: mappings.length,
    obligations: distinctObligations,
    chapters: activated.length
  };

  return {
    data: {
      framework: {
        id: framework.framework_id,
        short_code: framework.short_code,
        name: framework.name
      },
      activated: page.items,
      totals: {
        mappings: mappings.length,
        obligations: distinctObligations,
        chapters: activated.length
      }
    },
    provenance: {
      content_type: "canonical",
      produced_by: "regulatory_overlay_projection",
      source_data: "data/publish/overlay/overlay_mappings.jsonl + external_frameworks.json",
      note:
        "Reverse-of-provenance lens: the framework's published overlay mappings grouped " +
        "by manual chapter. Counts are the full set (coverage-preserving) — nothing invented."
    },
    coverage,
    next: buildAffordances(framework.short_code)
  };
}
