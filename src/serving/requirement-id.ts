/**
 * requirement-id — the single serving-side source of the requirement identifier
 * grammar (Codex consumer contract v1.10 §1.18) and the declared-gap classification
 * for requirement citations the published bundle cannot resolve.
 *
 * Grammar (contract §1.18, verbatim): `^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$`
 *   - `<CAT>-NNN`      base catalogue form (e.g. AUT-001)
 *   - `REQ-<CAT>-NNN`  namespaced transversal form (e.g. REQ-AGN-001). The category is
 *                      the segment immediately before the number (AGN) — never REQ.
 *
 * Declared gaps (Codex handover 2026-08-29, gap (b)): the Manual carries legacy
 * citations in `REQ-<CAT>-NNN` notation for base requirements (REQ-AUT-003) or for
 * categories that do not exist (DAT, PRI, DOS, IAM, AC). The KG surfaces those
 * literally in chunk_entity_mentions (entity_type Requirement, no entity behind them)
 * instead of resolving them by substring accident to requirements with another meaning.
 * A `manual_item_id → KG` resolution over such a citation must answer «citação legada
 * não resolvível (finding editorial em curso)», never «requisito inexistente».
 * Pontifex exposes the gap; it does not patch the data (AGENTS.md §0.5). Nothing here
 * aliases REQ-AUT-003 to AUT-003 — the contract forbids that reconstruction.
 */

import { existsSync, readFileSync } from "node:fs";
import { getConfig, resolveAppPath } from "../config.js";

/** Contract v1.10 §1.18 grammar — the only requirement_id validator in this server. */
export const REQUIREMENT_ID_PATTERN = /^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$/;

/**
 * Legacy-citation shape: the namespaced notation as the Manual cites it. Deliberately
 * wider than the grammar (2–3 letter category) so `REQ-AC-010` — one of the 21 legacy
 * citations in the Codex handover — is classified as a declared gap, not as noise.
 */
export const LEGACY_REQUIREMENT_CITATION_PATTERN = /^REQ-[A-Z]{2,3}-\d{3}$/;

/** Serving phrase mandated by the Codex handover 2026-08-29 (gap (b)). Cite verbatim. */
export const LEGACY_CITATION_SERVING_PHRASE =
  "citação legada não resolvível (finding editorial em curso)";

export function isRequirementId(value: string): boolean {
  return REQUIREMENT_ID_PATTERN.test(value);
}

export function isLegacyRequirementCitation(value: string): boolean {
  return LEGACY_REQUIREMENT_CITATION_PATTERN.test(value);
}

/**
 * Category = the segment immediately before the number (`REQ-AGN-001` → `AGN`,
 * `AUT-001` → `AUT`). Returns undefined for anything outside the grammar (or the
 * legacy 2-letter citation shape, which is accepted only for gap classification).
 */
export function requirementCategoryOf(id: string): string | undefined {
  const match = /^(?:REQ-)?([A-Z]{2,3})-\d{3}$/.exec(id);
  return match?.[1];
}

export interface RequirementCitations {
  mention_count: number;
  chunk_ids: string[];
  document_ids: string[];
}

export interface RequirementGap {
  requirement_id: string;
  status: "declared_gap";
  kind: "legacy_citation_unresolvable" | "citation_unresolvable";
  note: string;
  cited_in: RequirementCitations;
  routed_to: string;
}

const CITATION_SAMPLE_CAP = 8;
const ROUTED_TO =
  "Manual (correcção editorial) — dispatcher sbd-ai-runtime/handover/em-curso/2026-08-29-orchestrator-to-manual-legacy-req-citations.md; Codex recompila após correcção";

let citationIndex: Map<string, { chunk_ids: Set<string>; document_ids: Set<string> }> | undefined;

function loadCitationIndex(): Map<string, { chunk_ids: Set<string>; document_ids: Set<string> }> {
  if (citationIndex) return citationIndex;
  const index = new Map<string, { chunk_ids: Set<string>; document_ids: Set<string> }>();
  const filePath = resolveAppPath(getConfig().backend.chunkEntityMentionsFile);
  if (existsSync(filePath)) {
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (record["entity_type"] !== "Requirement" || typeof record["entity_id"] !== "string") continue;
      const entityId = record["entity_id"];
      const entry = index.get(entityId) ?? { chunk_ids: new Set<string>(), document_ids: new Set<string>() };
      if (typeof record["chunk_id"] === "string") entry.chunk_ids.add(record["chunk_id"]);
      if (typeof record["document_id"] === "string") entry.document_ids.add(record["document_id"]);
      index.set(entityId, entry);
    }
  }
  citationIndex = index;
  return index;
}

/** Test-only: drop the cached citation index. */
export function _resetRequirementCitationCacheForTests(): void {
  citationIndex = undefined;
}

/**
 * Where the corpus cites a requirement id (chunk_entity_mentions, entity_type
 * Requirement). Counts are mention-chunk pairs as published — never inferred.
 */
export function getRequirementCitations(id: string): RequirementCitations {
  const entry = loadCitationIndex().get(id);
  if (!entry) return { mention_count: 0, chunk_ids: [], document_ids: [] };
  return {
    mention_count: entry.chunk_ids.size,
    chunk_ids: [...entry.chunk_ids].sort().slice(0, CITATION_SAMPLE_CAP),
    document_ids: [...entry.document_ids].sort().slice(0, CITATION_SAMPLE_CAP)
  };
}

/**
 * Classify an unresolved requirement id as a DECLARED gap when the published corpus
 * cites it but the runtime bundle carries no such requirement. Returns undefined when
 * the id is known (no gap), when it is not requirement-shaped, or when nothing in the
 * corpus cites it (a guessed token — the caller keeps its normal fallback).
 */
export function describeRequirementGap(
  id: string,
  knownRequirementIds: ReadonlySet<string>
): RequirementGap | undefined {
  if (knownRequirementIds.has(id)) return undefined;
  const legacy = isLegacyRequirementCitation(id);
  if (!legacy && !isRequirementId(id)) return undefined;

  const cited_in = getRequirementCitations(id);
  if (cited_in.mention_count === 0) return undefined;

  if (legacy) {
    return {
      requirement_id: id,
      status: "declared_gap",
      kind: "legacy_citation_unresolvable",
      note:
        `${LEGACY_CITATION_SERVING_PHRASE} — o Manual cita \`${id}\` na notação legada REQ-<CAT>-NNN ` +
        `(requisito base ou categoria inexistente); o KG surfaced a citação literalmente, sem entidade ` +
        `correspondente e sem a resolver por acidente de substring a outro requisito (contrato v1.10 §1.18). ` +
        `Não é «requisito inexistente»: a correcção editorial pertence ao Manual e está em curso.`,
      cited_in,
      routed_to: ROUTED_TO
    };
  }

  return {
    requirement_id: id,
    status: "declared_gap",
    kind: "citation_unresolvable",
    note:
      `citação não resolvível no bundle publicado — o Manual cita \`${id}\` mas o runtime bundle não carrega ` +
      `esse requisito (surfaced literalmente pelo KG; finding editorial). Não é um requisito servido nem um ` +
      `alias de outro requisito.`,
    cited_in,
    routed_to: ROUTED_TO
  };
}
