import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../backend/semantic-index-gateway.js", () => ({
  retrievePublishedContext: vi.fn()
}));

import {
  handleListSbdToeChapters,
  handleQuerySbdToeEntities,
  handleGetSbdToeChapterBrief,
  handleMapSbdToeApplicability
} from "./structured-tools.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";

// --- Helpers ---

function makeNormalizedRecord(overrides: Record<string, unknown> = {}) {
  return {
    citationId: "E1",
    source: "entities" as const,
    indexName: "test",
    objectID: "test-001",
    title: "Test",
    excerpt: "Test excerpt",
    tags: [],
    algoliaRank: 1,
    localScore: 0,
    raw: {
      objectID: "test-001",
      bundle_id: "01-test",
      filter_tags: { risk_level: ["L1"] },
      entity_mentions_flat: []
    },
    ...overrides
  };
}

function makeBundle(records: unknown[] = []) {
  return {
    query: "test",
    selected: records,
    retrieved: records,
    promptChapters: [],
    consultedIndices: [],
    backendSnapshot: {}
  };
}

// --- list_sbd_toe_chapters ---

describe("handleListSbdToeChapters (runtime bundle)", () => {
  it("throws on invalid riskLevel", () => {
    expect(() => handleListSbdToeChapters({ riskLevel: "L9" })).toThrow("riskLevel inválido");
    expect(() => handleListSbdToeChapters({ riskLevel: 42 })).toThrow("riskLevel inválido");
  });

  it("lists the 15 chapters without a filter, each with id/title/readableTitle", () => {
    const result = handleListSbdToeChapters({}) as { chapters: Array<{ id: string; title: string; readableTitle: string }> };
    expect(result.chapters).toHaveLength(15);
    expect(result.chapters.every((c) => c.id && c.title && c.readableTitle)).toBe(true);
  });

  it("riskLevel annotates but NEVER filters (graduated, 0.14.0)", () => {
    const ids = (level?: string) => (handleListSbdToeChapters(level ? { riskLevel: level } : {}) as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id);
    const all = ids(), l1 = ids("L1"), l3 = ids("L3");
    expect(l1).toEqual(all);
    expect(l3).toEqual(all);
    expect(l1).toContain("13-formacao-onboarding");
  });
});

// --- query_sbd_toe_entities ---

describe("handleQuerySbdToeEntities", () => {
  beforeEach(() => {
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([]) as never);
  });

  it("throws when query is empty string", async () => {
    await expect(handleQuerySbdToeEntities({ query: "" })).rejects.toThrow(
      '"query" é obrigatório'
    );
  });

  it("throws when query exceeds 200 chars", async () => {
    const longQuery = "a".repeat(201);
    await expect(handleQuerySbdToeEntities({ query: longQuery })).rejects.toThrow(
      '"query" é obrigatório'
    );
  });

  it("throws when query is not a string", async () => {
    await expect(handleQuerySbdToeEntities({ query: 42 })).rejects.toThrow('"query"');
  });

  it("throws when topK is out of range", async () => {
    await expect(handleQuerySbdToeEntities({ query: "test", topK: 0 })).rejects.toThrow(
      '"topK"'
    );
    await expect(handleQuerySbdToeEntities({ query: "test", topK: 16 })).rejects.toThrow(
      '"topK"'
    );
  });

  it("throws when topK is not an integer", async () => {
    await expect(
      handleQuerySbdToeEntities({ query: "test", topK: 1.5 })
    ).rejects.toThrow('"topK"');
  });

  it("throws on invalid riskLevel", async () => {
    await expect(
      handleQuerySbdToeEntities({ query: "test", riskLevel: "L9" })
    ).rejects.toThrow("riskLevel inválido");
  });

  it("returns entities and total from retrieved bundle", async () => {
    const record = makeNormalizedRecord();
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([record]) as never);
    const result = (await handleQuerySbdToeEntities({ query: "test" })) as {
      entities: unknown[];
      total: number;
    };
    expect(result.entities).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("filters by entityType when provided (entity types reach a chunk via entity_mentions_flat)", async () => {
    const r1 = makeNormalizedRecord({ raw: { entity_mentions_flat: ["MT-001", "Threat"] } });
    const r2 = makeNormalizedRecord({
      objectID: "e-002",
      raw: { entity_mentions_flat: ["US-01", "UserStory"] }
    });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2]) as never);
    const result = (await handleQuerySbdToeEntities(
      { query: "test", entityType: "threat" }
    )) as { entities: unknown[]; total: number };
    expect(result.total).toBe(1);
  });

  it("filters by chapterId when provided", async () => {
    const r1 = makeNormalizedRecord({ chapter: "01-cap", raw: { bundle_id: "01-cap" } });
    const r2 = makeNormalizedRecord({ objectID: "e-002", chapter: "02-cap", raw: { bundle_id: "02-cap" } });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2]) as never);
    const result = (await handleQuerySbdToeEntities(
      { query: "test", chapterId: "01-cap" }
    )) as { entities: unknown[]; total: number };
    expect(result.total).toBe(1);
  });

  it("uses default topK=5 when topK not provided", async () => {
    await handleQuerySbdToeEntities({ query: "test" });
    expect(vi.mocked(retrievePublishedContext)).toHaveBeenCalledWith("test", 5);
  });

  it("passes provided topK to retrievePublishedContext", async () => {
    await handleQuerySbdToeEntities({ query: "test", topK: 10 });
    expect(vi.mocked(retrievePublishedContext)).toHaveBeenCalledWith("test", 10);
  });
});

// --- get_sbd_toe_chapter_brief ---

describe("handleGetSbdToeChapterBrief (runtime bundle)", () => {
  it("throws when chapterId is empty, whitespace or missing", () => {
    expect(() => handleGetSbdToeChapterBrief({ chapterId: "" })).toThrow('"chapterId" é obrigatório');
    expect(() => handleGetSbdToeChapterBrief({ chapterId: "   " })).toThrow('"chapterId" é obrigatório');
    expect(() => handleGetSbdToeChapterBrief({})).toThrow('"chapterId" é obrigatório');
  });

  it("returns found:false for an unknown chapter — never a fabricated brief", () => {
    const result = handleGetSbdToeChapterBrief({ chapterId: "unknown-id" }) as { found: boolean; id: string; title?: string };
    expect(result.found).toBe(false);
    expect(result.id).toBe("unknown-id");
    expect(result.title).toBeUndefined();
  });

  it("briefs a real chapter from the bundle: readable title, objective, phases, roles, artifacts", () => {
    const result = handleGetSbdToeChapterBrief({ chapterId: "01-classificacao-aplicacoes" }) as {
      found: boolean; id: string; title: string; objective?: string; phases?: string[]; role?: string[]; artifacts?: string[];
    };
    expect(result.found).toBe(true);
    expect(result.id).toBe("01-classificacao-aplicacoes");
    expect(result.title).toBe("Classificação de Aplicações");
    expect(typeof result.objective).toBe("string");
    expect(result.phases?.length ?? 0).toBeGreaterThan(0);
    expect(result.role?.length ?? 0).toBeGreaterThan(0);
    expect(result.artifacts?.length ?? 0).toBeGreaterThan(0);
  });
});

// --- list_sbd_toe_chapters — readableTitle ---

describe("handleListSbdToeChapters — readableTitle (runtime bundle)", () => {
  it("every chapter carries a clean readableTitle distinct from its id", () => {
    const result = handleListSbdToeChapters({}) as { chapters: Array<{ id: string; title: string; readableTitle: string }> };
    expect(result.chapters).toHaveLength(15);
    for (const ch of result.chapters) {
      expect(typeof ch.readableTitle).toBe("string");
      expect(ch.readableTitle.length).toBeGreaterThan(0);
      expect(ch.readableTitle).not.toBe(ch.id);
      expect(ch.readableTitle).not.toMatch(/Nota Can[oó]nica|\{#/);
    }
  });

  it("known chapters map to their canonical readable titles; id and title are preserved", () => {
    const result = handleListSbdToeChapters({}) as { chapters: Array<{ id: string; title: string; readableTitle: string }> };
    const byId = new Map(result.chapters.map((c) => [c.id, c]));
    expect(byId.get("01-classificacao-aplicacoes")?.readableTitle).toBe("Classificação de Aplicações");
    expect(byId.get("07-cicd-seguro")?.readableTitle).toBe("CI/CD Seguro");
    expect(byId.get("07-cicd-seguro")?.id).toBe("07-cicd-seguro");
    expect(typeof byId.get("07-cicd-seguro")?.title).toBe("string");
  });
});

// --- map_sbd_toe_applicability ---

describe("handleMapSbdToeApplicability", () => {
  it("throws on undefined riskLevel", () => {
    expect(() => handleMapSbdToeApplicability({})).toThrow("riskLevel é obrigatório");
  });

  it("throws on invalid riskLevel L4", () => {
    expect(() => handleMapSbdToeApplicability({ riskLevel: "L4" })).toThrow(
      "riskLevel é obrigatório"
    );
  });

  it("throws on non-string riskLevel", () => {
    expect(() => handleMapSbdToeApplicability({ riskLevel: 1 })).toThrow(
      "riskLevel é obrigatório"
    );
  });

});

// --- map_sbd_toe_applicability — activatedBundles ---

interface ActivatedBundle {
  chapterId: string;
  status: string;
  reason: string;
}

interface ActivatedBundles {
  foundationBundles: ActivatedBundle[];
  domainBundles: ActivatedBundle[];
  operationalBundles: ActivatedBundle[];
}

describe("handleMapSbdToeApplicability — activatedBundles", () => {
  it("always includes 3 foundation bundles for any risk level", () => {
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }) as {
      activatedBundles: ActivatedBundles;
    };
    expect(result.activatedBundles.foundationBundles).toHaveLength(3);
    const ids = result.activatedBundles.foundationBundles.map((b) => b.chapterId);
    expect(ids).toContain("01-classificacao-aplicacoes");
    expect(ids).toContain("02-requisitos-seguranca");
    expect(ids).toContain("03-threat-modeling");
  });

  it("activates 09-containers-imagens when technologies includes 'containers'", () => {
    const result = handleMapSbdToeApplicability(
      { riskLevel: "L2", technologies: ["containers", "ci-cd"] }
    ) as { activatedBundles: ActivatedBundles };
    const domainIds = result.activatedBundles.domainBundles.map((b) => b.chapterId);
    expect(domainIds).toContain("09-containers-imagens");
  });

  it("activates 07-cicd-seguro when technologies includes 'ci-cd'", () => {
    const result = handleMapSbdToeApplicability(
      { riskLevel: "L1", technologies: ["ci-cd"] }
    ) as { activatedBundles: ActivatedBundles };
    const opIds = result.activatedBundles.operationalBundles.map((b) => b.chapterId);
    expect(opIds).toContain("07-cicd-seguro");
  });

  it("does NOT activate 13-formacao-onboarding for L1 even with hasPersonalData", () => {
    const result = handleMapSbdToeApplicability(
      { riskLevel: "L1", hasPersonalData: true }
    ) as { activatedBundles: ActivatedBundles };
    const opIds = result.activatedBundles.operationalBundles.map((b) => b.chapterId);
    expect(opIds).not.toContain("13-formacao-onboarding");
  });

  it("chapter-13 needs no L3 hack — it is present in the graduated chapters at every level", () => {
    for (const level of ["L1", "L2", "L3"]) {
      const result = handleMapSbdToeApplicability({ riskLevel: level }) as { chapters: Array<{ chapter_id: string }> };
      expect(result.chapters.map((c) => c.chapter_id), level).toContain("13-formacao-onboarding");
    }
  });

  it("L1 without technologies: no context bundles beyond the graduated ch-06 presence", () => {
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }) as {
      activatedBundles: ActivatedBundles;
    };
    expect(result.activatedBundles.domainBundles.map((b) => b.chapterId)).toEqual(["06-desenvolvimento-seguro"]);
    expect(result.activatedBundles.domainBundles[0]?.reason).toContain("graduada");
    expect(result.activatedBundles.operationalBundles).toHaveLength(0);
  });

  it("throws (with rpcError) when technologies contain invalid value", () => {
    let caughtError: unknown;
    try {
      handleMapSbdToeApplicability({ riskLevel: "L1", technologies: ["invalid-tech"] });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((caughtError as Error).message).toContain("invalid-tech");
  });

  it("throws (with rpcError) when projectRole is invalid", () => {
    let caughtError: unknown;
    try {
      handleMapSbdToeApplicability({ riskLevel: "L1", projectRole: "invalid-role" });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("minimal input {riskLevel: 'L1'} returns the graduated shape (runtime bundle)", () => {
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }) as {
      riskLevel: string;
      semantics: string;
      chapters: Array<{ chapter_id: string }>;
      conditional: unknown[];
      activatedBundles: ActivatedBundles;
    };
    expect(result.riskLevel).toBe("L1");
    expect(result.semantics).toContain("graduated");
    expect(result.chapters.map((c) => c.chapter_id)).toContain("13-formacao-onboarding");
    expect(result.conditional).toEqual([]);
    expect(result.activatedBundles.foundationBundles).toHaveLength(3);
  });
});

// --- list_sbd_toe_chapters — applicability/minLevel (Wave 1 item 9) ---

describe("handleListSbdToeChapters — applicability", () => {
  type Chapter = {
    id: string;
    title: string;
    readableTitle: string;
    applicability: { L1: boolean; L2: boolean; L3: boolean };
    minLevel: "L1" | "L2" | "L3" | null;
  };

  function listAll(): Chapter[] {
    // No cache → real-chapter path driven by ACTIVE_CHAPTERS_BY_RISK.
    return (handleListSbdToeChapters({}) as { chapters: Chapter[] }).chapters;
  }

  it("exposes graduated applicability (all levels true) + demand_by_level; minLevel retired", () => {
    for (const c of listAll()) {
      expect(c.applicability).toEqual({ L1: true, L2: true, L3: true });
      expect((c as { demand_by_level?: Record<string, string> }).demand_by_level?.L2).toBeDefined();
      expect((c as { minLevel?: unknown }).minLevel).toBeUndefined();
    }
  });

  it("derives demand_by_level from authored proportionality (ch06 L1 has authored mandatory work)", () => {
    const byId = new Map(listAll().map((c) => [c.id, c as { demand_by_level?: Record<string, string> }]));
    expect(byId.get("02-requisitos-seguranca")?.demand_by_level?.L1).toBeDefined();
    // Secure-development is PRESENT at L1 with authored proportionality (US-01 Obrigatório …).
    expect(byId.get("06-desenvolvimento-seguro")?.demand_by_level?.L1).toBe("obrigatorio");
    // Chapter 00 is the declared foundational fallback.
    expect(byId.get("00-fundamentos")?.demand_by_level?.L1).toBe("foundational");
  });

  it("keeps readableTitle clean even when the canonical title carries editorial noise", () => {
    const tm = listAll().find((c) => c.id === "03-threat-modeling");
    expect(tm?.readableTitle).toBe("Threat Modeling");
    // canonical title may carry a "Capítulo 3 - " prefix; readableTitle must not.
    expect(tm?.readableTitle).not.toMatch(/Cap[íi]tulo/i);
  });
});

// --- query_entities exact-id lookup (Wave 1 item 3) ---
// Before this fix, an exact id (CTRL-<domain>-<slug>-<hash>) returned 0 from the
// semantic search; now it resolves directly from the entity index.
describe("handleQuerySbdToeEntities — exact id lookup", () => {
  it("resolves a real control id directly with match=exact_id", async () => {
    const { getOntologyData } = await import("./ontology-loader.js");
    const realId = getOntologyData().controls[0]?.control_id;
    expect(typeof realId).toBe("string");

    const result = (await handleQuerySbdToeEntities({ query: realId as string })) as {
      total: number;
      match?: string;
      entities: Array<Record<string, unknown>>;
    };
    expect(result.total).toBe(1);
    expect(result.match).toBe("exact_id");
    expect(result.entities[0]?.control_id).toBe(realId);
    expect(result.entities[0]?.entity_type).toBe("control");
  });

  it("does not exact-match a guessed/partial token", async () => {
    // 'CTRL-06' is not a real id → no exact match (falls through to semantic).
    const result = (await handleQuerySbdToeEntities({ query: "CTRL-06" })) as { match?: string };
    expect(result.match).toBeUndefined();
  });
});

// --- map_applicability: conditional populated by context (Wave 1 item 7) ---
// conditional was hardcoded [] (dead) while context activation lived only in
// activatedBundles. Now active = risk baseline, conditional = technology overlay.
describe("handleMapSbdToeApplicability — conditional model", () => {
  type Result = {
    active: string[];
    conditional: Array<{ chapterId: string; reason: string }>;
    activatedBundles: unknown;
  };

  it("is empty when no technologies are supplied", () => {
    const result = handleMapSbdToeApplicability({ riskLevel: "L2" }) as Result;
    expect(result.conditional).toEqual([]);
  });

  it("is populated by technologies, distinct from the risk-baseline active set", () => {
    const result = handleMapSbdToeApplicability({
      riskLevel: "L2",
      technologies: ["containers", "iac", "ci-cd", "monitoring"],
    }) as Result;
    const ids = result.conditional.map((c) => c.chapterId);
    expect(ids).toEqual(expect.arrayContaining(["08-iac-infraestrutura", "09-containers-imagens", "07-cicd-seguro"]));
    expect(new Set(ids).size).toBe(ids.length); // deduped
    for (const c of result.conditional) {
      expect(c.reason.toLowerCase()).toContain("technologies inclui");
    }
    // active stays the risk baseline (unchanged by technologies).
    const baseline = handleMapSbdToeApplicability({ riskLevel: "L2" }) as Result;
    expect(result.active).toEqual(baseline.active);
  });
});

// --- get_chapter_brief: surface role (Wave 1 item 8 serve-side) ---
// The description promised role + intent_topics but the output carried neither.
// role is derived from assignments; intent_topics is absent from the v1.6.x
// substrate (description corrected to not over-promise).
describe("handleGetSbdToeChapterBrief — role", () => {
  it("surfaces the distinct roles of a chapter from assignments", () => {
    const result = handleGetSbdToeChapterBrief({ chapterId: "02-requisitos-seguranca" }) as {
      found: boolean;
      role?: string[];
    };
    expect(result.found).toBe(true);
    expect(Array.isArray(result.role)).toBe(true);
    expect((result.role ?? []).length).toBeGreaterThan(0);
    expect(result.role).toEqual([...(result.role ?? [])].sort()); // deduped + sorted
  });
});

// ---------------------------------------------------------------------------
// query_sbd_toe_entities filters over the CURRENT substrate (no per-chunk entity_type;
// entity types via entity_mentions_flat, risk via filter_tags.risk_level) — acceptance
// scenario TC-A-13 (2026-08-29): entityType/riskLevel filters returned 0 for everything.
// ---------------------------------------------------------------------------

describe("handleQuerySbdToeEntities — filters over substrate facets", () => {
  it("entityType matches the entity types a chunk mentions (entity_mentions_flat), with aliases", async () => {
    const r1 = makeNormalizedRecord({ raw: { entity_mentions_flat: ["AUT-001", "Requirement", "AUT-001"] } });
    const r2 = makeNormalizedRecord({ objectID: "e-002", raw: { entity_mentions_flat: ["US-02", "UserStory", "US-02"] } });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2]) as never);
    const result = (await handleQuerySbdToeEntities({ query: "test", entityType: "requirements" })) as {
      total: number; filters?: { applied: Record<string, string>; retrieval_pool: number; matched: number };
    };
    expect(result.total).toBe(1);
    expect(result.filters?.applied).toEqual({ entityType: "requirements" });
    expect(result.filters?.retrieval_pool).toBe(2);
    expect(result.filters?.matched).toBe(1);
  });

  it("riskLevel matches filter_tags.risk_level and declares how much of the pool carries a facet", async () => {
    const r1 = makeNormalizedRecord({ raw: { filter_tags: { risk_level: ["L2", "L3"] } } });
    const r2 = makeNormalizedRecord({ objectID: "e-002", raw: { filter_tags: { risk_level: [] } } });
    const r3 = makeNormalizedRecord({ objectID: "e-003", raw: {} });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2, r3]) as never);
    const result = (await handleQuerySbdToeEntities({ query: "test", riskLevel: "L2" })) as {
      total: number; filters?: { pool_with_risk_facet?: number; note: string };
    };
    expect(result.total).toBe(1);
    expect(result.filters?.pool_with_risk_facet).toBe(1);
    expect(result.filters?.note).toMatch(/declared/);
  });

  it("filters over the full ranked retrieval, then pages topK (total = matched, not topK)", async () => {
    const recs = Array.from({ length: 12 }, (_, i) => makeNormalizedRecord({ objectID: `e-${i}`, raw: { entity_mentions_flat: ["Requirement"] } }));
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle(recs) as never);
    const result = (await handleQuerySbdToeEntities({ query: "test", topK: 3, entityType: "requirement" })) as { entities: unknown[]; total: number };
    expect(result.entities).toHaveLength(3);
    expect(result.total).toBe(12);
  });
});
