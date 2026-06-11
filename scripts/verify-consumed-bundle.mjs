#!/usr/bin/env node

/**
 * Verify the consumed-bundle pin (consumed-bundle.json) against the substrate
 * actually present in data/. Materializes the §0.6 "explicit pin always" rule
 * and the Pontifex side of the bundle-alignment co-design (2026-06-11): the pin
 * is the ground truth of what the MCP serves, and this verifier fails CI if the
 * pin drifts from the shipped bundle.
 *
 * Usage: node scripts/verify-consumed-bundle.mjs
 *
 * What it checks (verified, never invented):
 *  - pin schema: required fields present
 *  - inputs.manual.commit/version match data/reports/run_manifest.json
 *  - inputs.ontology.tag/commit match the v1 manifest ontology_anchor
 *  - kg_bundle.surface_built_at matches the v1 manifest build timestamp
 *  - when kg_bundle.release_sha256 is set, it must be a 64-hex string (full
 *    sidecar verification activates once Codex provides the release artefact)
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const projectRoot = join(fileURLToPath(import.meta.url), "..", "..");
const read = (rel) => JSON.parse(readFileSync(join(projectRoot, rel), "utf-8"));

const errors = [];
const notes = [];
const fail = (msg) => errors.push(msg);

let pin;
try {
  pin = read("consumed-bundle.json");
} catch (e) {
  console.error(`[consumed-bundle] cannot read consumed-bundle.json: ${e.message}`);
  process.exit(1);
}

// --- schema ----------------------------------------------------------------
for (const key of ["pin_version", "consumer_contract_version", "substrate_version", "kg_bundle", "inputs"]) {
  if (pin[key] === undefined) fail(`missing required pin field: ${key}`);
}
if (pin.inputs && (!pin.inputs.manual || !pin.inputs.ontology)) {
  fail("pin.inputs must declare both `manual` and `ontology`");
}

// --- manual provenance vs run_manifest -------------------------------------
const runManifestPath = "data/reports/run_manifest.json";
if (existsSync(join(projectRoot, runManifestPath))) {
  const rm = read(runManifestPath);
  const m = pin.inputs?.manual ?? {};
  if (m.commit !== rm.commit_sha) {
    fail(`manual.commit drift: pin=${m.commit} bundle=${rm.commit_sha}`);
  }
  if (m.version !== rm.version) {
    fail(`manual.version drift: pin=${m.version} bundle=${rm.version}`);
  }
} else {
  notes.push(`${runManifestPath} absent — skipped manual provenance check`);
}

// --- ontology + surface provenance vs v1 manifest --------------------------
const v1ManifestPath = "data/publish/runtime/v1/v1_manifest.json";
if (existsSync(join(projectRoot, v1ManifestPath))) {
  const v1 = read(v1ManifestPath);
  const anchor = v1.ontology_anchor ?? {};
  const o = pin.inputs?.ontology ?? {};
  if (o.tag !== anchor.tag) {
    fail(`ontology.tag drift: pin=${o.tag} bundle=${anchor.tag}`);
  }
  if (o.commit !== anchor.expected_commit_sha) {
    fail(`ontology.commit drift: pin=${o.commit} bundle=${anchor.expected_commit_sha}`);
  }
  const builtAt = v1.build?.generated_at;
  if (builtAt && pin.kg_bundle?.surface_built_at !== builtAt) {
    fail(`kg_bundle.surface_built_at drift: pin=${pin.kg_bundle?.surface_built_at} bundle=${builtAt}`);
  }
} else {
  notes.push(`${v1ManifestPath} absent — skipped ontology/surface provenance check`);
}

// --- release tag / sha256 (Codex-owned) ------------------------------------
const { release_tag: tag, release_sha256: sha } = pin.kg_bundle ?? {};
if (tag === null) {
  notes.push("kg_bundle.release_tag still null — pending Codex pin answer. Provenance pin is partial.");
} else if (typeof tag !== "string" || tag.length === 0) {
  fail("kg_bundle.release_tag must be a non-empty string when set");
} else if (sha === null) {
  notes.push(`kg_bundle.release_tag pinned (${tag}); release_sha256 pending the Codex release .sha256 sidecar. Pin is tag-complete, digest-pending.`);
} else if (typeof sha !== "string" || !/^[0-9a-f]{64}$/.test(sha)) {
  fail(`kg_bundle.release_sha256 must be a 64-hex string when set, got: ${sha}`);
}
// TODO(once Codex ships the release sidecar): verify the bundle digest against
// `<release>.sha256` before treating the pin as fully aligned (digest-verified).

// --- report ----------------------------------------------------------------
for (const n of notes) console.error(`[consumed-bundle] note: ${n}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`[consumed-bundle] DRIFT: ${e}`);
  console.error(`\n❌ consumed-bundle.json is out of sync with the shipped substrate (${errors.length} issue(s)).`);
  process.exit(1);
}
console.error("✅ consumed-bundle.json pin matches the shipped substrate (release tag/sha256 pending Codex).");
