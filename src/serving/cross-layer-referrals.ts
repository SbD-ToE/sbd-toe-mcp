/**
 * cross-layer-referrals
 *
 * E5 skeleton (consumer contract v1.3 §1.11, axis D2): typed cross-block referral
 * edges from `data/publish/indexes/cross_layer_referrals.jsonl`. These are the
 * substrate's own typed bridges between blocks (manual → policy, obligation →
 * practice/requirement/control/evidence, playbook → bundle/overlay). The E5
 * coverage-preserving envelope (`resumo + coverage_map + related_blocks`) uses
 * them to populate `related_blocks` without the consumer re-deriving the graph.
 *
 * This module reads and indexes the published surface — it never invents edges.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";

const REFERRALS_PATH = "data/publish/indexes/cross_layer_referrals.jsonl";

export interface CrossLayerReferral {
  referral_id: string;
  referral_type: string;
  source_anchor_id: string;
  source_anchor_type: string;
  source_block: string;
  target_anchor_id: string;
  target_block: string;
  /** How a consumer materializes the target (e.g. `bundle_policy_links.jsonl#target_document_id`). */
  how_to_retrieve: string;
}

interface ReferralIndex {
  all: CrossLayerReferral[];
  bySource: Map<string, CrossLayerReferral[]>;
  bySourceBlock: Map<string, CrossLayerReferral[]>;
}

let _cache: ReferralIndex | undefined;

function strOf(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function loadIndex(): ReferralIndex {
  if (_cache) return _cache;

  const path = resolveAppPath(REFERRALS_PATH);
  const all: CrossLayerReferral[] = existsSync(path)
    ? readFileSync(path, "utf-8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => JSON.parse(line) as Record<string, unknown>)
        .filter((record: Record<string, unknown>) => strOf(record, "referral_id").length > 0)
        .map((record: Record<string, unknown>) => ({
          referral_id: strOf(record, "referral_id"),
          referral_type: strOf(record, "referral_type"),
          source_anchor_id: strOf(record, "source_anchor_id"),
          source_anchor_type: strOf(record, "source_anchor_type"),
          source_block: strOf(record, "source_block"),
          target_anchor_id: strOf(record, "target_anchor_id"),
          target_block: strOf(record, "target_block"),
          how_to_retrieve: strOf(record, "how_to_retrieve"),
        }))
    : [];

  const bySource = new Map<string, CrossLayerReferral[]>();
  const bySourceBlock = new Map<string, CrossLayerReferral[]>();
  for (const referral of all) {
    if (referral.source_anchor_id) {
      const list = bySource.get(referral.source_anchor_id) ?? [];
      list.push(referral);
      bySource.set(referral.source_anchor_id, list);
    }
    if (referral.source_block) {
      const list = bySourceBlock.get(referral.source_block) ?? [];
      list.push(referral);
      bySourceBlock.set(referral.source_block, list);
    }
  }

  _cache = { all, bySource, bySourceBlock };
  return _cache;
}

/** Referral edges originating at a specific source anchor (entity/document). */
export function getReferralsFrom(sourceAnchorId: string): CrossLayerReferral[] {
  return loadIndex().bySource.get(sourceAnchorId) ?? [];
}

/** Referral edges originating in a given block (e.g. a manual chapter id). */
export function getReferralsByBlock(sourceBlock: string): CrossLayerReferral[] {
  return loadIndex().bySourceBlock.get(sourceBlock) ?? [];
}

/** Distinct target blocks reachable from a source anchor — the E5 `related_blocks` seed. */
export function relatedBlocksOf(sourceAnchorId: string): string[] {
  return [
    ...new Set(
      getReferralsFrom(sourceAnchorId)
        .map((referral) => referral.target_block)
        .filter((block) => block.length > 0)
    ),
  ].sort();
}

/** Summary of the loaded referral surface — total + distribution by referral_type. */
export function referralSummary(): { total: number; byType: Record<string, number> } {
  const { all } = loadIndex();
  const byType: Record<string, number> = {};
  for (const referral of all) {
    byType[referral.referral_type] = (byType[referral.referral_type] ?? 0) + 1;
  }
  return { total: all.length, byType };
}

/** Test-only: reset the module cache. */
export function _resetReferralCache(): void {
  _cache = undefined;
}
