import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  OverlayAssetMissingError,
  clearRegulatoryOverlayCacheForTests,
  loadRegulatoryOverlay,
  resolveRegulatoryFramework
} from "./regulatory-overlay-loader.js";

interface OverlayFixture {
  baseDir: string;
  files: Record<string, string>;
}

async function buildOverlayFixture(
  overrides: Partial<Record<string, string>> = {}
): Promise<OverlayFixture> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "overlay-fixture-"));

  const frameworks = {
    items: [
      {
        authority_class: "external_normative_overlay",
        framework_id: "EXT-DORA",
        framework_kind: "regulation",
        jurisdiction: "EU",
        name: "Digital Operational Resilience Act",
        scope_summary: "Operational resilience.",
        short_code: "DORA"
      },
      {
        authority_class: "external_normative_overlay",
        framework_id: "EXT-CRA",
        framework_kind: "regulation",
        jurisdiction: "EU",
        name: "Cyber Resilience Act",
        scope_summary: "Secure product lifecycle, SBOM, vulnerability handling.",
        short_code: "CRA"
      }
    ]
  };

  const obligations = {
    items: [
      {
        applicability_scope: "framework_specific",
        citation: "Cadeia Fornecimento",
        framework_id: "EXT-CRA",
        normative_strength: "curated",
        obligation_id: "EXT-CRA-OBL-cadeia-fornecimento",
        obligation_kind: "topic",
        title: "Cadeia Fornecimento",
        topic: "Cadeia Fornecimento"
      },
      {
        applicability_scope: "framework_specific",
        framework_id: "EXT-DORA",
        normative_strength: "curated",
        obligation_id: "EXT-DORA-OBL-5",
        obligation_kind: "topic",
        title: "Incident reporting"
      }
    ]
  };

  const playbooks = {
    items: [
      {
        adoption_status: "curated_reference",
        applicability_scope: "framework_specific",
        authority_class: "external_normative_overlay",
        curation_status: "curated",
        framework_ids: ["EXT-DORA"],
        playbook_id: "OVR-DORA-playbook",
        playbook_kind: "implementation_playbook",
        source_bundle_id: "dora",
        source_document_id: "002-cross-check-normativo-dora-02-playbook",
        source_path: "002-cross-check-normativo/dora/02-playbook.md",
        title: "DORA playbook"
      },
      {
        adoption_status: "curated_reference",
        applicability_scope: "framework_specific",
        authority_class: "external_normative_overlay",
        curation_status: "curated",
        framework_ids: ["EXT-CRA"],
        playbook_id: "OVR-CRA-playbook",
        playbook_kind: "implementation_playbook",
        title: "CRA playbook"
      }
    ]
  };

  const mappingsLines = [
    {
      authority_class: "external_normative_overlay",
      citation: "Cadeia Fornecimento",
      confidence: 0.87,
      framework_id: "EXT-CRA",
      justification: "control_practice_projection",
      mapping_id: "MAP-cra-cadeia-001",
      mapping_type: "obligation_maps_to_practice",
      matched_label: "Cap. 05",
      obligation_id: "EXT-CRA-OBL-cadeia-fornecimento",
      playbook_id: "OVR-CRA-playbook",
      source_document_id: "002-cross-check-normativo-cra-02-playbook",
      source_lines: [8],
      target_id: "02-requisitos-seguranca:geracao-de-sbom-e-assinatura",
      target_type: "Practice"
    },
    {
      authority_class: "external_normative_overlay",
      framework_id: "EXT-DORA",
      mapping_id: "MAP-dora-incident-001",
      mapping_type: "obligation_maps_to_bundle",
      obligation_id: "EXT-DORA-OBL-5",
      playbook_id: "OVR-DORA-playbook",
      target_id: "06-monitoring",
      target_type: "KnowledgeBundle"
    }
  ];

  const index = {
    items: [
      {
        framework_id: "EXT-DORA",
        short_code: "DORA",
        obligation_ids: ["EXT-DORA-OBL-5"],
        playbook_ids: ["OVR-DORA-playbook"],
        primary_playbook_ids: ["OVR-DORA-playbook"],
        support_playbook_ids: []
      },
      {
        framework_id: "EXT-CRA",
        short_code: "CRA",
        obligation_ids: ["EXT-CRA-OBL-cadeia-fornecimento"],
        playbook_ids: ["OVR-CRA-playbook"],
        primary_playbook_ids: ["OVR-CRA-playbook"],
        support_playbook_ids: []
      }
    ]
  };

  const filesByPath: Record<string, string> = {
    "external_frameworks.json": JSON.stringify(frameworks, null, 2),
    "external_obligations.json": JSON.stringify(obligations, null, 2),
    "overlay_playbooks.json": JSON.stringify(playbooks, null, 2),
    "overlay_mappings.jsonl":
      mappingsLines.map((line) => JSON.stringify(line)).join("\n") + "\n",
    "framework_overlay_index.json": JSON.stringify(index, null, 2)
  };

  for (const [relative, override] of Object.entries(overrides)) {
    if (typeof override === "string") filesByPath[relative] = override;
  }

  await mkdir(baseDir, { recursive: true });
  for (const [relative, contents] of Object.entries(filesByPath)) {
    await writeFile(path.join(baseDir, relative), contents, "utf8");
  }

  return { baseDir, files: filesByPath };
}

describe("loadRegulatoryOverlay", () => {
  let fixture: OverlayFixture | undefined;

  beforeEach(() => {
    clearRegulatoryOverlayCacheForTests();
  });

  afterEach(async () => {
    if (fixture) {
      await rm(fixture.baseDir, { recursive: true, force: true });
      fixture = undefined;
    }
  });

  it("returns status:'absent' with empty collections when the overlay base dir does not exist", () => {
    const data = loadRegulatoryOverlay({
      baseDir: path.join(tmpdir(), "overlay-not-published-dir")
    });

    expect(data.status).toBe("absent");
    expect(data.frameworks).toEqual([]);
    expect(data.absentReason).toMatch(/does not exist/i);
    expect(data.provenance.source).toBe("overlay");
  });

  it("returns status:'absent' when the base dir exists but is empty", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "overlay-empty-"));
    try {
      const data = loadRegulatoryOverlay({ baseDir });
      expect(data.status).toBe("absent");
      expect(data.absentReason).toMatch(/no overlay artefacts/i);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it("throws OverlayAssetMissingError when only a subset of overlay files is present", async () => {
    fixture = await buildOverlayFixture();
    await rm(path.join(fixture.baseDir, "overlay_mappings.jsonl"));

    expect(() => loadRegulatoryOverlay({ baseDir: fixture.baseDir })).toThrow(
      OverlayAssetMissingError
    );
    try {
      loadRegulatoryOverlay({ baseDir: fixture.baseDir });
    } catch (error) {
      expect(error).toBeInstanceOf(OverlayAssetMissingError);
      expect((error as OverlayAssetMissingError).missingPaths).toEqual([
        "overlay_mappings.jsonl"
      ]);
    }
  });

  it("loads all overlay artefacts and exposes provenance with overlay source", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    expect(data.status).toBe("published");
    expect(data.frameworks).toHaveLength(2);
    expect(data.obligations).toHaveLength(2);
    expect(data.playbooks).toHaveLength(2);
    expect(data.mappings).toHaveLength(2);
    expect(data.index).toHaveLength(2);
    expect(data.provenance.source).toBe("overlay");
    expect(Object.keys(data.provenance.files)).toEqual(
      expect.arrayContaining([
        "external_frameworks.json",
        "overlay_mappings.jsonl",
        "framework_overlay_index.json"
      ])
    );
  });

  it("builds id and short_code indices for frameworks (case-insensitive short codes)", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    expect(data.frameworksById.get("EXT-DORA")?.name).toBe(
      "Digital Operational Resilience Act"
    );
    expect(data.frameworksByShortCode.get("DORA")?.framework_id).toBe("EXT-DORA");
    expect(data.frameworksByShortCode.get("CRA")?.framework_id).toBe("EXT-CRA");
  });

  it("indexes obligations, playbooks and mappings by their natural keys", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    expect(data.obligationsByFramework.get("EXT-CRA")?.[0]?.obligation_id).toBe(
      "EXT-CRA-OBL-cadeia-fornecimento"
    );
    expect(data.playbooksByFramework.get("EXT-DORA")?.[0]?.playbook_id).toBe(
      "OVR-DORA-playbook"
    );
    expect(
      data.mappingsByObligation.get("EXT-CRA-OBL-cadeia-fornecimento")?.[0]?.target_id
    ).toBe("02-requisitos-seguranca:geracao-de-sbom-e-assinatura");
    expect(data.mappingsByTarget.get("06-monitoring")?.[0]?.framework_id).toBe(
      "EXT-DORA"
    );
  });

  it("parses overlay_mappings.jsonl with optional fields (confidence, source_lines)", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    const mapping = data.mappingsById.get("MAP-cra-cadeia-001");
    expect(mapping?.confidence).toBe(0.87);
    expect(mapping?.source_lines).toEqual([8]);
    expect(mapping?.matched_label).toBe("Cap. 05");
  });

  it("accepts overlay_mappings with empty obligation_id for playbook-driven mapping types", async () => {
    fixture = await buildOverlayFixture({
      "overlay_mappings.jsonl":
        JSON.stringify({
          authority_class: "external_normative_overlay",
          framework_id: "EXT-CRA",
          mapping_id: "MAP-cra-highlight-001",
          mapping_type: "playbook_highlights_bundle",
          obligation_id: "",
          playbook_id: "OVR-CRA-playbook",
          target_id: "02-requisitos-seguranca",
          target_type: "KnowledgeBundle"
        }) + "\n"
    });
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });
    const mapping = data.mappingsById.get("MAP-cra-highlight-001");
    expect(mapping?.obligation_id).toBe("");
    expect(mapping?.mapping_type).toBe("playbook_highlights_bundle");
    expect(data.mappingsByObligation.get("")).toBeUndefined();
    expect(data.mappingsByTarget.get("02-requisitos-seguranca")?.length).toBe(1);
  });

  it("rejects overlay_mappings.jsonl entries missing required fields", async () => {
    fixture = await buildOverlayFixture({
      "overlay_mappings.jsonl":
        JSON.stringify({
          mapping_id: "MAP-incomplete",
          obligation_id: "EXT-DORA-OBL-5"
        }) + "\n"
    });
    expect(() => loadRegulatoryOverlay({ baseDir: fixture.baseDir })).toThrow(
      /mapping_type/
    );
  });

  it("rejects malformed JSONL with line numbers in the error message", async () => {
    fixture = await buildOverlayFixture({ "overlay_mappings.jsonl": "not-json\n" });
    expect(() => loadRegulatoryOverlay({ baseDir: fixture.baseDir })).toThrow(
      /overlay_mappings\.jsonl linha 1/
    );
  });

  it("resolveRegulatoryFramework finds frameworks by id and by short code (case-insensitive)", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    expect(resolveRegulatoryFramework(data, "EXT-DORA")?.short_code).toBe("DORA");
    expect(resolveRegulatoryFramework(data, "dora")?.framework_id).toBe("EXT-DORA");
    expect(resolveRegulatoryFramework(data, "CRA")?.framework_id).toBe("EXT-CRA");
  });

  it("resolveRegulatoryFramework returns undefined for unknown inputs (does not invent)", async () => {
    fixture = await buildOverlayFixture();
    const data = loadRegulatoryOverlay({ baseDir: fixture.baseDir });

    expect(resolveRegulatoryFramework(data, "EXT-UNKNOWN")).toBeUndefined();
    expect(resolveRegulatoryFramework(data, "")).toBeUndefined();
  });
});

describe("loadRegulatoryOverlay - integration with local overlay", () => {
  beforeEach(() => {
    clearRegulatoryOverlayCacheForTests();
  });

  it("loads the on-disk overlay surface with provenance and indices", () => {
    const data = loadRegulatoryOverlay();

    if (data.status === "absent") {
      // The overlay is allowed to be absent in environments where it has not
      // been published yet; we keep the test resilient.
      expect(data.absentReason).toBeDefined();
      return;
    }

    expect(data.provenance.source).toBe("overlay");
    expect(data.frameworks.length).toBeGreaterThan(0);
    expect(data.obligations.length).toBeGreaterThan(0);
    expect(data.playbooks.length).toBeGreaterThan(0);
    expect(data.mappings.length).toBeGreaterThan(0);
    expect(data.index.length).toBeGreaterThan(0);
    for (const framework of data.frameworks) {
      expect(framework.framework_id).toMatch(/^EXT-/);
    }
  });
});
