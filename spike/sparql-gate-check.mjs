// SPARQL engine spike — gate check for the 0.20 (v2) line.
// Measures the HARD/SOFT gates that gate SPARQL vs the TS fallback:
//   - WASM init (cold-start component), ingest time, query time
//   - determinism (same query twice → identical results, with ORDER BY)
//   - memory (RSS) overhead
// Provisional IRI scheme (local only — canonical IRIs are an upstream decision).
// Does NOT touch the MCP tools. Self-contained.

import { readFileSync } from "node:fs";

const BASE = "https://sbd-toe.dev/v2/";
const REL = BASE + "rel/";
const iri = (id) => BASE + encodeURIComponent(String(id));
const rel = (p) => REL + encodeURIComponent(String(p));

const ms = (t0) => (Number(process.hrtime.bigint() - t0) / 1e6);
const rssMB = () => (process.memoryUsage().rss / 1048576).toFixed(1);

// ---- 1. load the graph (relations.jsonl SPO + link tables) ----
let tBuild = process.hrtime.bigint();
const triples = [];

// v1 relations: { subject_id, predicate, object_id }
for (const line of readFileSync("data/publish/runtime/v1/relations.jsonl", "utf8").split("\n")) {
  const l = line.trim();
  if (!l) continue;
  const r = JSON.parse(l);
  if (r.subject_id && r.predicate && r.object_id) triples.push([iri(r.subject_id), rel(r.predicate), iri(r.object_id)]);
}
// link tables: { source_id, target_id, link_type }
for (const f of [
  "requirement_control_links", "antipattern_requirement_links",
  "antipattern_threat_links", "signal_evidence_links",
]) {
  const rows = JSON.parse(readFileSync(`data/publish/runtime/${f}.json`, "utf8"));
  for (const r of (Array.isArray(rows) ? rows : [])) {
    if (r.source_id && r.target_id) triples.push([iri(r.source_id), rel(r.link_type || f), iri(r.target_id)]);
  }
}
const buildMs = ms(tBuild);

// ---- 2. WASM init (cold-start component) ----
let t = process.hrtime.bigint();
const { Store, namedNode, quad } = await import("oxigraph");
const initMs = ms(t);

// ---- 3. ingest ----
const rssBefore = rssMB();
t = process.hrtime.bigint();
const store = new Store();
for (const [s, p, o] of triples) store.add(quad(namedNode(s), namedNode(p), namedNode(o)));
const ingestMs = ms(t);
const rssAfter = rssMB();

// ---- 4. a real 2-hop join query (objective → mechanism, grouped by slice) ----
const Q = `
  SELECT ?slice ?mech WHERE {
    ?obj <${rel("belongsToSlice")}> ?slice .
    ?obj <${rel("objective_implemented_by_mechanism")}> ?mech .
  } ORDER BY ?slice ?mech`;

t = process.hrtime.bigint();
const r1 = store.query(Q);
const queryMs = ms(t);
const r2 = store.query(Q); // reproducibility
const key = (rows) => rows.map((m) => `${m.get("slice")?.value}|${m.get("mech")?.value}`).join("\n");
const deterministic = key(r1) === key(r2);

console.log("================ SPARQL gate-check (v2 spike) ================");
console.log(`triples (edges)     : ${triples.length}`);
console.log(`build triples       : ${buildMs.toFixed(1)} ms`);
console.log(`WASM init           : ${initMs.toFixed(1)} ms   <-- cold-start component`);
console.log(`ingest into store   : ${ingestMs.toFixed(1)} ms`);
console.log(`query (2-hop join)  : ${queryMs.toFixed(2)} ms   rows=${r1.length}`);
console.log(`determinism (ORDER BY, 2x identical): ${deterministic ? "✅ PASS" : "❌ FAIL"}`);
console.log(`RSS  ${rssBefore}MB -> ${rssAfter}MB  (Δ ${(rssAfter - rssBefore).toFixed(1)}MB)`);
console.log(`sample row          : ${r1[0] ? JSON.stringify({ slice: r1[0].get("slice")?.value, mech: r1[0].get("mech")?.value }) : "(no rows)"}`);
