#!/usr/bin/env node

/**
 * sync-bundle — materialize the MCP serving bundle from a Codex build artefact.
 *
 * Pontifex's independent "alignment step" (co-design 2026-06-11). The consumed
 * bundle is the KG BUILD OUTPUT (release_bundle.py), not the git tree — generated
 * artefacts (chunks, indexes) only exist in the built artefact. So this fetches a
 * built artefact + verifies its sha256 before materializing. Dual-source:
 *   --archive <zip>   dev-build / release tarball on disk (+ <zip>.sha256 sidecar)
 *   (release URL fetch can be added later; the digest-verify contract is identical)
 *
 * Usage:
 *   node scripts/sync-bundle.mjs --archive <zip> --tag <kg-tag> [--source dev-build|release] [--dry-run]
 *
 * Always verifies sha256 against the sidecar (or --sha256). Materializes only the
 * bundle-files.json entries (no dynamic traversal). Refreshes consumed-bundle.json
 * (records source + tag + verified sha256 + contract version), then runs the pin
 * verifier. Never writes on --dry-run.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined; };
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const archive = opt("--archive");
const tag = opt("--tag");
const source = opt("--source") ?? "dev-build";
const dryRun = flag("--dry-run");
if (!archive) die("missing --archive <zip>");
if (!tag) die("missing --tag <kg-tag> (exact tag for the pin)");
if (!existsSync(archive)) die(`archive not found: ${archive}`);

// --- 1. verify sha256 against the sidecar ----------------------------------
const sha = createHash("sha256").update(readFileSync(archive)).digest("hex");
const sidecar = opt("--sha256") ?? (() => {
  const s = `${archive.replace(/\.zip$/, "")}.sha256`;
  if (!existsSync(s)) return undefined;
  return readFileSync(s, "utf-8").trim().split(/\s+/)[0];
})();
if (!sidecar) die("no sha256 sidecar found (expected <archive>.sha256) and no --sha256 given");
if (sha !== sidecar) die(`sha256 MISMATCH\n  computed: ${sha}\n  sidecar:  ${sidecar}`);
console.error(`• sha256 verified: ${sha}`);

// --- 2. extract + locate bundle root ---------------------------------------
const staging = mkdtempSync(path.join(tmpdir(), "sbd-sync-"));
try {
  execFileSync("unzip", ["-q", archive, "-d", staging]);
  const roots = readdirSync(staging);
  const bundleRoot = roots.length === 1 && statSync(path.join(staging, roots[0])).isDirectory()
    ? path.join(staging, roots[0])
    : staging;

  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "bundle-files.json"), "utf-8"));

  // --- 3. diff staging vs current ------------------------------------------
  const fileSha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
  const walk = (dir) => {
    const out = [];
    for (const n of existsSync(dir) ? readdirSync(dir) : []) {
      const full = path.join(dir, n);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
    return out;
  };
  let added = 0, changed = 0, unchanged = 0, removed = 0;
  const sample = [];
  const present = [];
  for (const entry of manifest.entries) {
    const srcPath = path.join(bundleRoot, entry.path);
    if (!existsSync(srcPath)) {
      if (entry.optional) { console.error(`• optional absent in artefact: ${entry.path}`); continue; }
      die(`required bundle path absent in artefact: ${entry.path}`);
    }
    present.push(entry);
    const srcFiles = entry.kind === "dir" ? walk(srcPath) : [srcPath];
    const srcRel = new Set(srcFiles.map((f) => path.relative(bundleRoot, f)));
    for (const sf of srcFiles) {
      const rel = path.relative(bundleRoot, sf);
      const target = path.join(repoRoot, rel);
      if (!existsSync(target)) { added++; if (sample.length < 10) sample.push(`+ ${rel}`); }
      else if (fileSha(sf) !== fileSha(target)) { changed++; if (sample.length < 10) sample.push(`~ ${rel}`); }
      else unchanged++;
    }
    if (entry.kind === "dir") {
      for (const lf of walk(path.join(repoRoot, entry.path))) {
        const rel = path.relative(repoRoot, lf);
        if (!srcRel.has(rel)) { removed++; if (sample.length < 10) sample.push(`- ${rel}`); }
      }
    }
  }
  console.error(`• diff vs current data/: +${added} ~${changed} -${removed} =${unchanged}`);
  for (const s of sample) console.error(`    ${s}`);

  // --- 4. gather pin data from staging (BEFORE any write — fail-clean) -----
  const readStaged = (rel, required) => {
    const p = path.join(bundleRoot, rel);
    if (!existsSync(p)) { if (required) die(`required manifest absent in artefact: ${rel}`); return undefined; }
    try { return JSON.parse(readFileSync(p, "utf-8")); } catch (e) { if (required) die(`unreadable manifest ${rel}: ${e.message}`); return undefined; }
  };
  const rm = readStaged("data/reports/run_manifest.json", true);
  const pub = readStaged("data/publish/indexes/publication_manifest.json", true);
  const det = readStaged("data/publish/runtime/deterministic_manifest.json", false);
  const v1 = readStaged("data/publish/runtime/v1/v1_manifest.json", false); // absent post-tripartição
  let contractVersion = "unknown";
  try {
    const cc = readFileSync(path.join(bundleRoot, "docs/operations/consumer_contract.md"), "utf-8");
    contractVersion = (cc.match(/\*\*Version:\*\*\s*(v\d+\.\d+)/) ?? [])[1] ?? "unknown";
  } catch { /* contract not bundled */ }

  if (dryRun) {
    console.error(`\n✓ DRY-RUN — no files written. ${added + changed + removed} change(s) for ${tag}. contract=${contractVersion}, substrate=${pub.substrate_version ?? "?"}.`);
    process.exit(0);
  }

  // --- 5. apply -------------------------------------------------------------
  for (const entry of present) {
    const src = path.join(bundleRoot, entry.path);
    const dest = path.join(repoRoot, entry.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    if (entry.kind === "dir") rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
  }
  console.error(`• materialized ${present.length} bundle entries`);

  // --- 6. write pin ---------------------------------------------------------
  const pinPath = path.join(repoRoot, "consumed-bundle.json");
  const pin = JSON.parse(readFileSync(pinPath, "utf-8"));
  pin.consumer_contract_version = contractVersion;
  pin.substrate_version = pub.substrate_version ?? pin.substrate_version;
  const ontologySrc = det?.ontology_source ?? pub.ontology_source ?? {};
  pin.kg_bundle = {
    release_tag: tag,
    release_sha256: sha,
    source,
    surface_built_at: v1?.build?.generated_at ?? null,
    tag_scheme: /^v\d/.test(tag) ? "semver" : "cycle-aligned",
    synced_at: new Date().toISOString().slice(0, 10),
    artefact: path.basename(archive),
  };
  pin.inputs = {
    manual: { repo: rm.repo_url?.replace("https://github.com/", ""), commit: rm.commit_sha, version: rm.version, generated_at: rm.generated_at },
    ontology: {
      repo: ontologySrc.authoritative_repo ?? pin.inputs?.ontology?.repo ?? null,
      tag: v1?.ontology_anchor?.tag ?? null,
      commit: v1?.ontology_anchor?.expected_commit_sha ?? null,
    },
  };
  writeFileSync(pinPath, JSON.stringify(pin, null, 2) + "\n");
  console.error(`• pin: ${source} ${tag}, contract ${contractVersion}, substrate ${pin.substrate_version}, sha256 ${sha.slice(0, 12)}…`);

  // --- 6. validate ----------------------------------------------------------
  execFileSync("node", [path.join(repoRoot, "scripts", "verify-consumed-bundle.mjs")], { stdio: "inherit" });
  console.error(`\n✓ synced to ${tag}. Run \`npm run check && npm test\` as the smoke-test before committing.`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
