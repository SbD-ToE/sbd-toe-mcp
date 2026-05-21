import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  RuntimeV1AssetMissingError,
  clearG2RuntimeCacheForTests,
  getV1EntityDisplayName,
  loadG2Runtime
} from "./g2-runtime-loader.js";

function sha256OfString(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

interface Fixture {
  baseDir: string;
  files: Record<string, string>;
}

async function buildFixture(
  overrides: Partial<Record<string, string>> = {}
): Promise<Fixture> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "g2-runtime-fixture-"));

  const slices = [
    {
      slice_id: "ASC-01",
      scope: "supply_chain_and_build_integrity",
      objective_family: "ACO-SCBI",
      composite_objective: "ACO-SCBI-007",
      contract_status: "working_contract",
      contract_file: "appsec-core-supply-chain-build-integrity-slice-contract.yaml",
      counts_actual: { artifacts: 1, control_objectives: 1, mechanisms: 1, practices: 1 },
      counts_declared: { artifacts: 1, control_objectives: 1, mechanisms: 1, practices: 1 },
      drift_fields: []
    },
    {
      slice_id: "ASC-02",
      scope: "identity_access_and_session_trust",
      objective_family: "ACO-IAT",
      composite_objective: "ACO-IAT-007",
      contract_status: "working_contract",
      contract_file: "appsec-core-identity-access-session-trust-slice-contract.yaml",
      counts_actual: { artifacts: 0, control_objectives: 1, mechanisms: 0, practices: 0 },
      counts_declared: { artifacts: 0, control_objectives: 1, mechanisms: 0, practices: 0 },
      drift_fields: []
    }
  ];

  const controlObjectives = [
    {
      entity_id: "ACO-SCBI-001",
      entity_type: "ControlObjective",
      role: "atomic",
      slice_family: "ACO-SCBI",
      slice_id: "ASC-01"
    },
    {
      entity_id: "ACO-IAT-001",
      entity_type: "ControlObjective",
      role: "atomic",
      slice_family: "ACO-IAT",
      slice_id: "ASC-02"
    }
  ];

  const mechanisms = [
    {
      entity_id: "ACM-SCBI-001",
      entity_type: "Mechanism",
      slice_family: "ACO-SCBI",
      slice_id: "ASC-01"
    }
  ];

  const practices = [
    {
      entity_id: "ACP-SCBI-001",
      entity_type: "Practice",
      slice_family: "ACO-SCBI",
      slice_id: "ASC-01"
    }
  ];

  const artifacts = [
    {
      entity_id: "ACA-SCBI-001",
      entity_type: "Artifact",
      slice_family: "ACO-SCBI",
      slice_id: "ASC-01"
    }
  ];

  const relationsJsonl = [
    {
      subject_id: "ACA-SCBI-001",
      subject_type: "Artifact",
      predicate: "belongsToSlice",
      object_id: "ASC-01",
      object_type: "Slice"
    },
    {
      subject_id: "ACO-SCBI-001",
      subject_type: "ControlObjective",
      predicate: "objective_realized_by_practice",
      object_id: "ACP-SCBI-001",
      object_type: "Practice"
    },
    {
      subject_id: "ACO-SCBI-001",
      subject_type: "ControlObjective",
      predicate: "objective_implemented_by_mechanism",
      object_id: "ACM-SCBI-001",
      object_type: "Mechanism"
    }
  ];

  const rastreabilidadeJsonl = [
    {
      rastreabilidade_role: "manual_v2_entity",
      coverage_status: "v2_entity_index",
      iter_introduced: "run-2",
      manual_chapter: "01-classificacao-aplicacoes",
      manual_file: "canon/25-rastreabilidade.md",
      manual_commit_sha: "455124a18be9bc154caeab249bd34d9d75a8303e",
      manual_v2_entity_id: "CLA-001",
      manual_v2_entity_label: "Classificação formal",
      manual_v2_entity_type: "Requirement",
      manual_v2_authority_class: "normative",
      manual_v2_confidence_model: "deterministic",
      manual_v2_source_mode: "explicit"
    },
    {
      rastreabilidade_role: "substrate_landing",
      coverage_status: "substantive",
      iter_introduced: "run-2",
      manual_chapter: "03-threat-modeling",
      manual_commit_sha: "455124a18be9bc154caeab249bd34d9d75a8303e",
      manual_file: "canon/25-rastreabilidade.md",
      v1_entity_id: "ACM-SCBI-001",
      v1_entity_name: "Build Integrity Signing",
      v1_entity_type: "Mechanism",
      v1_family: "ACO-SCBI",
      v1_slice: "ASC-01",
      authority_class: "semantic",
      methodology_label: "Explícito"
    },
    {
      rastreabilidade_role: "placeholder",
      coverage_status: "placeholder",
      iter_introduced: "iter-3",
      manual_chapter: null,
      manual_file: null,
      v1_entity_id: "ACA-SCBI-001",
      v1_entity_type: "Artifact",
      v1_family: "ACO-SCBI",
      v1_slice: "ASC-01",
      placeholder_rationale: "Artifact entity exists in V1 OWL but not surfaced at entity level"
    }
  ];

  const filesByPath: Record<string, string> = {
    "slices.json": JSON.stringify(slices, null, 2),
    "control_objectives.json": JSON.stringify(controlObjectives, null, 2),
    "mechanisms.json": JSON.stringify(mechanisms, null, 2),
    "practices.json": JSON.stringify(practices, null, 2),
    "artifacts.json": JSON.stringify(artifacts, null, 2),
    "relations.jsonl": relationsJsonl.map((line) => JSON.stringify(line)).join("\n") + "\n",
    "manual_rastreabilidade.jsonl":
      rastreabilidadeJsonl.map((line) => JSON.stringify(line)).join("\n") + "\n"
  };

  for (const [relative, override] of Object.entries(overrides)) {
    if (typeof override === "string") {
      filesByPath[relative] = override;
    }
  }

  const manifest = {
    artifact_type: "v1_runtime_surface_manifest",
    build: { generated_at: "2026-05-21T00:00:00Z", generator: "test-fixture" },
    entity_counts: {
      actual: {
        artifacts: 1,
        control_objectives: 2,
        mechanisms: 1,
        practices: 1,
        total: 5
      },
      declared: {
        artifacts: 1,
        control_objectives: 2,
        mechanisms: 1,
        practices: 1,
        total: 5
      }
    },
    files: {
      slices: { path: "v1/slices.json", sha256: sha256OfString(filesByPath["slices.json"]!) },
      control_objectives: {
        path: "v1/control_objectives.json",
        sha256: sha256OfString(filesByPath["control_objectives.json"]!)
      },
      mechanisms: {
        path: "v1/mechanisms.json",
        sha256: sha256OfString(filesByPath["mechanisms.json"]!)
      },
      practices: {
        path: "v1/practices.json",
        sha256: sha256OfString(filesByPath["practices.json"]!)
      },
      artifacts: {
        path: "v1/artifacts.json",
        sha256: sha256OfString(filesByPath["artifacts.json"]!)
      },
      relations: {
        path: "v1/relations.jsonl",
        sha256: sha256OfString(filesByPath["relations.jsonl"]!)
      },
      manual_rastreabilidade: {
        path: "v1/manual_rastreabilidade.jsonl",
        sha256: sha256OfString(filesByPath["manual_rastreabilidade.jsonl"]!)
      }
    },
    relation_counts: {
      belongsToSlice: 1,
      objective_implemented_by_mechanism: 1,
      objective_realized_by_practice: 1,
      total: 3
    },
    slice_count: 2,
    warnings: ["ASC-99 mechanisms: declared=2 actual=1 (test fixture)"]
  };
  filesByPath["v1_manifest.json"] = JSON.stringify(manifest, null, 2);

  await mkdir(baseDir, { recursive: true });
  for (const [relative, contents] of Object.entries(filesByPath)) {
    await writeFile(path.join(baseDir, relative), contents, "utf8");
  }

  return { baseDir, files: filesByPath };
}

describe("loadG2Runtime", () => {
  let fixture: Fixture | undefined;

  beforeEach(() => {
    clearG2RuntimeCacheForTests();
  });

  afterEach(async () => {
    if (fixture) {
      await rm(fixture.baseDir, { recursive: true, force: true });
      fixture = undefined;
    }
  });

  it("loads the AppSec Core v1 surface and exposes deterministic provenance", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.slices.map((s) => s.slice_id)).toEqual(["ASC-01", "ASC-02"]);
    expect(data.controlObjectives).toHaveLength(2);
    expect(data.mechanisms).toHaveLength(1);
    expect(data.practices).toHaveLength(1);
    expect(data.artifacts).toHaveLength(1);
    expect(data.relations).toHaveLength(3);
    expect(data.provenance.source).toBe("runtime_v1");
    expect(data.provenance.baseDir).toBe(fixture.baseDir);
    expect(Object.keys(data.provenance.files)).toEqual(
      expect.arrayContaining(["slices", "relations", "manual_rastreabilidade"])
    );
  });

  it("indexes entities, slices and relations for O(1) lookup", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.entityById.get("ACO-SCBI-001")?.entity_type).toBe("ControlObjective");
    expect(data.entityById.get("ACM-SCBI-001")?.entity_type).toBe("Mechanism");
    expect(data.entityById.get("ACP-SCBI-001")?.entity_type).toBe("Practice");
    expect(data.entityById.get("ACA-SCBI-001")?.entity_type).toBe("Artifact");
    expect(data.slicesById.get("ASC-01")?.objective_family).toBe("ACO-SCBI");
    expect(data.relationsBySubject.get("ACO-SCBI-001")).toHaveLength(2);
    expect(data.relationsByObject.get("ASC-01")).toHaveLength(1);
  });

  it("reports manifest/loaded consistency without mismatches when fixture aligns", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.consistency.mismatches).toEqual([]);
    expect(data.consistency.loadedEntityCounts).toEqual({
      control_objectives: 2,
      mechanisms: 1,
      practices: 1,
      artifacts: 1,
      total: 5
    });
    expect(data.consistency.loadedRelationCounts).toEqual({
      belongsToSlice: 1,
      objective_realized_by_practice: 1,
      objective_implemented_by_mechanism: 1,
      total: 3
    });
    expect(data.consistency.warnings).toEqual([
      "ASC-99 mechanisms: declared=2 actual=1 (test fixture)"
    ]);
  });

  it("detects entity count drift between manifest and loaded data", async () => {
    fixture = await buildFixture();
    const extraMechanismsJson = JSON.stringify(
      [
        {
          entity_id: "ACM-SCBI-001",
          entity_type: "Mechanism",
          slice_family: "ACO-SCBI",
          slice_id: "ASC-01"
        },
        {
          entity_id: "ACM-SCBI-002",
          entity_type: "Mechanism",
          slice_family: "ACO-SCBI",
          slice_id: "ASC-01"
        }
      ],
      null,
      2
    );
    await writeFile(path.join(fixture.baseDir, "mechanisms.json"), extraMechanismsJson, "utf8");
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.consistency.mismatches).toEqual(
      expect.arrayContaining([
        expect.stringContaining("entity_counts.mechanisms: manifest=1 loaded=2"),
        expect.stringContaining("entity_counts.total")
      ])
    );
    expect(data.consistency.fileChecksumStatus.mechanisms?.matches).toBe(false);
  });

  it("detects relation count drift when relations.jsonl has unexpected predicates", async () => {
    fixture = await buildFixture({
      "relations.jsonl":
        JSON.stringify({
          subject_id: "ACA-SCBI-001",
          subject_type: "Artifact",
          predicate: "belongsToSlice",
          object_id: "ASC-01",
          object_type: "Slice"
        }) + "\n"
    });
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.consistency.mismatches).toEqual(
      expect.arrayContaining([
        expect.stringContaining("relation_counts.objective_realized_by_practice: manifest=1 loaded=0"),
        expect.stringContaining(
          "relation_counts.objective_implemented_by_mechanism: manifest=1 loaded=0"
        ),
        expect.stringContaining("relation_counts.total: manifest=3 loaded=1")
      ])
    );
  });

  it("throws RuntimeV1AssetMissingError when a required file is missing", async () => {
    fixture = await buildFixture();
    await rm(path.join(fixture.baseDir, "relations.jsonl"));

    expect(() => loadG2Runtime({ baseDir: fixture.baseDir })).toThrow(
      RuntimeV1AssetMissingError
    );
    try {
      loadG2Runtime({ baseDir: fixture.baseDir });
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeV1AssetMissingError);
      const missing = (error as RuntimeV1AssetMissingError).missingPaths;
      expect(missing).toEqual(
        expect.arrayContaining(["data/publish/runtime/v1/relations.jsonl"])
      );
    }
  });

  it("throws RuntimeV1AssetMissingError when the base dir does not exist", () => {
    expect(() =>
      loadG2Runtime({ baseDir: path.join(tmpdir(), "nonexistent-g2-fixture-dir") })
    ).toThrow(RuntimeV1AssetMissingError);
  });

  it("rejects malformed JSONL with a clear error including the line number", async () => {
    fixture = await buildFixture({ "relations.jsonl": "not-json\n" });
    expect(() => loadG2Runtime({ baseDir: fixture.baseDir })).toThrow(/relations\.jsonl linha 1/);
  });

  it("rejects entity files with mismatched entity_type", async () => {
    fixture = await buildFixture({
      "mechanisms.json": JSON.stringify(
        [
          {
            entity_id: "ACM-X-001",
            entity_type: "Practice",
            slice_family: "ACO-X",
            slice_id: "ASC-99"
          }
        ],
        null,
        2
      )
    });
    expect(() => loadG2Runtime({ baseDir: fixture.baseDir })).toThrow(
      /mechanisms.json: entity_type esperado=Mechanism/
    );
  });

  it("getV1EntityDisplayName returns the substrate_landing name when published", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(getV1EntityDisplayName(data, "ACM-SCBI-001")).toBe("Build Integrity Signing");
  });

  it("getV1EntityDisplayName returns undefined for placeholder entries (does not invent)", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(getV1EntityDisplayName(data, "ACA-SCBI-001")).toBeUndefined();
  });

  it("getV1EntityDisplayName returns undefined for unknown ids (does not invent)", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(getV1EntityDisplayName(data, "DOES-NOT-EXIST")).toBeUndefined();
  });

  it("preserves null object_type for objective_realized_by_practice / objective_implemented_by_mechanism relations", async () => {
    fixture = await buildFixture({
      "relations.jsonl":
        [
          {
            subject_id: "ACO-SCBI-001",
            subject_type: "ControlObjective",
            predicate: "objective_realized_by_practice",
            object_id: "ACP-SCBI-001",
            object_type: null
          }
        ]
          .map((line) => JSON.stringify(line))
          .join("\n") + "\n"
    });
    const data = loadG2Runtime({ baseDir: fixture.baseDir });
    expect(data.relations[0]?.object_type).toBeNull();
  });

  it("rejects relations.jsonl when object_type is neither string nor null", async () => {
    fixture = await buildFixture({
      "relations.jsonl":
        JSON.stringify({
          subject_id: "X",
          subject_type: "ControlObjective",
          predicate: "belongsToSlice",
          object_id: "Y",
          object_type: 42
        }) + "\n"
    });
    expect(() => loadG2Runtime({ baseDir: fixture.baseDir })).toThrow(
      /relations\.jsonl linha 1: campo 'object_type' tem de ser string ou null/
    );
  });

  it("indexes rastreabilidade by both v1 and manual entity ids", async () => {
    fixture = await buildFixture();
    const data = loadG2Runtime({ baseDir: fixture.baseDir });

    expect(data.rastreabilidadeByV1EntityId.get("ACM-SCBI-001")).toHaveLength(1);
    expect(data.rastreabilidadeByManualEntityId.get("CLA-001")?.[0]?.manual_v2_entity_label).toBe(
      "Classificação formal"
    );
  });
});

describe("loadG2Runtime - integration with local runtime/v1", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
  });

  it("loads the on-disk runtime/v1 surface and reports the published manifest counts", () => {
    const data = loadG2Runtime();

    expect(data.provenance.source).toBe("runtime_v1");
    expect(data.slices.length).toBeGreaterThan(0);
    expect(data.controlObjectives.length).toBe(data.manifest.entity_counts.actual.control_objectives);
    expect(data.mechanisms.length).toBe(data.manifest.entity_counts.actual.mechanisms);
    expect(data.practices.length).toBe(data.manifest.entity_counts.actual.practices);
    expect(data.artifacts.length).toBe(data.manifest.entity_counts.actual.artifacts);
    expect(data.consistency.mismatches).toEqual([]);
  });
});
