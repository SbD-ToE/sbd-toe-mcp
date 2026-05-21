import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  _resolveEntities,
  handleResolveEntities,
  isOverlayRecordType,
  isRuntimeV1RecordType
} from "./resolve-entities.js";
import {
  RuntimeV1AssetMissingError,
  clearG2RuntimeCacheForTests
} from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const ITEMS: unknown[] = [
  { record_type: "requirement", requirement_id: "AUT-001", category: "AUT", applicable_levels: { L1: false, L2: true, L3: true }, source_chapter: 2, cvss_score: null },
  { record_type: "requirement", requirement_id: "LOG-001", category: "LOG", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 2 },
  { record_type: "requirement", requirement_id: "VAL-001", category: "VAL", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 6 },
  { record_type: "control",     control_id: "CTRL-001", domain: "identity",      chapter_ids: ["02-requisitos"] },
  { record_type: "control",     control_id: "CTRL-002", domain: "monitoring",    chapter_ids: ["12-monit"] },
  { record_type: "threat",      mitigated_threat_id: "MT-001", chapter_id: "02", cvss_score: 8.5 },
  { record_type: "threat",      mitigated_threat_id: "MT-002", chapter_id: "06", cvss_score: 3.0 },
  { record_type: "role",        entity_id: "developer", aliases: ["dev", "Dev"] },
  { record_type: "role",        entity_id: "appsec",    aliases: ["AppSec"] },
  { record_type: "assignment",  id: "asgn-001", role: "developer", phase: "design", risk_level: "L1" },
  { record_type: "assignment",  id: "asgn-002", role: "appsec",    phase: "test",   risk_level: "L2" },
  { record_type: "user_story",  id: "us-001", practice_id: "01:prac-a", roles_normalized: ["developer"] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveEntities", () => {
  it("throws when record_type is missing", () => {
    let err: unknown;
    try { _resolveEntities({}, ITEMS); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("record_type");
  });

  it("returns all items of given record_type when no filters", () => {
    const r = _resolveEntities({ record_type: "requirement" }, ITEMS);
    expect(r.record_type).toBe("requirement");
    expect(r.total).toBe(3);
    expect(r.entities).toHaveLength(3);
  });

  it("exact field filter", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { category: "AUT" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["requirement_id"]).toBe("AUT-001");
  });

  it("dot-notation filter on nested field", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { "applicable_levels.L2": true } }, ITEMS);
    expect(r.total).toBe(3); // all have L2: true
  });

  it("dot-notation filter — L1 false excludes AUT-001", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { "applicable_levels.L1": true } }, ITEMS);
    expect(r.total).toBe(2);
    const ids = r.entities.map((e) => (e as Record<string, unknown>)["requirement_id"]);
    expect(ids).not.toContain("AUT-001");
  });

  it("gte comparison operator on numeric field", () => {
    const r = _resolveEntities({ record_type: "threat", filters: { cvss_score: { gte: 7 } } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["mitigated_threat_id"]).toBe("MT-001");
  });

  it("lte comparison operator", () => {
    const r = _resolveEntities({ record_type: "threat", filters: { cvss_score: { lte: 5 } } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["mitigated_threat_id"]).toBe("MT-002");
  });

  it("in operator for set membership", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { category: { in: ["AUT", "VAL"] } } }, ITEMS);
    expect(r.total).toBe(2);
  });

  it("array field membership check", () => {
    // chapter_ids is an array — filter where value is in the array
    const r = _resolveEntities({ record_type: "control", filters: { chapter_ids: "12-monit" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["control_id"]).toBe("CTRL-002");
  });

  it("roles_normalized array membership", () => {
    const r = _resolveEntities({ record_type: "user_story", filters: { roles_normalized: "developer" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["id"]).toBe("us-001");
  });

  it("combined filters (AND logic)", () => {
    const r = _resolveEntities({ record_type: "assignment", filters: { role: "developer", phase: "design" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["id"]).toBe("asgn-001");
  });

  it("limit is respected", () => {
    const r = _resolveEntities({ record_type: "requirement", limit: 2 }, ITEMS);
    expect(r.entities).toHaveLength(2);
    expect(r.total).toBe(3); // total is untruncated
    expect(r.limit).toBe(2);
  });

  it("limit capped at MAX_LIMIT (200)", () => {
    const r = _resolveEntities({ record_type: "requirement", limit: 9999 }, ITEMS);
    expect(r.limit).toBe(200);
  });

  it("returns empty when record_type has no items", () => {
    const r = _resolveEntities({ record_type: "nonexistent" }, ITEMS);
    expect(r.total).toBe(0);
    expect(r.entities).toHaveLength(0);
  });

  it("empty filters object returns all of record_type", () => {
    const r = _resolveEntities({ record_type: "role", filters: {} }, ITEMS);
    expect(r.total).toBe(2);
  });

  it("meta.filtersApplied reflects the filters argument", () => {
    const filters = { category: "LOG" };
    const r = _resolveEntities({ record_type: "requirement", filters }, ITEMS);
    expect(r.meta.filtersApplied).toEqual(filters);
  });

  it("meta.note is a non-empty string", () => {
    const r = _resolveEntities({ record_type: "role" }, ITEMS);
    expect(typeof r.meta.note).toBe("string");
    expect(r.meta.note.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Record type classification
// ---------------------------------------------------------------------------

describe("record type classification", () => {
  it("recognises AppSec Core v1 record types", () => {
    expect(isRuntimeV1RecordType("appsec_slice")).toBe(true);
    expect(isRuntimeV1RecordType("control_objective")).toBe(true);
    expect(isRuntimeV1RecordType("mechanism")).toBe(true);
    expect(isRuntimeV1RecordType("appsec_practice")).toBe(true);
    expect(isRuntimeV1RecordType("appsec_artifact")).toBe(true);
    expect(isRuntimeV1RecordType("appsec_relation")).toBe(true);
  });

  it("recognises regulatory overlay record types", () => {
    expect(isOverlayRecordType("regulatory_framework")).toBe(true);
    expect(isOverlayRecordType("regulatory_obligation")).toBe(true);
    expect(isOverlayRecordType("regulatory_mapping")).toBe(true);
    expect(isOverlayRecordType("regulatory_playbook")).toBe(true);
  });

  it("does not misclassify runtime v0 record types", () => {
    for (const v0Type of ["requirement", "control", "threat", "practice"]) {
      expect(isRuntimeV1RecordType(v0Type)).toBe(false);
      expect(isOverlayRecordType(v0Type)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// handleResolveEntities — runtime v0 (existing behaviour, integration)
// ---------------------------------------------------------------------------

describe("handleResolveEntities — runtime v0 routing", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("returns runtime_v0 provenance and known requirement records", () => {
    const result = handleResolveEntities({ record_type: "requirement", limit: 5 });
    expect(result.provenance.produced_by).toBe("direct_runtime_lookup");
    expect(result.provenance.source_data).toBe("data/publish/runtime/*.json");
    expect(result.total).toBeGreaterThan(0);
    expect(result.entities.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// handleResolveEntities — AppSec Core v1 routing (integration with on-disk)
// ---------------------------------------------------------------------------

describe("handleResolveEntities — runtime v1 routing", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
  });

  it("returns runtime_v1 provenance for appsec_slice", () => {
    const result = handleResolveEntities({ record_type: "appsec_slice", limit: 3 });
    expect(result.provenance.produced_by).toBe("direct_runtime_v1_lookup");
    expect(result.provenance.source_data).toBe("data/publish/runtime/v1/*");
    expect(result.total).toBeGreaterThan(0);
    expect(result.entities[0]).toMatchObject({ slice_id: expect.stringMatching(/^ASC-/) });
  });

  it("returns control_objective entities filterable by slice_id", () => {
    const result = handleResolveEntities({
      record_type: "control_objective",
      filters: { slice_id: "ASC-01" },
      limit: 100
    });
    expect(result.total).toBeGreaterThan(0);
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(entity["slice_id"]).toBe("ASC-01");
      expect(entity["entity_type"]).toBe("ControlObjective");
    }
  });

  it("returns mechanism / practice / artifact entities with correct entity_type", () => {
    const m = handleResolveEntities({ record_type: "mechanism", limit: 1 });
    expect((m.entities[0] as Record<string, unknown>)["entity_type"]).toBe("Mechanism");

    const p = handleResolveEntities({ record_type: "appsec_practice", limit: 1 });
    expect((p.entities[0] as Record<string, unknown>)["entity_type"]).toBe("Practice");

    const a = handleResolveEntities({ record_type: "appsec_artifact", limit: 1 });
    expect((a.entities[0] as Record<string, unknown>)["entity_type"]).toBe("Artifact");
  });

  it("returns appsec_relation entities filterable by predicate (dot-notation + in op)", () => {
    const result = handleResolveEntities({
      record_type: "appsec_relation",
      filters: { predicate: { in: ["belongsToSlice"] } },
      limit: 500
    });
    expect(result.total).toBeGreaterThan(0);
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(entity["predicate"]).toBe("belongsToSlice");
    }
  });

  it("preserves null object_type for objective_* relations in the response", () => {
    const result = handleResolveEntities({
      record_type: "appsec_relation",
      filters: { predicate: "objective_implemented_by_mechanism" },
      limit: 3
    });
    expect(result.total).toBeGreaterThan(0);
    // _resolveEntities strips null values for compactness, so the absence of
    // object_type is the canonical observable signal for an objective_* edge.
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(entity).not.toHaveProperty("object_type");
      expect(entity["predicate"]).toBe("objective_implemented_by_mechanism");
    }
  });

  it("respects limit / total semantics for v1 record types", () => {
    const result = handleResolveEntities({ record_type: "appsec_artifact", limit: 2 });
    expect(result.entities).toHaveLength(2);
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.limit).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// handleResolveEntities — runtime v1 missing → fails clearly
// ---------------------------------------------------------------------------

describe("handleResolveEntities — runtime v1 missing", () => {
  const originalAppRoot = process.env.SBD_TOE_APP_ROOT;
  let scratchRoot: string | undefined;

  beforeEach(async () => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
    scratchRoot = await mkdtemp(path.join(tmpdir(), "resolve-no-v1-"));
    // Empty app root: no data/publish/runtime/v1 directory.
    process.env.SBD_TOE_APP_ROOT = scratchRoot;
  });

  afterAll(() => {
    if (originalAppRoot === undefined) {
      delete process.env.SBD_TOE_APP_ROOT;
    } else {
      process.env.SBD_TOE_APP_ROOT = originalAppRoot;
    }
  });

  it("throws RuntimeV1AssetMissingError for v1 record types when runtime/v1 is absent", () => {
    expect(() =>
      handleResolveEntities({ record_type: "appsec_slice" })
    ).toThrow(RuntimeV1AssetMissingError);
  });

  it("includes the missing path list in the error", () => {
    try {
      handleResolveEntities({ record_type: "control_objective" });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeV1AssetMissingError);
      const err = error as RuntimeV1AssetMissingError;
      expect(err.missingPaths.length).toBeGreaterThan(0);
    } finally {
      if (scratchRoot) {
        rm(scratchRoot, { recursive: true, force: true });
      }
      // Restore real app root for subsequent tests.
      if (originalAppRoot === undefined) {
        delete process.env.SBD_TOE_APP_ROOT;
      } else {
        process.env.SBD_TOE_APP_ROOT = originalAppRoot;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// handleResolveEntities — regulatory overlay
// ---------------------------------------------------------------------------

describe("handleResolveEntities — regulatory overlay routing", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("returns overlay provenance and frameworks when overlay is published", () => {
    const result = handleResolveEntities({ record_type: "regulatory_framework", limit: 10 });
    if (result.total === 0 && result.provenance.source_data.includes("absent")) {
      // Overlay is allowed to be absent in environments without it; assert the
      // absent-shape contract is honoured.
      expect(result.entities).toEqual([]);
      expect(result.meta.note).toMatch(/ausente/i);
      return;
    }
    expect(result.provenance.produced_by).toBe("direct_overlay_lookup");
    expect(result.provenance.source_data).toBe("data/publish/overlay/*");
    expect(result.total).toBeGreaterThan(0);
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(typeof entity["framework_id"]).toBe("string");
      expect(entity["framework_id"] as string).toMatch(/^EXT-/);
    }
  });

  it("returns regulatory_mapping entities filterable by mapping_type", () => {
    const result = handleResolveEntities({
      record_type: "regulatory_mapping",
      filters: { mapping_type: "obligation_maps_to_practice" },
      limit: 50
    });
    if (result.total === 0 && result.provenance.source_data.includes("absent")) {
      return;
    }
    expect(result.total).toBeGreaterThan(0);
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(entity["mapping_type"]).toBe("obligation_maps_to_practice");
    }
  });

  it("returns regulatory_playbook entities with framework_ids preserved", () => {
    const result = handleResolveEntities({ record_type: "regulatory_playbook", limit: 5 });
    if (result.total === 0 && result.provenance.source_data.includes("absent")) {
      return;
    }
    for (const entity of result.entities as Array<Record<string, unknown>>) {
      expect(Array.isArray(entity["framework_ids"])).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// handleResolveEntities — overlay absent → graceful empty + provenance
// ---------------------------------------------------------------------------

describe("handleResolveEntities — overlay absent", () => {
  const originalAppRoot = process.env.SBD_TOE_APP_ROOT;
  let scratchRoot: string | undefined;

  beforeEach(async () => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
    scratchRoot = await mkdtemp(path.join(tmpdir(), "resolve-no-overlay-"));
    process.env.SBD_TOE_APP_ROOT = scratchRoot;
  });

  afterAll(() => {
    if (originalAppRoot === undefined) {
      delete process.env.SBD_TOE_APP_ROOT;
    } else {
      process.env.SBD_TOE_APP_ROOT = originalAppRoot;
    }
  });

  it("returns total:0 with absent-reason metadata for every overlay record type", () => {
    for (const recordType of [
      "regulatory_framework",
      "regulatory_obligation",
      "regulatory_mapping",
      "regulatory_playbook"
    ] as const) {
      const result = handleResolveEntities({ record_type: recordType });
      expect(result.total).toBe(0);
      expect(result.entities).toEqual([]);
      expect(result.provenance.produced_by).toBe("direct_overlay_lookup");
      expect(result.provenance.source_data).toMatch(/absent/i);
      expect(result.meta.note.toLowerCase()).toContain("ausente");
    }
    if (scratchRoot) {
      rm(scratchRoot, { recursive: true, force: true });
    }
    if (originalAppRoot === undefined) {
      delete process.env.SBD_TOE_APP_ROOT;
    } else {
      process.env.SBD_TOE_APP_ROOT = originalAppRoot;
    }
  });
});

// ---------------------------------------------------------------------------
// Fixture-based reachability tests (use _resolveEntities directly with tagged
// items so we exercise dot-notation/limit on every new record type).
// ---------------------------------------------------------------------------

describe("_resolveEntities — new record types via fixtures", () => {
  const V1_FIXTURE: unknown[] = [
    { record_type: "appsec_slice", slice_id: "ASC-01", objective_family: "ACO-SCBI", counts_actual: { mechanisms: 5 } },
    { record_type: "appsec_slice", slice_id: "ASC-02", objective_family: "ACO-IAT", counts_actual: { mechanisms: 6 } },
    { record_type: "control_objective", entity_id: "ACO-SCBI-001", slice_id: "ASC-01", entity_type: "ControlObjective" },
    { record_type: "mechanism", entity_id: "ACM-SCBI-001", slice_id: "ASC-01", entity_type: "Mechanism" },
    { record_type: "appsec_practice", entity_id: "ACP-SCBI-001", slice_id: "ASC-01", entity_type: "Practice" },
    { record_type: "appsec_artifact", entity_id: "ACA-SCBI-001", slice_id: "ASC-01", entity_type: "Artifact" },
    { record_type: "appsec_relation", subject_id: "ACO-SCBI-001", subject_type: "ControlObjective", predicate: "objective_realized_by_practice", object_id: "ACP-SCBI-001", object_type: null }
  ];

  const OVERLAY_FIXTURE: unknown[] = [
    { record_type: "regulatory_framework", framework_id: "EXT-DORA", short_code: "DORA", name: "Digital Operational Resilience Act" },
    { record_type: "regulatory_obligation", obligation_id: "EXT-CRA-OBL-cadeia-fornecimento", framework_id: "EXT-CRA", title: "Cadeia Fornecimento" },
    { record_type: "regulatory_mapping", mapping_id: "MAP-1", framework_id: "EXT-CRA", obligation_id: "EXT-CRA-OBL-cadeia-fornecimento", target_id: "02-requisitos:assinatura", target_type: "Practice", mapping_type: "obligation_maps_to_practice", confidence: 0.87 },
    { record_type: "regulatory_playbook", playbook_id: "OVR-DORA-playbook", framework_ids: ["EXT-DORA"], title: "DORA Playbook" }
  ];

  it("dot-notation filter on appsec_slice nested counts", () => {
    const r = _resolveEntities(
      { record_type: "appsec_slice", filters: { "counts_actual.mechanisms": { gte: 6 } } },
      V1_FIXTURE
    );
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["slice_id"]).toBe("ASC-02");
  });

  it("array membership filter on regulatory_playbook framework_ids", () => {
    const r = _resolveEntities(
      { record_type: "regulatory_playbook", filters: { framework_ids: "EXT-DORA" } },
      OVERLAY_FIXTURE
    );
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["playbook_id"]).toBe("OVR-DORA-playbook");
  });

  it("gte/lte filter on regulatory_mapping confidence", () => {
    const r = _resolveEntities(
      { record_type: "regulatory_mapping", filters: { confidence: { gte: 0.8 } } },
      OVERLAY_FIXTURE
    );
    expect(r.total).toBe(1);
  });
});

// Keep TypeScript happy: createHash is intentionally imported to support future
// fixture-based provenance assertions without re-importing per test block.
void createHash;
