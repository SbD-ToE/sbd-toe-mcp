/**
 * coverage-envelope
 *
 * The consumer contract v1.3 §1.12 coverage-preserving envelope:
 *
 *   resumo + coverage_map[{ id, label, block, size_estimate, retrieval_handle }]
 *          + related_blocks
 *
 * Lets a consumer see *everything* a retrieval covers — and how big each item is
 * and how to fetch it — without pulling every body. The coverage_map is itself
 * paginated (coverage-preserving: walk `coverage.nextOffset` for the rest), and
 * `related_blocks` come from the substrate's typed cross-block referrals (§1.11).
 *
 * Pure assembly over already-resolved chunk records; it never invents content.
 */

import {
  paginate,
  readSizeEstimate,
  type PageCoverage,
  type PageRequest,
  type SizeEstimate,
} from "./response-shaping.js";
import { relatedBlocksOf, getReferralsByBlock } from "./cross-layer-referrals.js";

export interface CoverageMapEntry {
  /** Stable id of the item (chunk_id). */
  id: string;
  /** Human label (title). */
  label: string;
  /** Block the item belongs to (bundle_id). */
  block: string;
  /** Size of the item's body, contract v1.3 §1.12 shape. */
  size_estimate: SizeEstimate;
  /** Opaque handle a consumer uses to fetch the full body. */
  retrieval_handle: string;
}

export interface CoverageEnvelope {
  resumo: {
    /** Total items covered (across all pages). */
    total: number;
    /** Items in this page's coverage_map. */
    returned: number;
    /** Distinct blocks spanned by the full coverage. */
    blocks: string[];
    /** Summed size estimate of the full coverage (not just this page). */
    total_size_estimate: SizeEstimate;
  };
  coverage_map: CoverageMapEntry[];
  /** Page cursor over coverage_map (coverage-preserving). */
  coverage: PageCoverage;
  /** Distinct blocks reachable via typed cross-block referrals from this page. */
  related_blocks: string[];
}

function strOf(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function toEntry(chunk: Record<string, unknown>): CoverageMapEntry {
  const id = strOf(chunk, "chunk_id") || strOf(chunk, "record_id") || strOf(chunk, "id");
  const block = strOf(chunk, "bundle_id") || strOf(chunk, "block");
  return {
    id,
    label: strOf(chunk, "title"),
    block,
    size_estimate: readSizeEstimate(chunk),
    retrieval_handle: id ? `mcp_chunks.jsonl#${id}` : "",
  };
}

/**
 * Build the coverage-preserving envelope over `chunks`. `request` paginates the
 * coverage_map; `resumo` and `related_blocks` are computed over the full set so
 * the consumer always sees true totals even on page 1.
 */
export function buildCoverageEnvelope(
  chunks: readonly Record<string, unknown>[],
  request: PageRequest = {}
): CoverageEnvelope {
  const source = Array.isArray(chunks) ? chunks : [];
  const entries = source.map(toEntry);

  const totalSize = entries.reduce<SizeEstimate>(
    (acc, entry) => ({
      chars: acc.chars + entry.size_estimate.chars,
      approx_tokens: acc.approx_tokens + entry.size_estimate.approx_tokens,
    }),
    { chars: 0, approx_tokens: 0 }
  );
  const allBlocks = [...new Set(entries.map((entry) => entry.block).filter((block) => block.length > 0))].sort();

  const page = paginate(entries, request);

  // related_blocks: typed cross-block referrals out of this page's blocks/items,
  // minus the blocks already covered — the E5 "what else is connected" seed.
  const covered = new Set(allBlocks);
  const related = new Set<string>();
  for (const entry of page.items) {
    for (const block of relatedBlocksOf(entry.id)) if (!covered.has(block)) related.add(block);
    for (const referral of getReferralsByBlock(entry.block)) {
      if (referral.target_block && !covered.has(referral.target_block)) related.add(referral.target_block);
    }
  }

  return {
    resumo: {
      total: entries.length,
      returned: page.items.length,
      blocks: allBlocks,
      total_size_estimate: totalSize,
    },
    coverage_map: page.items,
    coverage: page.coverage,
    related_blocks: [...related].sort(),
  };
}
