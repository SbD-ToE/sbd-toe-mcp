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

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { filterChunks, type ManualChunk } from "../serving/chunk-index.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";
import { getRegulatoryOverlay } from "./regulatory-overlay-loader.js";
import { DELIMITATION } from "./get-playbook.js";

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
  org_scope?: { value: string; role: string; affects_result: boolean; note: string };
  /** 0.20.0-beta.39 — a autoridade HERDADA da fonte, nunca carimbada aqui. */
  authority?: {
    tier: string;
    authority_class: string[];
    adoption_status: string[];
    curation_status: string[];
    inherited_from: string;
    note: string;
  };
  delimitation?: string;
  sections: OperatingModelSection[];
  totals: { sections: number };
}

/**
 * 0.20.0-beta.39 — A AUTORIDADE HERDA-SE, NÃO SE CARIMBA.
 *
 * Esta superfície serve chunks do bundle `exemplo-playbook` e carimbava-os
 * `content_type: canonical`, enquanto o `get_sbd_toe_playbook` — a partir da MESMA fonte —
 * os declara `illustrative_overlay` / `example_only` e diz «não os cites como exigência do
 * Manual». A própria nota admitia *promoted from the rollout playbook*: uma superfície
 * PROMOVEU material ilustrativo a canónico, e quem o recebeu levou o organigrama de um
 * exemplo como se fosse exigência.
 *
 * A partir daqui os valores vêm dos registos da fonte. Se os registos discordarem entre si,
 * declaram-se TODOS — o servidor não escolhe qual vale.
 */
function inheritedAuthority(): OperatingModelData["authority"] {
  const overlay = getRegulatoryOverlay();
  const fromBundle = (overlay.playbooks ?? []).filter((p) => p.source_bundle_id === PLAYBOOK_BUNDLE);
  if (fromBundle.length === 0) return undefined;
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => typeof x === "string" && x.length > 0))].sort();
  const authority_class = uniq(fromBundle.map((p) => p.authority_class));
  const adoption_status = uniq(fromBundle.map((p) => p.adoption_status));
  const illustrative = authority_class.every((c) => /illustrative/i.test(c)) && authority_class.length > 0;
  return {
    tier: illustrative ? "illustrative" : "normative",
    authority_class,
    adoption_status,
    curation_status: uniq(fromBundle.map((p) => p.curation_status)),
    inherited_from: `overlay_playbooks.json — os ${fromBundle.length} playbooks do bundle \`${PLAYBOOK_BUNDLE}\``,
    note: illustrative
      ? "EXEMPLO ILUSTRATIVO. Este modelo operacional é UMA forma de organizar o governo, não uma " +
        "exigência do Manual: a fonte declara-o `illustrative_overlay` / `example_only`. **Não o cites " +
        "como exigência do Manual** e não adoptes o organigrama sem o adaptares — o exemplo publicado é " +
        "de uma organização concreta, não um modelo de referência."
      : "Autoridade herdada dos registos da fonte, tal como o `get_sbd_toe_playbook` a declara."
  };
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

  const authority = inheritedAuthority();

  return {
    data: {
      ...(orgScope
        ? {
            org_scope: {
              value: orgScope,
              role: "recorded_filter",
              affects_result: true,
              note:
                "0.20.0-beta.39: ao contrário do `orgProfile` do rollout, este ARGUMENTO FILTRA — é " +
                "substring sobre título/section_path/texto, e um valor sem correspondência devolve erro " +
                "accionável em vez de vazio. Declarado para que o eco não se confunda com o do rollout."
            }
          }
        : {}),
      ...(authority ? { authority } : {}),
      delimitation: DELIMITATION,
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
      server: servingServerVersion(),
      content_type: "canonical",
      produced_by: "operating_model_projection",
      source_data: `data/publish/indexes/mcp_chunks.jsonl (bundle=${PLAYBOOK_BUNDLE}, profile=implementation)`,
      note:
        "Modelo operacional (RACI / direitos de decisão / cadências / organigrama) servido VERBATIM do " +
        "bundle `exemplo-playbook`. **`content_type: canonical` diz que o texto é publicado, não derivado " +
        "— NÃO diz que é exigência do Manual.** A força normativa está na banda `authority`, HERDADA da " +
        "fonte, e aqui ela é ILUSTRATIVA: é o mesmo que o `get_sbd_toe_playbook` declara da mesma fonte. " +
        "0.20.0-beta.39: esta superfície dizia *promoted from the rollout playbook* e servia sem a " +
        "autoridade — promovia um exemplo a exigência. Nada é inventado e nada é PROMOVIDO."
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
