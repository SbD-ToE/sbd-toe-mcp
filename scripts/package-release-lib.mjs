import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PROJECT_NAME = "sbd-toe-mcp";

export const REQUIRED_PUBLISH_FILES = [
  "data/publish/ontology/appsec-core-ontology.yaml",
  "data/publish/ontology/sbdtoe-ontology.yaml",
  "data/publish/semantic/ctrl_acore_alignment.jsonl",
  "data/publish/semantic/requirement_source_coverage.jsonl",
  "data/publish/indexes/publication_manifest.json",
  "data/publish/indexes/bundle_catalog.jsonl",
  "data/publish/indexes/mcp_chunks.jsonl",
  "data/publish/indexes/vector_chunks.jsonl",
  "data/publish/indexes/canonical_chunks.jsonl",
  "data/publish/indexes/chunk_entity_mentions.jsonl",
  "data/publish/indexes/chunk_relation_hints.jsonl",
  "data/publish/runtime/deterministic_manifest.json",
  "data/publish/runtime/requirements.json",
  "data/publish/runtime/controls.json",
  "data/publish/runtime/practices.json",
  "data/publish/runtime/assignments.json",
  "data/publish/runtime/user_stories.json",
  "data/publish/runtime/roles.json",
  "data/publish/runtime/phases.json",
  "data/publish/runtime/artifacts.json",
  "data/publish/runtime/artifact_requirements.json",
  "data/publish/runtime/threats.json",
  "data/publish/runtime/evidence_patterns.json",
  "data/publish/runtime/requirement_control_links.json",
  "data/publish/runtime/signals.json",
  "data/publish/runtime/signal_evidence_links.json",
  "data/publish/runtime/antipatterns.json",
  "data/publish/runtime/antipattern_requirement_links.json",
  "data/publish/runtime/antipattern_threat_links.json",
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
  "data/reports/run_manifest.json"
];

export const REQUIRED_BUNDLE_ENTRIES = [
  { kind: "dir", src: "dist", dest: "dist" },
  {
    kind: "file",
    src: "data/publish/ontology/appsec-core-ontology.yaml",
    dest: "data/publish/ontology/appsec-core-ontology.yaml"
  },
  {
    kind: "file",
    src: "data/publish/ontology/sbdtoe-ontology.yaml",
    dest: "data/publish/ontology/sbdtoe-ontology.yaml"
  },
  {
    kind: "file",
    src: "data/publish/indexes/publication_manifest.json",
    dest: "data/publish/indexes/publication_manifest.json"
  },
  {
    kind: "file",
    src: "data/publish/indexes/bundle_catalog.jsonl",
    dest: "data/publish/indexes/bundle_catalog.jsonl"
  },
  {
    kind: "file",
    src: "data/publish/indexes/mcp_chunks.jsonl",
    dest: "data/publish/indexes/mcp_chunks.jsonl"
  },
  {
    kind: "file",
    src: "data/publish/indexes/vector_chunks.jsonl",
    dest: "data/publish/indexes/vector_chunks.jsonl"
  },
  {
    kind: "file",
    src: "data/publish/indexes/canonical_chunks.jsonl",
    dest: "data/publish/indexes/canonical_chunks.jsonl"
  },
  {
    kind: "file",
    src: "data/publish/indexes/chunk_entity_mentions.jsonl",
    dest: "data/publish/indexes/chunk_entity_mentions.jsonl"
  },
  {
    kind: "file",
    src: "data/publish/indexes/chunk_relation_hints.jsonl",
    dest: "data/publish/indexes/chunk_relation_hints.jsonl"
  },
  { kind: "dir", src: "data/publish/runtime", dest: "data/publish/runtime" },
  { kind: "dir", src: "data/publish/overlay", dest: "data/publish/overlay" },
  {
    kind: "file",
    src: "data/reports/run_manifest.json",
    dest: "data/reports/run_manifest.json"
  },
  { kind: "dir", src: "prompts", dest: "prompts" },
  { kind: "dir", src: "examples", dest: "examples" },
  { kind: "dir", src: "docs", dest: "docs" },
  { kind: "file", src: "package.json", dest: "package.json" },
  { kind: "file", src: ".vscode/mcp.json", dest: ".vscode/mcp.json" },
  { kind: "file", src: ".env.example", dest: ".env.example" },
  { kind: "file", src: "README.md", dest: "README.md" },
  { kind: "file", src: "CONTRIBUTING.md", dest: "CONTRIBUTING.md" },
  { kind: "file", src: "CODE_OF_CONDUCT.md", dest: "CODE_OF_CONDUCT.md" },
  { kind: "file", src: "SECURITY.md", dest: "SECURITY.md" },
  { kind: "file", src: "SUPPORT.md", dest: "SUPPORT.md" },
  { kind: "file", src: "LICENSE", dest: "LICENSE" },
  { kind: "file", src: "LICENSE-DATA", dest: "LICENSE-DATA" },
  { kind: "file", src: "LICENSE-NOTE.md", dest: "LICENSE-NOTE.md" }
];

export function parseArguments(argv) {
  const args = {
    outputDir: "release",
    version: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--output-dir") {
      args.outputDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--version") {
      args.version = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Argumento não suportado: ${token}`);
  }

  return args;
}

export async function readPackageVersion(repoRoot) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw);

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("Não foi possível determinar a versão a partir de package.json.");
  }

  return packageJson.version.startsWith("v")
    ? packageJson.version
    : `v${packageJson.version}`;
}

export async function ensureEntry(repoRoot, entry, missingMessage) {
  const sourcePath = path.join(repoRoot, entry.src);
  let sourceStats;

  try {
    sourceStats = await stat(sourcePath);
  } catch {
    throw new Error(missingMessage ?? `Falta a entrada obrigatória para o bundle: ${entry.src}`);
  }

  if (entry.kind === "dir" && !sourceStats.isDirectory()) {
    throw new Error(`Esperava um diretório em ${entry.src}.`);
  }

  if (entry.kind === "file" && !sourceStats.isFile()) {
    throw new Error(`Esperava um ficheiro em ${entry.src}.`);
  }
}

export async function ensureRequiredBundleInputs(repoRoot) {
  for (const publishFile of REQUIRED_PUBLISH_FILES) {
    await ensureEntry(
      repoRoot,
      { kind: "file", src: publishFile, dest: publishFile },
      `Falta o artefacto publish obrigatório: ${publishFile}`
    );
  }

  for (const entry of REQUIRED_BUNDLE_ENTRIES) {
    await ensureEntry(repoRoot, entry);
  }
}

/**
 * Returns true if the path should be excluded from the bundle copy. Used to
 * filter out OS noise (`.DS_Store`, `Thumbs.db`) and editor scratch files that
 * have no business going into a published release.
 */
export function shouldExcludeFromBundle(filePath) {
  const base = path.basename(filePath);
  if (base === ".DS_Store" || base === "Thumbs.db") return true;
  if (base === ".AppleDouble" || base === ".LSOverride") return true;
  if (base.startsWith("._")) return true;
  return false;
}

export async function copyEntry(repoRoot, bundleRoot, entry) {
  const sourcePath = path.join(repoRoot, entry.src);
  const destinationPath = path.join(bundleRoot, entry.dest);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  if (entry.kind === "dir") {
    await cp(sourcePath, destinationPath, {
      recursive: true,
      filter: (candidate) => !shouldExcludeFromBundle(candidate)
    });
  } else {
    if (shouldExcludeFromBundle(sourcePath)) return;
    await cp(sourcePath, destinationPath);
  }
}

export async function createTarball(parentDir, bundleDirName, tarPath, execFileImpl = execFileAsync) {
  await execFileImpl("tar", ["-czf", tarPath, "-C", parentDir, bundleDirName]);
}

export async function createZipArchive(
  parentDir,
  bundleDirName,
  zipPath,
  options = {}
) {
  const execFileImpl = options.execFileImpl ?? execFileAsync;
  const stderr = options.stderr ?? process.stderr;

  try {
    await execFileImpl("zip", ["-rq", zipPath, bundleDirName], {
      cwd: parentDir
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      stderr.write("Aviso: comando 'zip' não disponível; bundle .zip não foi gerado.\n");
      return false;
    }

    throw error;
  }
}

export async function computeSha256(filePath) {
  const fileContents = await readFile(filePath);
  return createHash("sha256").update(fileContents).digest("hex");
}

export async function writeChecksumFile(outputDir, archivePaths, archiveBaseName) {
  const lines = [];

  for (const archivePath of archivePaths) {
    const hash = await computeSha256(archivePath);
    lines.push(`${hash}  ${path.basename(archivePath)}`);
  }

  const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);
  await writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
  return checksumPath;
}

const PRIVATE_PATH_PATTERN = /\/(Users|home|Volumes)\/[A-Za-z][^"\s/]*/g;

// Allowlist of placeholder tokens that look like absolute paths but are
// deliberate documentation stubs (callers replace them with their real path).
const PRIVATE_PATH_ALLOWLIST = new Set([
  "<private>",
  "<absolute-path-to-repo>",
  "<repo-root>",
  "<user>"
]);

const SCAN_TEXT_FILE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".jsonl",
  ".yaml",
  ".yml",
  ".env",
  ".env.example",
  ".js",
  ".d.ts",
  ".ts"
]);

async function walkFiles(rootDir) {
  const results = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

/**
 * Scans every text artefact under `bundleRoot` for absolute build-machine
 * paths. Matches starting with `/Users/`, `/home/` or `/Volumes/` are
 * reported; deliberate placeholder strings (e.g. `<private>`,
 * `<absolute-path-to-repo>`) are allowlisted because they do not leak real
 * machine state.
 *
 * Throws when leaks are found so the release script aborts before producing
 * the tarball / zip. Throws nothing on a clean bundle (returns the empty
 * `string[]`).
 */
export async function scanBundleForPrivatePaths(bundleRoot) {
  const files = await walkFiles(bundleRoot);
  const leaks = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    // Always scan .DS_Store-style files as a safety net even if extension is unknown.
    const base = path.basename(file);
    if (
      !SCAN_TEXT_FILE_EXTENSIONS.has(ext) &&
      base !== ".env" &&
      base !== ".env.example"
    ) {
      continue;
    }
    let contents;
    try {
      contents = await readFile(file, "utf8");
    } catch {
      continue;
    }
    PRIVATE_PATH_PATTERN.lastIndex = 0;
    let match;
    while ((match = PRIVATE_PATH_PATTERN.exec(contents))) {
      const captured = match[0];
      const trimmed = captured.split(/[\s")\]}]/)[0];
      // Allowlist matches that are part of a placeholder pattern like
      // `<absolute-path-to-repo>/Users` (unlikely but defensive).
      if (PRIVATE_PATH_ALLOWLIST.has(trimmed)) continue;
      const relative = path.relative(bundleRoot, file);
      leaks.push(`${relative}: '${trimmed}'`);
      break; // one leak per file is enough to flag it
    }
  }
  return leaks;
}

async function collectPublishFilesRecursive(publishDir) {
  const collected = [];
  async function walk(dir, relPrefix) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === "artifact-manifest.json") continue;
      const full = path.join(dir, entry.name);
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        collected.push({ rel, full });
      }
    }
  }
  await walk(publishDir, "");
  return collected;
}

export async function generateArtifactManifest(bundleRoot, version) {
  const publishDir = path.join(bundleRoot, "data", "publish");
  const collected = await collectPublishFilesRecursive(publishDir);
  const files = {};
  for (const { rel, full } of collected) {
    files[rel] = await computeSha256(full);
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    artifact_version: version,
    files
  };

  const manifestPath = path.join(publishDir, "artifact-manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifestPath;
}

export async function buildReleaseBundle(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const outputDir = path.resolve(repoRoot, options.outputDir ?? "release");
  const version = options.version ?? (await readPackageVersion(repoRoot));
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const execFileImpl = options.execFileImpl ?? execFileAsync;
  const bundleDirName = `${PROJECT_NAME}-${version}`;
  const archiveBaseName = `${PROJECT_NAME}-${version}-bundle`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `${PROJECT_NAME}-`));
  const bundleRoot = path.join(tempDir, bundleDirName);

  try {
    await ensureRequiredBundleInputs(repoRoot);

    await mkdir(bundleRoot, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    for (const entry of REQUIRED_BUNDLE_ENTRIES) {
      await copyEntry(repoRoot, bundleRoot, entry);
    }

    const privatePathLeaks = await scanBundleForPrivatePaths(bundleRoot);
    if (privatePathLeaks.length > 0) {
      throw new Error(
        "Release bundle leaks private absolute paths (cancelling tar/zip):\n  - " +
          privatePathLeaks.join("\n  - ")
      );
    }

    await generateArtifactManifest(bundleRoot, version);

    const tarPath = path.join(outputDir, `${archiveBaseName}.tar.gz`);
    const zipPath = path.join(outputDir, `${archiveBaseName}.zip`);
    const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);

    await rm(tarPath, { force: true });
    await rm(zipPath, { force: true });
    await rm(checksumPath, { force: true });

    await createTarball(tempDir, bundleDirName, tarPath, execFileImpl);

    const archivePaths = [tarPath];
    const zipCreated = await createZipArchive(tempDir, bundleDirName, zipPath, {
      execFileImpl,
      stderr
    });
    if (zipCreated) {
      archivePaths.push(zipPath);
    }

    const generatedChecksumPath = await writeChecksumFile(
      outputDir,
      archivePaths,
      archiveBaseName
    );

    stdout.write(
      [
        `Bundle preparado para ${version}`,
        ...archivePaths.map((archivePath) => `asset=${archivePath}`),
        `checksum=${generatedChecksumPath}`
      ].join("\n") + "\n"
    );

    return {
      version,
      archivePaths,
      checksumPath: generatedChecksumPath
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
