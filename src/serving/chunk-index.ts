/**
 * chunk-index — read-side access to the published mcp_chunks surface.
 *
 * The implementation-view content tools (chapter-implementation-checklist,
 * operating-model, rollout) are **retrieval-grounded**: they serve prose from the
 * manual's chunk layer, classified by `support_profiles` (the 'implementation'
 * profile is the V5 promotion) and `chunk_kind`. This loader reads
 * data/publish/indexes/mcp_chunks.jsonl once (cached) and offers small filters.
 * It never invents content — every served item is a published chunk.
 */

import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import type { SizeEstimate } from "./response-shaping.js";

export interface ManualChunk {
  chunk_id: string;
  bundle_id: string;
  chunk_kind: string;
  document_id: string;
  document_role: string;
  support_profiles: string[];
  section_path: string;
  title: string;
  text: string;
  size_estimate?: SizeEstimate | undefined;
  traceability?: { source_path?: string; line_start?: number; line_end?: number } | undefined;
}

let cached: ManualChunk[] | undefined;

function strField(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  if (typeof v === "string") return v;
  // section_path is published as an array of breadcrumb segments — join it.
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string").join(" / ");
  return "";
}

export function loadChunkIndex(): ManualChunk[] {
  if (cached !== undefined) return cached;
  let raw: string;
  try {
    raw = readFileSync(resolveAppPath("data/publish/indexes/mcp_chunks.jsonl"), "utf-8");
  } catch {
    cached = [];
    return cached;
  }
  const chunks: ManualChunk[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const profiles = Array.isArray(rec["support_profiles"])
      ? (rec["support_profiles"] as unknown[]).filter((p): p is string => typeof p === "string")
      : typeof rec["support_profiles"] === "string"
        ? (rec["support_profiles"] as string).split("|").filter(Boolean)
        : [];
    chunks.push({
      chunk_id: strField(rec, "chunk_id"),
      bundle_id: strField(rec, "bundle_id"),
      chunk_kind: strField(rec, "chunk_kind"),
      document_id: strField(rec, "document_id"),
      document_role: strField(rec, "document_role"),
      support_profiles: profiles,
      section_path: strField(rec, "section_path"),
      title: strField(rec, "title"),
      text: strField(rec, "text"),
      ...(rec["size_estimate"] && typeof rec["size_estimate"] === "object"
        ? { size_estimate: rec["size_estimate"] as SizeEstimate }
        : {}),
      ...(rec["traceability"] && typeof rec["traceability"] === "object"
        ? { traceability: rec["traceability"] as ManualChunk["traceability"] }
        : {})
    });
  }
  cached = chunks;
  return cached;
}

export interface ChunkFilter {
  bundle_id?: string;
  profile?: string;
  chunk_kinds?: string[];
}

export function filterChunks(filter: ChunkFilter): ManualChunk[] {
  return loadChunkIndex().filter((c) => {
    if (filter.bundle_id !== undefined && c.bundle_id !== filter.bundle_id) return false;
    if (filter.profile !== undefined && !c.support_profiles.includes(filter.profile)) return false;
    if (filter.chunk_kinds !== undefined && !filter.chunk_kinds.includes(c.chunk_kind)) return false;
    return true;
  });
}

/** Distinct chapter-shaped bundle ids ("NN-...") present in the chunk surface. */
export function chapterBundleIds(): string[] {
  const ids = new Set<string>();
  for (const c of loadChunkIndex()) {
    if (/^\d{2}-/.test(c.bundle_id)) ids.add(c.bundle_id);
  }
  return [...ids].sort();
}

/**
 * Resolve a chapter argument (id "08-iac-infraestrutura", number "8"/"08") to a
 * chapter bundle_id present in the surface. Returns undefined if unresolved.
 */
export function resolveChapterBundle(arg: string): string | undefined {
  const all = chapterBundleIds();
  const trimmed = arg.trim();
  if (all.includes(trimmed)) return trimmed;
  const num = /^(\d{1,2})$/.exec(trimmed);
  if (num?.[1]) {
    const padded = num[1].padStart(2, "0");
    return all.find((id) => id.startsWith(`${padded}-`));
  }
  const lower = trimmed.toLowerCase();
  return all.find((id) => id === lower || id.endsWith(`-${lower}`));
}

/** Test-only: clear the module cache. */
export function _resetChunkIndexCache(): void {
  cached = undefined;
}
