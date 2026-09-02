/**
 * get_sbd_toe_operating_model
 *
 * The operating model — RACI, decision-rights, governance cadences, org-model —
 * promoted from the rollout playbook (P-1, exemplo-playbook bundle) into the
 * 'implementation' profile. Retrieval-grounded prose (chunks); serves NOW via v1.4.
 * Implementation-view family. Nothing invented — every section is a published chunk.
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag } from "../version-info.js";
import { filterChunks, type ManualChunk } from "../serving/chunk-index.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

const PLAYBOOK_BUNDLE = "exemplo-playbook";

// Operating-model concerns: governance, RACI, decision rights, cadences, org shape.
const OPERATING_MODEL_RE =
  /raci|governo|governan|reuni|cadenc|decis|organigrama|papel|papéis|responsabil|comit[ée]|modelo de governo|escalon/i;

export interface OperatingModelSection {
  chunk_id: string;
  title: string;
  section_path: string;
  text: string;
}

export interface OperatingModelData {
  org_scope?: string;
  sections: OperatingModelSection[];
  totals: { sections: number };
}

function matchesScope(chunk: ManualChunk, scope: string | undefined): boolean {
  if (!scope) return true;
  const hay = `${chunk.title} ${chunk.section_path} ${chunk.text}`.toLowerCase();
  return hay.includes(scope.toLowerCase());
}

export function handleGetOperatingModel(
  args: Record<string, unknown>
): ProtocolEnvelope<OperatingModelData> {
  const orgScope = typeof args["orgScope"] === "string" && args["orgScope"].trim()
    ? args["orgScope"].trim()
    : undefined;

  const all = filterChunks({ bundle_id: PLAYBOOK_BUNDLE, profile: "implementation" });
  const operating = all
    .filter((c) => OPERATING_MODEL_RE.test(`${c.title} ${c.section_path}`))
    .filter((c) => matchesScope(c, orgScope));

  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    operating,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : 12
    },
    operating.length || 1
  );

  const coverage: PageCoverage & { sections: number } = {
    ...page.coverage,
    sections: operating.length
  };

  // 0.15.1 (item 4): orgScope sem correspondência ⇒ ERRO accionável com a lista de
  // scopes válidos DERIVADA dos dados (padrão generate_skill) — o sucesso-vazio morreu.
  const unfilteredOM = all.filter((c) => OPERATING_MODEL_RE.test(`${c.title} ${c.section_path}`));
  if (orgScope && operating.length === 0) {
    const validTitles = [...new Set(unfilteredOM.map((c) => c.title))].slice(0, 10);
    throw Object.assign(
      new Error(
        `orgScope sem correspondência: "${orgScope}". O filtro é substring sobre título/section_path/texto. Secções válidas (amostra derivada): ${validTitles.join(" | ")}.`
      ),
      { rpcError: { code: -32602, message: `orgScope "${orgScope}" não corresponde a nenhuma secção (filtro substring). Secções válidas (amostra derivada): ${validTitles.join(" | ")}`, data: { valid_section_titles: validTitles } } }
    );
  }

  return {
    data: {
      ...(orgScope ? { org_scope: orgScope } : {}),
      sections: page.items.map((c) => ({
        chunk_id: c.chunk_id,
        title: c.title,
        section_path: c.section_path,
        text: c.text
      })),
      totals: { sections: operating.length }
    },
    provenance: {
      kg: servedKgReleaseTag(),
      content_type: "canonical",
      produced_by: "operating_model_projection",
      source_data: `data/publish/indexes/mcp_chunks.jsonl (bundle=${PLAYBOOK_BUNDLE}, profile=implementation)`,
      note:
        "Retrieval-grounded operating model (RACI / decision-rights / cadences / org-model) " +
        "promoted from the rollout playbook. Prose reference; nothing invented."
    },
    coverage,
    next: boundAffordances([
      {
        intent: "sequence the operating model into a phased rollout",
        tool: "plan_sbd_toe_rollout",
        with: "orgProfile + horizon",
        kind: "semantic"
      },
      {
        intent: "turn a governance role into its per-role security work",
        tool: "get_guide_by_role",
        with: "risk_level + role",
        kind: "semantic"
      }
    ])
  };
}
