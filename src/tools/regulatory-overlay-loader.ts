/**
 * regulatory-overlay-loader
 *
 * Deterministic loader for the regulatory overlay surface published by the
 * SbD-ToE knowledge graph at `data/publish/overlay/`.
 *
 * Overlay contract (all files mandatory when overlay is published):
 *   external_frameworks.json
 *   external_obligations.json
 *   overlay_playbooks.json
 *   overlay_mappings.jsonl
 *   framework_overlay_index.json
 *
 * Provenance: every record is tagged with `source: "overlay"` so consumers can
 * distinguish v0 runtime, v1 runtime, and regulatory overlay records.
 *
 * The overlay is OPTIONAL upstream. When absent, the loader returns
 * `{ status: "absent" }` with empty collections — it does NOT throw. When
 * partially present, the loader throws `OverlayAssetMissingError` so callers
 * see an explicit failure rather than silently degraded data.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

import { resolveAppPath } from "../config.js";

export type OverlayProvenanceSource = "overlay";

export interface RegulatoryFramework {
  framework_id: string;
  short_code: string;
  name: string;
  framework_kind: string;
  jurisdiction: string;
  authority_class: string;
  scope_summary: string;
}

export interface RegulatoryObligation {
  obligation_id: string;
  framework_id: string;
  title: string;
  topic?: string;
  citation?: string;
  obligation_kind: string;
  applicability_scope: string;
  normative_strength: string;
}

export interface RegulatoryPlaybook {
  playbook_id: string;
  framework_ids: string[];
  title: string;
  playbook_kind: string;
  curation_status: string;
  adoption_status: string;
  authority_class: string;
  applicability_scope: string;
  source_bundle_id?: string;
  source_document_id?: string;
  source_path?: string;
}

export interface RegulatoryMapping {
  mapping_id: string;
  mapping_type: string;
  obligation_id: string;
  framework_id: string;
  target_id: string;
  target_type: string;
  authority_class: string;
  playbook_id?: string;
  citation?: string;
  confidence?: number;
  justification?: string;
  matched_label?: string;
  source_document_id?: string;
  source_lines?: number[];
}

export interface FrameworkOverlayIndexEntry {
  framework_id: string;
  short_code: string;
  obligation_ids: string[];
  playbook_ids: string[];
  primary_playbook_ids: string[];
  support_playbook_ids: string[];
}

export interface OverlayProvenance {
  source: OverlayProvenanceSource;
  baseDir: string;
  files: Record<string, { absolutePath: string; sha256: string }>;
}

export type RegulatoryOverlayStatus = "published" | "absent";

export interface RegulatoryOverlayData {
  status: RegulatoryOverlayStatus;
  frameworks: RegulatoryFramework[];
  obligations: RegulatoryObligation[];
  playbooks: RegulatoryPlaybook[];
  mappings: RegulatoryMapping[];
  index: FrameworkOverlayIndexEntry[];
  frameworksById: Map<string, RegulatoryFramework>;
  frameworksByShortCode: Map<string, RegulatoryFramework>;
  obligationsById: Map<string, RegulatoryObligation>;
  playbooksById: Map<string, RegulatoryPlaybook>;
  mappingsById: Map<string, RegulatoryMapping>;
  obligationsByFramework: Map<string, RegulatoryObligation[]>;
  playbooksByFramework: Map<string, RegulatoryPlaybook[]>;
  mappingsByObligation: Map<string, RegulatoryMapping[]>;
  mappingsByTarget: Map<string, RegulatoryMapping[]>;
  provenance: OverlayProvenance;
  absentReason?: string;
}

export class OverlayAssetMissingError extends Error {
  readonly missingPaths: string[];

  constructor(missingPaths: string[]) {
    super(
      `Overlay regulatório parcialmente presente. Ficheiros em falta:\n` +
        missingPaths.map((entry) => `  - ${entry}`).join("\n")
    );
    this.name = "OverlayAssetMissingError";
    this.missingPaths = missingPaths;
  }
}

const REQUIRED_RELATIVE_PATHS = [
  "external_frameworks.json",
  "external_obligations.json",
  "overlay_playbooks.json",
  "overlay_mappings.jsonl",
  "framework_overlay_index.json"
] as const;

let _cache: RegulatoryOverlayData | undefined;

function resolveBaseDir(): string {
  return resolveAppPath("data/publish/overlay");
}

function readJsonFile<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf-8")) as T;
}

function readJsonlFile<T>(absolutePath: string): T[] {
  const raw = readFileSync(absolutePath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const records: T[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) continue;
    try {
      records.push(JSON.parse(line) as T);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha a parsear JSONL em ${absolutePath} linha ${index + 1}: ${message}`
      );
    }
  }
  return records;
}

function sha256OfFile(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strOptional(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function strArr(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function numArr(record: Record<string, unknown>, key: string): number[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is number => typeof entry === "number");
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  fileLabel: string
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fileLabel}: campo '${key}' obrigatório em falta`);
  }
  return value;
}

function requireStringAllowEmpty(
  record: Record<string, unknown>,
  key: string,
  fileLabel: string
): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`${fileLabel}: campo '${key}' tem de ser string`);
  }
  return value;
}

function parseFramework(
  record: Record<string, unknown>,
  fileLabel: string
): RegulatoryFramework {
  return {
    framework_id: requireString(record, "framework_id", fileLabel),
    short_code: requireString(record, "short_code", fileLabel),
    name: requireString(record, "name", fileLabel),
    framework_kind: strOptional(record, "framework_kind") ?? "",
    jurisdiction: strOptional(record, "jurisdiction") ?? "",
    authority_class: strOptional(record, "authority_class") ?? "",
    scope_summary: strOptional(record, "scope_summary") ?? ""
  };
}

function parseObligation(
  record: Record<string, unknown>,
  fileLabel: string
): RegulatoryObligation {
  const obligation: RegulatoryObligation = {
    obligation_id: requireString(record, "obligation_id", fileLabel),
    framework_id: requireString(record, "framework_id", fileLabel),
    title: requireString(record, "title", fileLabel),
    obligation_kind: strOptional(record, "obligation_kind") ?? "",
    applicability_scope: strOptional(record, "applicability_scope") ?? "",
    normative_strength: strOptional(record, "normative_strength") ?? ""
  };
  const topic = strOptional(record, "topic");
  if (topic) obligation.topic = topic;
  const citation = strOptional(record, "citation");
  if (citation) obligation.citation = citation;
  return obligation;
}

function parsePlaybook(
  record: Record<string, unknown>,
  fileLabel: string
): RegulatoryPlaybook {
  const playbook: RegulatoryPlaybook = {
    playbook_id: requireString(record, "playbook_id", fileLabel),
    framework_ids: strArr(record, "framework_ids"),
    title: requireString(record, "title", fileLabel),
    playbook_kind: strOptional(record, "playbook_kind") ?? "",
    curation_status: strOptional(record, "curation_status") ?? "",
    adoption_status: strOptional(record, "adoption_status") ?? "",
    authority_class: strOptional(record, "authority_class") ?? "",
    applicability_scope: strOptional(record, "applicability_scope") ?? ""
  };
  const sourceBundleId = strOptional(record, "source_bundle_id");
  if (sourceBundleId) playbook.source_bundle_id = sourceBundleId;
  const sourceDocumentId = strOptional(record, "source_document_id");
  if (sourceDocumentId) playbook.source_document_id = sourceDocumentId;
  const sourcePath = strOptional(record, "source_path");
  if (sourcePath) playbook.source_path = sourcePath;
  return playbook;
}

function parseMapping(
  record: Record<string, unknown>,
  lineNumber: number
): RegulatoryMapping {
  const fileLabel = `overlay_mappings.jsonl linha ${lineNumber}`;
  // obligation_id is published as an empty string for playbook-driven mapping
  // types (`playbook_highlights_bundle`, `playbook_references_overlay`); the
  // field is always present in the JSON but may be empty. We preserve the empty
  // string verbatim so consumers can detect these non-obligation mappings.
  const mapping: RegulatoryMapping = {
    mapping_id: requireString(record, "mapping_id", fileLabel),
    mapping_type: requireString(record, "mapping_type", fileLabel),
    obligation_id: requireStringAllowEmpty(record, "obligation_id", fileLabel),
    framework_id: requireString(record, "framework_id", fileLabel),
    target_id: requireString(record, "target_id", fileLabel),
    target_type: requireString(record, "target_type", fileLabel),
    authority_class: strOptional(record, "authority_class") ?? ""
  };
  const playbookId = strOptional(record, "playbook_id");
  if (playbookId) mapping.playbook_id = playbookId;
  const citation = strOptional(record, "citation");
  if (citation) mapping.citation = citation;
  const confidence = record["confidence"];
  if (typeof confidence === "number") mapping.confidence = confidence;
  const justification = strOptional(record, "justification");
  if (justification) mapping.justification = justification;
  const matchedLabel = strOptional(record, "matched_label");
  if (matchedLabel) mapping.matched_label = matchedLabel;
  const sourceDocumentId = strOptional(record, "source_document_id");
  if (sourceDocumentId) mapping.source_document_id = sourceDocumentId;
  const sourceLines = numArr(record, "source_lines");
  if (sourceLines.length > 0) mapping.source_lines = sourceLines;
  return mapping;
}

function parseIndexEntry(
  record: Record<string, unknown>,
  fileLabel: string
): FrameworkOverlayIndexEntry {
  return {
    framework_id: requireString(record, "framework_id", fileLabel),
    short_code: requireString(record, "short_code", fileLabel),
    obligation_ids: strArr(record, "obligation_ids"),
    playbook_ids: strArr(record, "playbook_ids"),
    primary_playbook_ids: strArr(record, "primary_playbook_ids"),
    support_playbook_ids: strArr(record, "support_playbook_ids")
  };
}

function readItemsArray(absolutePath: string): Record<string, unknown>[] {
  const raw = readJsonFile<unknown>(absolutePath);
  if (!isRecord(raw)) {
    throw new Error(`${absolutePath}: esperava objecto com array 'items'`);
  }
  const items = raw["items"];
  if (!Array.isArray(items)) {
    throw new Error(`${absolutePath}: campo 'items' tem de ser array`);
  }
  return items.filter(isRecord);
}

function pushToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

function emptyOverlay(baseDir: string, reason: string): RegulatoryOverlayData {
  return {
    status: "absent",
    frameworks: [],
    obligations: [],
    playbooks: [],
    mappings: [],
    index: [],
    frameworksById: new Map(),
    frameworksByShortCode: new Map(),
    obligationsById: new Map(),
    playbooksById: new Map(),
    mappingsById: new Map(),
    obligationsByFramework: new Map(),
    playbooksByFramework: new Map(),
    mappingsByObligation: new Map(),
    mappingsByTarget: new Map(),
    provenance: {
      source: "overlay",
      baseDir,
      files: {}
    },
    absentReason: reason
  };
}

export interface LoadRegulatoryOverlayOptions {
  baseDir?: string;
}

export function loadRegulatoryOverlay(
  options: LoadRegulatoryOverlayOptions = {}
): RegulatoryOverlayData {
  const baseDir = options.baseDir ?? resolveBaseDir();
  const baseDirExists = existsSync(baseDir) && statSync(baseDir).isDirectory();

  if (!baseDirExists) {
    return emptyOverlay(baseDir, "overlay base dir does not exist");
  }

  const presence = REQUIRED_RELATIVE_PATHS.map((relative) => ({
    relative,
    absolute: path.join(baseDir, relative),
    exists: existsSync(path.join(baseDir, relative))
  }));
  const presentCount = presence.filter((entry) => entry.exists).length;

  if (presentCount === 0) {
    return emptyOverlay(baseDir, "no overlay artefacts published");
  }
  if (presentCount < presence.length) {
    const missing = presence.filter((entry) => !entry.exists).map((entry) => entry.relative);
    throw new OverlayAssetMissingError(missing);
  }

  const filesProvenance: OverlayProvenance["files"] = {};
  for (const entry of presence) {
    filesProvenance[entry.relative] = {
      absolutePath: entry.absolute,
      sha256: sha256OfFile(entry.absolute)
    };
  }

  const frameworksRaw = readItemsArray(path.join(baseDir, "external_frameworks.json"));
  const frameworks = frameworksRaw.map((rec) =>
    parseFramework(rec, "external_frameworks.json")
  );

  const obligationsRaw = readItemsArray(path.join(baseDir, "external_obligations.json"));
  const obligations = obligationsRaw.map((rec) =>
    parseObligation(rec, "external_obligations.json")
  );

  const playbooksRaw = readItemsArray(path.join(baseDir, "overlay_playbooks.json"));
  const playbooks = playbooksRaw.map((rec) => parsePlaybook(rec, "overlay_playbooks.json"));

  const mappingsLines = readJsonlFile<Record<string, unknown>>(
    path.join(baseDir, "overlay_mappings.jsonl")
  );
  const mappings = mappingsLines.map((rec, idx) => parseMapping(rec, idx + 1));

  const indexRaw = readItemsArray(path.join(baseDir, "framework_overlay_index.json"));
  const index = indexRaw.map((rec) => parseIndexEntry(rec, "framework_overlay_index.json"));

  const frameworksById = new Map<string, RegulatoryFramework>();
  const frameworksByShortCode = new Map<string, RegulatoryFramework>();
  for (const framework of frameworks) {
    frameworksById.set(framework.framework_id, framework);
    frameworksByShortCode.set(framework.short_code.toUpperCase(), framework);
  }

  const obligationsById = new Map<string, RegulatoryObligation>();
  const obligationsByFramework = new Map<string, RegulatoryObligation[]>();
  for (const obligation of obligations) {
    obligationsById.set(obligation.obligation_id, obligation);
    pushToMap(obligationsByFramework, obligation.framework_id, obligation);
  }

  const playbooksById = new Map<string, RegulatoryPlaybook>();
  const playbooksByFramework = new Map<string, RegulatoryPlaybook[]>();
  for (const playbook of playbooks) {
    playbooksById.set(playbook.playbook_id, playbook);
    for (const frameworkId of playbook.framework_ids) {
      pushToMap(playbooksByFramework, frameworkId, playbook);
    }
  }

  const mappingsById = new Map<string, RegulatoryMapping>();
  const mappingsByObligation = new Map<string, RegulatoryMapping[]>();
  const mappingsByTarget = new Map<string, RegulatoryMapping[]>();
  for (const mapping of mappings) {
    mappingsById.set(mapping.mapping_id, mapping);
    if (mapping.obligation_id.length > 0) {
      pushToMap(mappingsByObligation, mapping.obligation_id, mapping);
    }
    pushToMap(mappingsByTarget, mapping.target_id, mapping);
  }

  return {
    status: "published",
    frameworks,
    obligations,
    playbooks,
    mappings,
    index,
    frameworksById,
    frameworksByShortCode,
    obligationsById,
    playbooksById,
    mappingsById,
    obligationsByFramework,
    playbooksByFramework,
    mappingsByObligation,
    mappingsByTarget,
    provenance: {
      source: "overlay",
      baseDir,
      files: filesProvenance
    }
  };
}

export function getRegulatoryOverlay(): RegulatoryOverlayData {
  if (!_cache) {
    _cache = loadRegulatoryOverlay();
  }
  return _cache;
}

export function clearRegulatoryOverlayCacheForTests(): void {
  _cache = undefined;
}

/**
 * Resolves a framework by either `framework_id` (e.g. `EXT-DORA`) or its
 * `short_code` (e.g. `DORA`, case-insensitive). Returns `undefined` when
 * no overlay framework matches — callers MUST NOT fabricate a framework.
 */
export function resolveRegulatoryFramework(
  data: RegulatoryOverlayData,
  input: string
): RegulatoryFramework | undefined {
  if (!input) return undefined;
  const direct = data.frameworksById.get(input);
  if (direct) return direct;
  return data.frameworksByShortCode.get(input.toUpperCase());
}
