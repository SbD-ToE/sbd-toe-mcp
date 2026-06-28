// RDF projection (v2 / s1)
// Projects the consumed bundle into RDF triples with a PROVISIONAL, local IRI scheme.
// Canonical IRIs are an upstream (ontology) decision — see agentic/planeado/v2-sparql/EPIC.md.
//
// Pure data transform: no engine dependency, no MCP surface, consumed-bundle.json untouched.
// Per-source counts are returned so the gate can prove no source was silently skipped.

import { readFileSync } from "node:fs";

import { resolveAppPath } from "../../config.js";

export const BASE = "https://sbd-toe.dev/v2/";
export const REL = `${BASE}rel/`;

export const iri = (id: string): string => BASE + encodeURIComponent(id);
export const rel = (predicate: string): string => REL + encodeURIComponent(predicate);

/** Inverse of iri() — recovers the entity id from an internal IRI (no-leak boundary). */
export const idFromIri = (term: string): string =>
  term.startsWith(BASE) ? decodeURIComponent(term.slice(BASE.length)) : term;

export interface Triple {
  s: string;
  p: string;
  o: string;
}

export interface ProjectionResult {
  triples: Triple[];
  /** Per-source edge counts (+ `__total__`). Proves coverage; catches data drift. */
  counts: Record<string, number>;
}

const LINK_TABLES = [
  "requirement_control_links",
  "antipattern_requirement_links",
  "antipattern_threat_links",
  "signal_evidence_links",
] as const;

function readJsonl(relPath: string): Record<string, unknown>[] {
  const raw = readFileSync(resolveAppPath(relPath), "utf-8");
  const out: Record<string, unknown>[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) out.push(JSON.parse(trimmed) as Record<string, unknown>);
  }
  return out;
}

/** Defensive collection read: link tables are `{ items: [...] }`, not bare arrays. */
function readCollection(relPath: string): Record<string, unknown>[] {
  const parsed = JSON.parse(readFileSync(resolveAppPath(relPath), "utf-8")) as unknown;
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  const items = (parsed as { items?: unknown }).items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

export function projectBundleToTriples(): ProjectionResult {
  const triples: Triple[] = [];
  const counts: Record<string, number> = {};

  // 1. v1 relations — already SPO ({ subject_id, predicate, object_id })
  let n = 0;
  for (const r of readJsonl("data/publish/runtime/v1/relations.jsonl")) {
    const { subject_id: s, predicate: p, object_id: o } = r;
    if (typeof s === "string" && typeof p === "string" && typeof o === "string") {
      triples.push({ s: iri(s), p: rel(p), o: iri(o) });
      n += 1;
    }
  }
  counts["relations.v1"] = n;

  // 2. link tables — items[]: { source_id, link_type, target_id }
  for (const table of LINK_TABLES) {
    let m = 0;
    for (const item of readCollection(`data/publish/runtime/${table}.json`)) {
      const { source_id: s, target_id: o } = item;
      const p = typeof item.link_type === "string" && item.link_type ? item.link_type : table;
      if (typeof s === "string" && typeof o === "string") {
        triples.push({ s: iri(s), p: rel(p), o: iri(o) });
        m += 1;
      }
    }
    counts[table] = m;
  }

  counts["__total__"] = triples.length;
  return { triples, counts };
}

/** Distinct predicate IRIs present — the single point the canonical upstream scheme will replace. */
export function predicateManifest(triples: Triple[]): string[] {
  return [...new Set(triples.map((t) => t.p))].sort();
}

/** Deterministic N-Triples serialization (for hashing / reproducibility checks). */
export function toNTriples(triples: Triple[]): string {
  return triples.map((t) => `<${t.s}> <${t.p}> <${t.o}> .`).join("\n");
}
