/**
 * g2-runtime-loader
 *
 * Deterministic loader for the AppSec Core V1 runtime surface published by the
 * SbD-ToE knowledge graph at `data/publish/runtime/v1/`.
 *
 * Runtime contract (all files mandatory when v1 is present):
 *   v1_manifest.json
 *   slices.json
 *   control_objectives.json
 *   mechanisms.json
 *   practices.json
 *   artifacts.json
 *   relations.jsonl
 *   manual_rastreabilidade.jsonl
 *
 * Provenance: every record is tagged with `source: "runtime_v1"` so consumers
 * can distinguish v0 runtime (existing `ontology-loader`), v1 runtime, and
 * regulatory overlay.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

import { resolveAppPath } from "../config.js";

export type G2ProvenanceSource = "runtime_v1";

export interface SliceCounts {
  artifacts: number;
  control_objectives: number;
  mechanisms: number;
  practices: number;
}

export interface AppSecSlice {
  slice_id: string;
  scope: string;
  objective_family: string;
  composite_objective: string;
  contract_status: string;
  contract_file: string;
  counts_actual: SliceCounts;
  counts_declared: SliceCounts;
  drift_fields: string[];
}

export interface ControlObjectiveV1 {
  entity_id: string;
  entity_type: "ControlObjective";
  role: string;
  slice_family: string;
  slice_id: string;
}

export interface MechanismV1 {
  entity_id: string;
  entity_type: "Mechanism";
  slice_family: string;
  slice_id: string;
}

export interface PracticeV1 {
  entity_id: string;
  entity_type: "Practice";
  slice_family: string;
  slice_id: string;
}

export interface ArtifactV1 {
  entity_id: string;
  entity_type: "Artifact";
  slice_family: string;
  slice_id: string;
}

export type V1EntityType = "ControlObjective" | "Mechanism" | "Practice" | "Artifact";
export type V1Entity = ControlObjectiveV1 | MechanismV1 | PracticeV1 | ArtifactV1;

export interface AppSecRelation {
  subject_id: string;
  subject_type: string | null;
  predicate: string;
  object_id: string;
  object_type: string | null;
}

export type RastreabilidadeRole =
  | "manual_v2_entity"
  | "substrate_landing"
  | "manual_only_coverage"
  | "out_of_appsec_coverage"
  | "placeholder";

export interface ManualRastreabilidadeEntry {
  rastreabilidade_role: RastreabilidadeRole;
  coverage_status?: string;
  iter_introduced?: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  manual_commit_sha?: string;
  // manual_v2_entity records
  manual_v2_entity_id?: string;
  manual_v2_entity_label?: string;
  manual_v2_entity_type?: string;
  manual_v2_authority_class?: string;
  manual_v2_confidence_model?: string;
  manual_v2_source_mode?: string;
  manual_v2_anchor?: string;
  // substrate_landing / placeholder records
  v1_entity_id?: string;
  v1_entity_name?: string;
  v1_entity_type?: string;
  v1_family?: string;
  v1_slice?: string;
  authority_class?: string;
  methodology_label?: string;
  source_mode?: string;
  substrate_release_tag?: string;
  manual_section?: string;
  manual_section_anchor?: string;
  placeholder_rationale?: string;
  raw: Record<string, unknown>;
}

export interface V1ManifestEntityCounts {
  actual: SliceCounts & { total: number };
  declared: SliceCounts & { total: number };
  drift_summary?: Record<string, number>;
}

export interface V1ManifestRelationCounts {
  belongsToSlice: number;
  objective_implemented_by_mechanism: number;
  objective_realized_by_practice: number;
  total: number;
}

export interface V1ManifestFileEntry {
  path: string;
  sha256: string;
}

export interface V1Manifest {
  artifact_type: string;
  build: { generated_at: string; generator: string };
  drift_note?: string;
  entity_counts: V1ManifestEntityCounts;
  files: Record<string, V1ManifestFileEntry>;
  relation_counts: V1ManifestRelationCounts;
  slice_count: number;
  warnings: string[];
  ontology_anchor?: Record<string, unknown>;
  manual_rastreabilidade?: Record<string, unknown>;
  manual_maturity_progression?: Record<string, unknown>;
  manual_threat_mitigation?: Record<string, unknown>;
  methodology_label_distribution?: Record<string, number>;
  future_work_entries?: unknown[];
}

export interface V1ConsistencyReport {
  manifestEntityCounts: V1ManifestEntityCounts;
  loadedEntityCounts: {
    control_objectives: number;
    mechanisms: number;
    practices: number;
    artifacts: number;
    total: number;
  };
  manifestRelationCounts: V1ManifestRelationCounts;
  loadedRelationCounts: {
    belongsToSlice: number;
    objective_realized_by_practice: number;
    objective_implemented_by_mechanism: number;
    total: number;
  };
  fileChecksumStatus: Record<
    string,
    { expected: string; actual: string; matches: boolean }
  >;
  mismatches: string[];
  warnings: string[];
}

export interface G2RuntimeProvenance {
  source: G2ProvenanceSource;
  baseDir: string;
  manifestPath: string;
  manifestSha256: string;
  files: Record<string, { absolutePath: string; sha256: string }>;
}

export interface G2RuntimeData {
  manifest: V1Manifest;
  slices: AppSecSlice[];
  controlObjectives: ControlObjectiveV1[];
  mechanisms: MechanismV1[];
  practices: PracticeV1[];
  artifacts: ArtifactV1[];
  relations: AppSecRelation[];
  rastreabilidade: ManualRastreabilidadeEntry[];
  slicesById: Map<string, AppSecSlice>;
  entityById: Map<string, V1Entity>;
  relationsBySubject: Map<string, AppSecRelation[]>;
  relationsByObject: Map<string, AppSecRelation[]>;
  rastreabilidadeByV1EntityId: Map<string, ManualRastreabilidadeEntry[]>;
  rastreabilidadeByManualEntityId: Map<string, ManualRastreabilidadeEntry[]>;
  consistency: V1ConsistencyReport;
  provenance: G2RuntimeProvenance;
}

export class RuntimeV1AssetMissingError extends Error {
  readonly missingPaths: string[];

  constructor(missingPaths: string[]) {
    super(
      `AppSec Core v1 runtime ausente. Ficheiros obrigatórios em falta:\n` +
        missingPaths.map((entry) => `  - ${entry}`).join("\n")
    );
    this.name = "RuntimeV1AssetMissingError";
    this.missingPaths = missingPaths;
  }
}

const REQUIRED_RELATIVE_PATHS = [
  "v1_manifest.json",
  "slices.json",
  "control_objectives.json",
  "mechanisms.json",
  "practices.json",
  "artifacts.json",
  "relations.jsonl",
  "manual_rastreabilidade.jsonl"
] as const;

const MANIFEST_FILE_KEYS_REQUIRED = [
  "slices",
  "control_objectives",
  "mechanisms",
  "practices",
  "artifacts",
  "relations",
  "manual_rastreabilidade"
] as const;

let _cache: G2RuntimeData | undefined;

function resolveBaseDir(): string {
  return resolveAppPath("data/publish/runtime/v1");
}

function readJsonFile<T>(absolutePath: string): T {
  const raw = readFileSync(absolutePath, "utf-8");
  return JSON.parse(raw) as T;
}

function readJsonlFile<T>(absolutePath: string): T[] {
  const raw = readFileSync(absolutePath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const records: T[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }
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
  const buffer = readFileSync(absolutePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strOptional(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function strOrNullOptional(
  record: Record<string, unknown>,
  key: string
): string | null | undefined {
  const value = record[key];
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
}

function strArr(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function ensureCounts(record: unknown, location: string): SliceCounts {
  if (!isRecord(record)) {
    throw new Error(`Esperava objecto de contagens em ${location}.`);
  }
  return {
    artifacts: Number(record.artifacts ?? 0),
    control_objectives: Number(record.control_objectives ?? 0),
    mechanisms: Number(record.mechanisms ?? 0),
    practices: Number(record.practices ?? 0)
  };
}

function ensureCountsWithTotal(
  record: unknown,
  location: string
): SliceCounts & { total: number } {
  const counts = ensureCounts(record, location);
  const totalRaw = isRecord(record) ? record.total : undefined;
  const total =
    typeof totalRaw === "number"
      ? totalRaw
      : counts.artifacts + counts.control_objectives + counts.mechanisms + counts.practices;
  return { ...counts, total };
}

function parseSlice(record: Record<string, unknown>): AppSecSlice {
  const sliceId = strOptional(record, "slice_id");
  if (!sliceId) {
    throw new Error(`slices.json: registo sem slice_id: ${JSON.stringify(record)}`);
  }
  return {
    slice_id: sliceId,
    scope: strOptional(record, "scope") ?? "",
    objective_family: strOptional(record, "objective_family") ?? "",
    composite_objective: strOptional(record, "composite_objective") ?? "",
    contract_status: strOptional(record, "contract_status") ?? "",
    contract_file: strOptional(record, "contract_file") ?? "",
    counts_actual: ensureCounts(record.counts_actual, "slices.counts_actual"),
    counts_declared: ensureCounts(record.counts_declared, "slices.counts_declared"),
    drift_fields: strArr(record, "drift_fields")
  };
}

function parseEntity<T extends V1Entity>(
  record: Record<string, unknown>,
  expectedType: V1EntityType,
  fileLabel: string
): T {
  const entityId = strOptional(record, "entity_id");
  if (!entityId) {
    throw new Error(`${fileLabel}: registo sem entity_id`);
  }
  const entityType = strOptional(record, "entity_type");
  if (entityType !== expectedType) {
    throw new Error(
      `${fileLabel}: entity_type esperado=${expectedType} recebido=${entityType ?? "undefined"} (entity_id=${entityId})`
    );
  }
  const base = {
    entity_id: entityId,
    entity_type: expectedType,
    slice_family: strOptional(record, "slice_family") ?? "",
    slice_id: strOptional(record, "slice_id") ?? ""
  };
  if (expectedType === "ControlObjective") {
    return {
      ...base,
      role: strOptional(record, "role") ?? "atomic"
    } as T;
  }
  return base as T;
}

function parseRelation(record: Record<string, unknown>, lineNumber: number): AppSecRelation {
  const strictKeys = ["subject_id", "predicate", "object_id"];
  for (const key of strictKeys) {
    if (typeof record[key] !== "string") {
      throw new Error(
        `relations.jsonl linha ${lineNumber}: campo '${key}' em falta ou não-string`
      );
    }
  }
  // The upstream v1 surface intentionally publishes `null` for object_type on
  // `objective_*` predicates and may do the same for subject_type. We keep the
  // null verbatim instead of inventing a type, so consumers see exactly what
  // the KG declared.
  const nullableKeys: Array<"subject_type" | "object_type"> = [
    "subject_type",
    "object_type"
  ];
  for (const key of nullableKeys) {
    const value = record[key];
    if (value !== null && typeof value !== "string") {
      throw new Error(
        `relations.jsonl linha ${lineNumber}: campo '${key}' tem de ser string ou null`
      );
    }
  }
  return {
    subject_id: record.subject_id as string,
    subject_type: (record.subject_type as string | null) ?? null,
    predicate: record.predicate as string,
    object_id: record.object_id as string,
    object_type: (record.object_type as string | null) ?? null
  };
}

function parseRastreabilidade(
  record: Record<string, unknown>,
  lineNumber: number
): ManualRastreabilidadeEntry {
  const role = strOptional(record, "rastreabilidade_role");
  if (!role) {
    throw new Error(
      `manual_rastreabilidade.jsonl linha ${lineNumber}: 'rastreabilidade_role' em falta`
    );
  }
  const entry: ManualRastreabilidadeEntry = {
    rastreabilidade_role: role as RastreabilidadeRole,
    raw: record
  };
  const optionalStringFields: Array<keyof ManualRastreabilidadeEntry> = [
    "coverage_status",
    "iter_introduced",
    "manual_commit_sha",
    "manual_v2_entity_id",
    "manual_v2_entity_label",
    "manual_v2_entity_type",
    "manual_v2_authority_class",
    "manual_v2_confidence_model",
    "manual_v2_source_mode",
    "manual_v2_anchor",
    "v1_entity_id",
    "v1_entity_name",
    "v1_entity_type",
    "v1_family",
    "v1_slice",
    "authority_class",
    "methodology_label",
    "source_mode",
    "substrate_release_tag",
    "manual_section",
    "manual_section_anchor",
    "placeholder_rationale"
  ];
  const writableEntry = entry as unknown as Record<string, unknown>;
  for (const field of optionalStringFields) {
    const value = strOptional(record, field as string);
    if (value !== undefined) {
      writableEntry[field as string] = value;
    }
  }
  const chapterValue = strOrNullOptional(record, "manual_chapter");
  if (chapterValue !== undefined) {
    entry.manual_chapter = chapterValue;
  }
  const fileValue = strOrNullOptional(record, "manual_file");
  if (fileValue !== undefined) {
    entry.manual_file = fileValue;
  }
  return entry;
}

function pushToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
}

function buildConsistencyReport(args: {
  manifest: V1Manifest;
  loadedEntityCounts: V1ConsistencyReport["loadedEntityCounts"];
  loadedRelationCounts: V1ConsistencyReport["loadedRelationCounts"];
  fileChecksumStatus: V1ConsistencyReport["fileChecksumStatus"];
}): V1ConsistencyReport {
  const mismatches: string[] = [];

  const ec = args.manifest.entity_counts.actual;
  if (ec.control_objectives !== args.loadedEntityCounts.control_objectives) {
    mismatches.push(
      `entity_counts.control_objectives: manifest=${ec.control_objectives} loaded=${args.loadedEntityCounts.control_objectives}`
    );
  }
  if (ec.mechanisms !== args.loadedEntityCounts.mechanisms) {
    mismatches.push(
      `entity_counts.mechanisms: manifest=${ec.mechanisms} loaded=${args.loadedEntityCounts.mechanisms}`
    );
  }
  if (ec.practices !== args.loadedEntityCounts.practices) {
    mismatches.push(
      `entity_counts.practices: manifest=${ec.practices} loaded=${args.loadedEntityCounts.practices}`
    );
  }
  if (ec.artifacts !== args.loadedEntityCounts.artifacts) {
    mismatches.push(
      `entity_counts.artifacts: manifest=${ec.artifacts} loaded=${args.loadedEntityCounts.artifacts}`
    );
  }
  if (ec.total !== args.loadedEntityCounts.total) {
    mismatches.push(
      `entity_counts.total: manifest=${ec.total} loaded=${args.loadedEntityCounts.total}`
    );
  }

  const rc = args.manifest.relation_counts;
  if (rc.belongsToSlice !== args.loadedRelationCounts.belongsToSlice) {
    mismatches.push(
      `relation_counts.belongsToSlice: manifest=${rc.belongsToSlice} loaded=${args.loadedRelationCounts.belongsToSlice}`
    );
  }
  if (
    rc.objective_realized_by_practice !== args.loadedRelationCounts.objective_realized_by_practice
  ) {
    mismatches.push(
      `relation_counts.objective_realized_by_practice: manifest=${rc.objective_realized_by_practice} loaded=${args.loadedRelationCounts.objective_realized_by_practice}`
    );
  }
  if (
    rc.objective_implemented_by_mechanism !==
    args.loadedRelationCounts.objective_implemented_by_mechanism
  ) {
    mismatches.push(
      `relation_counts.objective_implemented_by_mechanism: manifest=${rc.objective_implemented_by_mechanism} loaded=${args.loadedRelationCounts.objective_implemented_by_mechanism}`
    );
  }
  if (rc.total !== args.loadedRelationCounts.total) {
    mismatches.push(
      `relation_counts.total: manifest=${rc.total} loaded=${args.loadedRelationCounts.total}`
    );
  }

  for (const [key, status] of Object.entries(args.fileChecksumStatus)) {
    if (!status.matches) {
      mismatches.push(
        `sha256(${key}): manifest=${status.expected} actual=${status.actual}`
      );
    }
  }

  return {
    manifestEntityCounts: args.manifest.entity_counts,
    loadedEntityCounts: args.loadedEntityCounts,
    manifestRelationCounts: args.manifest.relation_counts,
    loadedRelationCounts: args.loadedRelationCounts,
    fileChecksumStatus: args.fileChecksumStatus,
    mismatches,
    warnings: [...args.manifest.warnings]
  };
}

function parseManifest(raw: unknown, source: string): V1Manifest {
  if (!isRecord(raw)) {
    throw new Error(`${source}: manifest não é um objecto.`);
  }
  const entityCounts = raw.entity_counts;
  if (!isRecord(entityCounts)) {
    throw new Error(`${source}: entity_counts em falta.`);
  }
  const filesRaw = raw.files;
  if (!isRecord(filesRaw)) {
    throw new Error(`${source}: files em falta.`);
  }
  const files: Record<string, V1ManifestFileEntry> = {};
  for (const [key, value] of Object.entries(filesRaw)) {
    if (!isRecord(value)) continue;
    const p = strOptional(value, "path");
    const sha = strOptional(value, "sha256");
    if (p && sha) {
      files[key] = { path: p, sha256: sha };
    }
  }
  for (const required of MANIFEST_FILE_KEYS_REQUIRED) {
    if (!files[required]) {
      throw new Error(`${source}: manifest.files.${required} em falta.`);
    }
  }
  const relationCountsRaw = raw.relation_counts;
  if (!isRecord(relationCountsRaw)) {
    throw new Error(`${source}: relation_counts em falta.`);
  }
  const manifest: V1Manifest = {
    artifact_type: strOptional(raw, "artifact_type") ?? "",
    build: {
      generated_at: isRecord(raw.build) ? strOptional(raw.build, "generated_at") ?? "" : "",
      generator: isRecord(raw.build) ? strOptional(raw.build, "generator") ?? "" : ""
    },
    entity_counts: {
      actual: ensureCountsWithTotal(entityCounts.actual, "manifest.entity_counts.actual"),
      declared: ensureCountsWithTotal(entityCounts.declared, "manifest.entity_counts.declared"),
      ...(isRecord(entityCounts.drift_summary)
        ? { drift_summary: entityCounts.drift_summary as Record<string, number> }
        : {})
    },
    files,
    relation_counts: {
      belongsToSlice: Number(relationCountsRaw.belongsToSlice ?? 0),
      objective_implemented_by_mechanism: Number(
        relationCountsRaw.objective_implemented_by_mechanism ?? 0
      ),
      objective_realized_by_practice: Number(
        relationCountsRaw.objective_realized_by_practice ?? 0
      ),
      total: Number(relationCountsRaw.total ?? 0)
    },
    slice_count: Number(raw.slice_count ?? 0),
    warnings: strArr(raw, "warnings")
  };
  const driftNote = strOptional(raw, "drift_note");
  if (driftNote) {
    manifest.drift_note = driftNote;
  }
  if (isRecord(raw.ontology_anchor)) {
    manifest.ontology_anchor = raw.ontology_anchor;
  }
  if (isRecord(raw.manual_rastreabilidade)) {
    manifest.manual_rastreabilidade = raw.manual_rastreabilidade;
  }
  if (isRecord(raw.manual_maturity_progression)) {
    manifest.manual_maturity_progression = raw.manual_maturity_progression;
  }
  if (isRecord(raw.manual_threat_mitigation)) {
    manifest.manual_threat_mitigation = raw.manual_threat_mitigation;
  }
  if (isRecord(raw.methodology_label_distribution)) {
    manifest.methodology_label_distribution = raw.methodology_label_distribution as Record<
      string,
      number
    >;
  }
  if (Array.isArray(raw.future_work_entries)) {
    manifest.future_work_entries = raw.future_work_entries;
  }
  return manifest;
}

export interface LoadG2RuntimeOptions {
  baseDir?: string;
}

export function loadG2Runtime(options: LoadG2RuntimeOptions = {}): G2RuntimeData {
  const baseDir = options.baseDir ?? resolveBaseDir();
  const baseDirExists = existsSync(baseDir) && statSync(baseDir).isDirectory();
  const missing: string[] = [];
  for (const relative of REQUIRED_RELATIVE_PATHS) {
    const absolute = path.join(baseDir, relative);
    if (!existsSync(absolute)) {
      missing.push(path.join("data/publish/runtime/v1", relative));
    }
  }
  if (!baseDirExists || missing.length > 0) {
    throw new RuntimeV1AssetMissingError(
      missing.length > 0 ? missing : [path.relative(process.cwd(), baseDir)]
    );
  }

  const manifestPath = path.join(baseDir, "v1_manifest.json");
  const manifestRaw = readJsonFile<unknown>(manifestPath);
  const manifest = parseManifest(manifestRaw, manifestPath);

  const slicesRaw = readJsonFile<unknown>(path.join(baseDir, "slices.json"));
  if (!Array.isArray(slicesRaw)) {
    throw new Error("slices.json: esperava array no topo");
  }
  const slices = slicesRaw.filter(isRecord).map(parseSlice);

  const coRaw = readJsonFile<unknown>(path.join(baseDir, "control_objectives.json"));
  if (!Array.isArray(coRaw)) throw new Error("control_objectives.json: esperava array");
  const controlObjectives = coRaw
    .filter(isRecord)
    .map((rec) => parseEntity<ControlObjectiveV1>(rec, "ControlObjective", "control_objectives.json"));

  const mRaw = readJsonFile<unknown>(path.join(baseDir, "mechanisms.json"));
  if (!Array.isArray(mRaw)) throw new Error("mechanisms.json: esperava array");
  const mechanisms = mRaw
    .filter(isRecord)
    .map((rec) => parseEntity<MechanismV1>(rec, "Mechanism", "mechanisms.json"));

  const pRaw = readJsonFile<unknown>(path.join(baseDir, "practices.json"));
  if (!Array.isArray(pRaw)) throw new Error("practices.json: esperava array");
  const practices = pRaw
    .filter(isRecord)
    .map((rec) => parseEntity<PracticeV1>(rec, "Practice", "practices.json"));

  const aRaw = readJsonFile<unknown>(path.join(baseDir, "artifacts.json"));
  if (!Array.isArray(aRaw)) throw new Error("artifacts.json: esperava array");
  const artifacts = aRaw
    .filter(isRecord)
    .map((rec) => parseEntity<ArtifactV1>(rec, "Artifact", "artifacts.json"));

  const relationsLines = readJsonlFile<Record<string, unknown>>(
    path.join(baseDir, "relations.jsonl")
  );
  const relations = relationsLines.map((rec, idx) => parseRelation(rec, idx + 1));

  const rastreabilidadeLines = readJsonlFile<Record<string, unknown>>(
    path.join(baseDir, "manual_rastreabilidade.jsonl")
  );
  const rastreabilidade = rastreabilidadeLines.map((rec, idx) =>
    parseRastreabilidade(rec, idx + 1)
  );

  const slicesById = new Map<string, AppSecSlice>();
  for (const slice of slices) slicesById.set(slice.slice_id, slice);

  const entityById = new Map<string, V1Entity>();
  for (const entity of controlObjectives) entityById.set(entity.entity_id, entity);
  for (const entity of mechanisms) entityById.set(entity.entity_id, entity);
  for (const entity of practices) entityById.set(entity.entity_id, entity);
  for (const entity of artifacts) entityById.set(entity.entity_id, entity);

  const relationsBySubject = new Map<string, AppSecRelation[]>();
  const relationsByObject = new Map<string, AppSecRelation[]>();
  for (const relation of relations) {
    pushToMap(relationsBySubject, relation.subject_id, relation);
    pushToMap(relationsByObject, relation.object_id, relation);
  }

  const rastreabilidadeByV1EntityId = new Map<string, ManualRastreabilidadeEntry[]>();
  const rastreabilidadeByManualEntityId = new Map<string, ManualRastreabilidadeEntry[]>();
  for (const entry of rastreabilidade) {
    if (entry.v1_entity_id) {
      pushToMap(rastreabilidadeByV1EntityId, entry.v1_entity_id, entry);
    }
    if (entry.manual_v2_entity_id) {
      pushToMap(rastreabilidadeByManualEntityId, entry.manual_v2_entity_id, entry);
    }
  }

  const loadedEntityCounts = {
    control_objectives: controlObjectives.length,
    mechanisms: mechanisms.length,
    practices: practices.length,
    artifacts: artifacts.length,
    total: controlObjectives.length + mechanisms.length + practices.length + artifacts.length
  };

  const loadedRelationCounts = {
    belongsToSlice: relations.filter((r) => r.predicate === "belongsToSlice").length,
    objective_realized_by_practice: relations.filter(
      (r) => r.predicate === "objective_realized_by_practice"
    ).length,
    objective_implemented_by_mechanism: relations.filter(
      (r) => r.predicate === "objective_implemented_by_mechanism"
    ).length,
    total: relations.length
  };

  const fileChecksumStatus: V1ConsistencyReport["fileChecksumStatus"] = {};
  const provenanceFiles: G2RuntimeProvenance["files"] = {};
  for (const [key, entry] of Object.entries(manifest.files)) {
    const relativeFile = entry.path.startsWith("v1/")
      ? entry.path.slice("v1/".length)
      : entry.path;
    const absolute = path.join(baseDir, relativeFile);
    if (!existsSync(absolute)) {
      // optional files in manifest (e.g. manual_maturity_progression, manual_threat_mitigation)
      // may not be required for loaders, but we still record an absent status when manifest declares them.
      fileChecksumStatus[key] = {
        expected: entry.sha256,
        actual: "<absent>",
        matches: false
      };
      continue;
    }
    const actual = sha256OfFile(absolute);
    fileChecksumStatus[key] = {
      expected: entry.sha256,
      actual,
      matches: actual === entry.sha256
    };
    provenanceFiles[key] = { absolutePath: absolute, sha256: actual };
  }

  const consistency = buildConsistencyReport({
    manifest,
    loadedEntityCounts,
    loadedRelationCounts,
    fileChecksumStatus
  });

  const provenance: G2RuntimeProvenance = {
    source: "runtime_v1",
    baseDir,
    manifestPath,
    manifestSha256: sha256OfFile(manifestPath),
    files: provenanceFiles
  };

  return {
    manifest,
    slices,
    controlObjectives,
    mechanisms,
    practices,
    artifacts,
    relations,
    rastreabilidade,
    slicesById,
    entityById,
    relationsBySubject,
    relationsByObject,
    rastreabilidadeByV1EntityId,
    rastreabilidadeByManualEntityId,
    consistency,
    provenance
  };
}

export function getG2Runtime(): G2RuntimeData {
  if (!_cache) {
    _cache = loadG2Runtime();
  }
  return _cache;
}

export function clearG2RuntimeCacheForTests(): void {
  _cache = undefined;
}

/**
 * Returns the v1_entity_name from `manual_rastreabilidade.jsonl` when a
 * substantive substrate_landing entry exists for the given v1 entity id.
 *
 * Returns `undefined` when no name is published — callers MUST NOT invent
 * names; G2 grounding rules require deterministic provenance.
 */
export function getV1EntityDisplayName(
  data: G2RuntimeData,
  entityId: string
): string | undefined {
  const bucket = data.rastreabilidadeByV1EntityId.get(entityId);
  if (!bucket) return undefined;
  for (const entry of bucket) {
    if (entry.rastreabilidade_role === "substrate_landing" && entry.v1_entity_name) {
      return entry.v1_entity_name;
    }
  }
  return undefined;
}
