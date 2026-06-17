/**
 * resolve_entities
 *
 * Low-level entity resolver over the published SbD-ToE deterministic artefacts.
 *
 * Three independent sources, each with its own provenance:
 *
 *   - runtime_v0 — `data/publish/runtime/*.json` (existing requirement /
 *     control / threat / artifact / signal / antipattern record types).
 *   - runtime_v1 — `data/publish/runtime/v1/*` (AppSec Core v1 slices,
 *     control objectives, mechanisms, practices, artifacts and relations).
 *   - overlay   — `data/publish/overlay/*` (regulatory frameworks,
 *     obligations, mappings and playbooks).
 *
 * The routing is decided by `record_type`. Each branch loads only what it
 * needs, so an absent overlay or a missing runtime/v1 directory affects only
 * the corresponding record types.
 */

import {
  RuntimeV1AssetMissingError,
  getG2Runtime,
  type AppSecRelation,
  type AppSecSlice,
  type ArtifactV1,
  type ControlObjectiveV1,
  type G2RuntimeData,
  type MechanismV1,
  type PracticeV1
} from "./g2-runtime-loader.js";
import { getOntologyData } from "./ontology-loader.js";
import {
  getRegulatoryOverlay,
  type RegulatoryFramework,
  type RegulatoryMapping,
  type RegulatoryObligation,
  type RegulatoryOverlayData,
  type RegulatoryPlaybook
} from "./regulatory-overlay-loader.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { resolveEntitiesAffordances } from "../serving/affordances.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface ComparisonOp {
  gte?: number;
  lte?: number;
  in?: unknown[];
}

function isComparisonOp(v: unknown): v is ComparisonOp {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.some((k) => k === "gte" || k === "lte" || k === "in");
}

export interface McpProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface ResolveEntitiesResult {
  provenance: McpProvenance;
  record_type: string;
  entities: unknown[];
  total: number;
  limit: number;
  meta: {
    filtersApplied: Record<string, unknown>;
    note: string;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next (advisory; may be absent). */
  next?: Affordance[];
}

type RuntimeV0RecordType =
  | "requirement"
  | "control"
  | "practice"
  | "assignment"
  | "user_story"
  | "role"
  | "phase"
  | "artifact"
  | "threat"
  | "evidence_pattern"
  | "signal"
  | "antipattern"
  | "requirement_control_link"
  | "signal_evidence_link"
  | "antipattern_requirement_link"
  | "antipattern_threat_link";

type RuntimeV1RecordType =
  | "appsec_slice"
  | "control_objective"
  | "mechanism"
  | "appsec_practice"
  | "appsec_artifact"
  | "appsec_relation";

type OverlayRecordType =
  | "regulatory_framework"
  | "regulatory_obligation"
  | "regulatory_mapping"
  | "regulatory_playbook";

const RUNTIME_V1_RECORD_TYPES: ReadonlySet<RuntimeV1RecordType> = new Set([
  "appsec_slice",
  "control_objective",
  "mechanism",
  "appsec_practice",
  "appsec_artifact",
  "appsec_relation"
]);

const OVERLAY_RECORD_TYPES: ReadonlySet<OverlayRecordType> = new Set([
  "regulatory_framework",
  "regulatory_obligation",
  "regulatory_mapping",
  "regulatory_playbook"
]);

export function isRuntimeV1RecordType(value: string): value is RuntimeV1RecordType {
  return RUNTIME_V1_RECORD_TYPES.has(value as RuntimeV1RecordType);
}

export function isOverlayRecordType(value: string): value is OverlayRecordType {
  return OVERLAY_RECORD_TYPES.has(value as OverlayRecordType);
}

let _runtimeV0Cache: unknown[] | undefined;

function withRecordType(record_type: string, items: unknown[]): unknown[] {
  return items.map((item) =>
    typeof item === "object" && item !== null
      ? { record_type, ...(item as Record<string, unknown>) }
      : item
  );
}

function loadRuntimeV0Items(): unknown[] {
  if (_runtimeV0Cache) return _runtimeV0Cache;

  const ontology = getOntologyData();
  const collections: Array<[RuntimeV0RecordType, unknown[]]> = [
    ["requirement", ontology.requirements],
    ["control", ontology.controls],
    ["practice", ontology.practices ?? []],
    ["assignment", ontology.assignments],
    ["user_story", ontology.userStories],
    ["role", ontology.roles],
    ["phase", ontology.phases ?? []],
    ["artifact", ontology.artifacts ?? []],
    ["threat", ontology.threats],
    ["evidence_pattern", ontology.evidencePatterns ?? []],
    ["signal", ontology.signals ?? []],
    ["antipattern", ontology.antipatterns ?? []],
    ["requirement_control_link", ontology.requirementControlLinks ?? []],
    ["signal_evidence_link", ontology.signalEvidenceLinks ?? []],
    ["antipattern_requirement_link", ontology.antipatternRequirementLinks ?? []],
    ["antipattern_threat_link", ontology.antipatternThreatLinks ?? []]
  ];

  _runtimeV0Cache = collections.flatMap(([record_type, items]) =>
    withRecordType(record_type, items)
  );
  return _runtimeV0Cache;
}

function clearRuntimeV0CacheForTests(): void {
  _runtimeV0Cache = undefined;
}

export const __internal = {
  clearRuntimeV0CacheForTests
};

function selectV1Items(
  recordType: RuntimeV1RecordType,
  data: G2RuntimeData
): unknown[] {
  switch (recordType) {
    case "appsec_slice":
      return withRecordType(recordType, data.slices as unknown as AppSecSlice[]);
    case "control_objective":
      return withRecordType(recordType, data.controlObjectives as unknown as ControlObjectiveV1[]);
    case "mechanism":
      return withRecordType(recordType, data.mechanisms as unknown as MechanismV1[]);
    case "appsec_practice":
      return withRecordType(recordType, data.practices as unknown as PracticeV1[]);
    case "appsec_artifact":
      return withRecordType(recordType, data.artifacts as unknown as ArtifactV1[]);
    case "appsec_relation":
      return withRecordType(recordType, data.relations as unknown as AppSecRelation[]);
  }
}

function selectOverlayItems(
  recordType: OverlayRecordType,
  data: RegulatoryOverlayData
): unknown[] {
  switch (recordType) {
    case "regulatory_framework":
      return withRecordType(recordType, data.frameworks as unknown as RegulatoryFramework[]);
    case "regulatory_obligation":
      return withRecordType(recordType, data.obligations as unknown as RegulatoryObligation[]);
    case "regulatory_mapping":
      return withRecordType(recordType, data.mappings as unknown as RegulatoryMapping[]);
    case "regulatory_playbook":
      return withRecordType(recordType, data.playbooks as unknown as RegulatoryPlaybook[]);
  }
}

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchesFilter(item: unknown, key: string, filterValue: unknown): boolean {
  const fieldVal = resolvePath(item, key);

  if (isComparisonOp(filterValue)) {
    if ("gte" in filterValue && filterValue.gte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : Number.NaN;
      if (Number.isNaN(n) || n < filterValue.gte) return false;
    }
    if ("lte" in filterValue && filterValue.lte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : Number.NaN;
      if (Number.isNaN(n) || n > filterValue.lte) return false;
    }
    if ("in" in filterValue && Array.isArray(filterValue.in)) {
      if (!filterValue.in.includes(fieldVal)) return false;
    }
    return true;
  }

  if (Array.isArray(fieldVal)) {
    return fieldVal.includes(filterValue);
  }

  return fieldVal === filterValue;
}

function matchesAllFilters(item: unknown, filters: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (!matchesFilter(item, key, value)) return false;
  }
  return true;
}

const DEFAULT_NOTE =
  "Entities resolved from the published deterministic runtime bundle. Filters support dot-notation for nested fields, {gte,lte} for numeric comparisons, {in:[...]} for membership and direct array membership checks.";

export function _resolveEntities(
  args: Record<string, unknown>,
  items: unknown[],
  options: { note?: string } = {}
): Omit<ResolveEntitiesResult, "provenance"> {
  const recordType = args["record_type"];
  if (typeof recordType !== "string" || recordType.trim().length === 0) {
    throw Object.assign(
      new Error('Missing required parameter: "record_type".'),
      { rpcError: { code: -32602, message: 'Missing required parameter: "record_type".' } }
    );
  }

  const rawLimit = args["limit"];
  const limit =
    typeof rawLimit === "number" && rawLimit > 0
      ? Math.min(Math.round(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const rawFilters = args["filters"];
  const filters: Record<string, unknown> =
    typeof rawFilters === "object" && rawFilters !== null && !Array.isArray(rawFilters)
      ? (rawFilters as Record<string, unknown>)
      : {};

  const matched = items.filter((item) => {
    if (typeof item !== "object" || item === null) return false;
    const rt = (item as Record<string, unknown>)["record_type"];
    if (rt !== recordType) return false;
    return matchesAllFilters(item, filters);
  });

  const STRIP_FIELDS = new Set(["confidence", "warnings", "evidence", "record_type"]);
  const ARRAY_CAP = 8;
  const entities = matched.slice(0, limit).map((item) => {
    if (typeof item !== "object" || item === null) return item;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (STRIP_FIELDS.has(key)) continue;
      if (value === null || (Array.isArray(value) && value.length === 0)) continue;
      out[key] = Array.isArray(value) && value.length > ARRAY_CAP ? value.slice(0, ARRAY_CAP) : value;
    }
    return out;
  });

  return {
    record_type: recordType,
    entities,
    total: matched.length,
    limit,
    meta: {
      filtersApplied: filters,
      note: options.note ?? DEFAULT_NOTE
    }
  };
}

const RUNTIME_V0_PROVENANCE: McpProvenance = {
  content_type: "canonical",
  produced_by: "direct_runtime_lookup",
  source_data: "data/publish/runtime/*.json",
  note: "Entities are canonical deterministic runtime records, projected only for response compactness."
};

const RUNTIME_V1_PROVENANCE: McpProvenance = {
  content_type: "canonical",
  produced_by: "direct_runtime_v1_lookup",
  source_data: "data/publish/runtime/v1/*",
  note:
    "Entities are AppSec Core v1 records loaded from data/publish/runtime/v1/ with manifest-checked counts. " +
    "Names are surfaced only when manual_rastreabilidade.jsonl publishes them — never invented."
};

const OVERLAY_PROVENANCE_PUBLISHED: McpProvenance = {
  content_type: "canonical",
  produced_by: "direct_overlay_lookup",
  source_data: "data/publish/overlay/*",
  note:
    "Regulatory overlay records are loaded from data/publish/overlay/. The overlay is an external normative cross-check, not an SbD-ToE compliance claim."
};

const OVERLAY_PROVENANCE_ABSENT: McpProvenance = {
  content_type: "canonical",
  produced_by: "direct_overlay_lookup",
  source_data: "data/publish/overlay/* (absent)",
  note:
    "Regulatory overlay artefacts are not published in this deployment. No regulatory record types are available."
};

function emptyOverlayResult(
  recordType: string,
  args: Record<string, unknown>,
  absentReason: string
): ResolveEntitiesResult {
  const rawLimit = args["limit"];
  const limit =
    typeof rawLimit === "number" && rawLimit > 0
      ? Math.min(Math.round(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const rawFilters = args["filters"];
  const filters: Record<string, unknown> =
    typeof rawFilters === "object" && rawFilters !== null && !Array.isArray(rawFilters)
      ? (rawFilters as Record<string, unknown>)
      : {};
  return {
    provenance: OVERLAY_PROVENANCE_ABSENT,
    record_type: recordType,
    entities: [],
    total: 0,
    limit,
    meta: {
      filtersApplied: filters,
      note: `Overlay regulatório ausente: ${absentReason}. Nenhum registo regulatório disponível.`
    }
  };
}

export function handleResolveEntities(args: Record<string, unknown>): ResolveEntitiesResult {
  // RF-H: append the advisory band around the deterministic resolution (pure, ≤3).
  return { ...resolveEntitiesCore(args), next: resolveEntitiesAffordances() };
}

function resolveEntitiesCore(
  args: Record<string, unknown>
): ResolveEntitiesResult {
  const recordType = args["record_type"];
  if (typeof recordType !== "string" || recordType.trim().length === 0) {
    // Defer the structured error to _resolveEntities so the message stays consistent.
    const result = _resolveEntities(args, []);
    return { provenance: RUNTIME_V0_PROVENANCE, ...result };
  }

  if (isRuntimeV1RecordType(recordType)) {
    const data = getG2Runtime();
    const items = selectV1Items(recordType, data);
    const result = _resolveEntities(args, items, {
      note:
        "AppSec Core v1 records. Filters support dot-notation, {gte,lte}, {in:[...]} and array membership. Provenance: data/publish/runtime/v1/*."
    });
    return { provenance: RUNTIME_V1_PROVENANCE, ...result };
  }

  if (isOverlayRecordType(recordType)) {
    const overlay = getRegulatoryOverlay();
    if (overlay.status === "absent") {
      return emptyOverlayResult(
        recordType,
        args,
        overlay.absentReason ?? "overlay artefacts not published"
      );
    }
    const items = selectOverlayItems(recordType, overlay);
    const result = _resolveEntities(args, items, {
      note:
        "Regulatory overlay records. Filters support dot-notation, {gte,lte}, {in:[...]} and array membership. Provenance: data/publish/overlay/*."
    });
    return { provenance: OVERLAY_PROVENANCE_PUBLISHED, ...result };
  }

  const result = _resolveEntities(args, loadRuntimeV0Items());
  return { provenance: RUNTIME_V0_PROVENANCE, ...result };
}

export { RuntimeV1AssetMissingError };
