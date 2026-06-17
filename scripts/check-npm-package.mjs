import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PRIVATE_PATH_PATTERNS = [
  /\/Users\/[^"\s/]+/,
  /\/home\/[^"\s/]+/,
  /\/Volumes\/[^"\s/]+/
];

// Files known to legitimately contain absolute path-like strings used to
// reference upstream provenance (sanitised at copy time).
const PRIVATE_PATH_SCAN_EXEMPT = new Set();

// Files inspected for private path leakage (text artefacts published as data).
const PRIVATE_PATH_SCAN_GLOBS = [
  /^data\/publish\/.*\.(json|jsonl|yaml|md)$/,
  /^data\/reports\/.*\.(json|md)$/
];

const REQUIRED_PATHS = [
  "dist/index.js",
  "dist/tools/prepare-codegen-context.js",
  "dist/tools/g2-runtime-loader.js",
  "dist/tools/regulatory-overlay-loader.js",
  "dist/tools/resolve-entities.js",
  "dist/resources/sbd-toe-resources.js",
  "data/publish/indexes/publication_manifest.json",
  "data/publish/indexes/canonical_chunks.jsonl",
  "data/publish/indexes/mcp_chunks.jsonl",
  "data/publish/indexes/vector_chunks.jsonl",
  "data/publish/indexes/bundle_catalog.jsonl",
  "data/publish/runtime/deterministic_manifest.json",
  "data/publish/runtime/v1/v1_manifest.json",
  "data/publish/runtime/v1/slices.json",
  "data/publish/runtime/v1/control_objectives.json",
  "data/publish/runtime/v1/mechanisms.json",
  "data/publish/runtime/v1/practices.json",
  "data/publish/runtime/v1/artifacts.json",
  "data/publish/runtime/v1/relations.jsonl",
  "data/publish/runtime/v1/manual_rastreabilidade.jsonl",
  "data/publish/overlay/external_frameworks.json",
  "data/publish/overlay/external_obligations.json",
  "data/publish/overlay/overlay_playbooks.json",
  "data/publish/overlay/overlay_mappings.jsonl",
  "data/publish/overlay/framework_overlay_index.json",
  "data/publish/sbd-toe-index-compact.json",
  "data/publish/ontology/appsec-core-ontology.yaml",
  "data/publish/ontology/sbdtoe-ontology.yaml",
  "prompts/sbd-toe-chat-system.md",
  "prompts/sbd-toe-grounded-codegen.md"
];

// Specific data/entities/ side-files the serving layer consumes (US-detail join);
// allowed despite the blanket data/entities/ ban on raw entity dumps.
const ALLOWED_DESPITE_PREFIX = [
  "data/entities/proportionality.json",
  "data/entities/sdlc_integration.json"
];

const BANNED_PREFIXES = [
  "data/entities/",
  "data/publish/algolia_",
  "data/publish/semantic/",
  "data/publish/overlay/p2v2_round_1/",
  "data/upstream/",
  "release/"
];

const BANNED_PATHS = [
  "dist/tools/generate-document.js",
  "dist/tools/generate-document.d.ts",
  "dist/tools/generate-document.js.map",
  "data/publish/indexes/bundle_documents.jsonl",
  "data/publish/indexes/bundle_policy_links.jsonl",
  "data/publish/indexes/metric_catalog.jsonl",
  "data/publish/indexes/metric_rollups.jsonl",
  "data/publish/indexes/ontology_discovery_units.jsonl"
];

async function main() {
  const tempCacheDir = await mkdtemp(path.join(os.tmpdir(), "sbd-toe-npm-cache-"));

  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["pack", "--dry-run", "--json"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          npm_config_cache: tempCacheDir
        }
      }
    );

    const parsed = JSON.parse(stdout);
    const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
    const files = Array.isArray(packResult?.files)
      ? packResult.files
          .map((entry) => (typeof entry?.path === "string" ? entry.path : undefined))
          .filter((entry) => typeof entry === "string")
      : [];

    const missing = REQUIRED_PATHS.filter((requiredPath) => !files.includes(requiredPath));
    if (missing.length > 0) {
      throw new Error(`npm package missing required paths: ${missing.join(", ")}`);
    }

    const bannedMatches = files.filter(
      (filePath) =>
        !ALLOWED_DESPITE_PREFIX.includes(filePath) &&
        (BANNED_PATHS.includes(filePath) ||
          BANNED_PREFIXES.some((prefix) => filePath.startsWith(prefix)))
    );
    if (bannedMatches.length > 0) {
      throw new Error(`npm package contains banned paths: ${bannedMatches.join(", ")}`);
    }

    const leakReports = [];
    for (const filePath of files) {
      if (PRIVATE_PATH_SCAN_EXEMPT.has(filePath)) continue;
      const matchesGlob = PRIVATE_PATH_SCAN_GLOBS.some((rx) => rx.test(filePath));
      if (!matchesGlob) continue;
      let contents;
      try {
        contents = await readFile(path.join(process.cwd(), filePath), "utf8");
      } catch {
        continue;
      }
      for (const pattern of PRIVATE_PATH_PATTERNS) {
        const match = contents.match(pattern);
        if (match) {
          leakReports.push(`${filePath}: '${match[0]}'`);
          break;
        }
      }
    }
    if (leakReports.length > 0) {
      throw new Error(
        `npm package leaks private absolute paths in published artefacts:\n  - ${leakReports.join(
          "\n  - "
        )}`
      );
    }

    process.stdout.write(
      `npm package check OK: ${files.length} files, ${packResult?.size ?? "unknown"} bytes tarball, no private-path leaks\n`
    );
  } finally {
    await rm(tempCacheDir, { recursive: true, force: true });
  }
}

await main();
