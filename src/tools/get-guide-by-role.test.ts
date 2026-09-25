import { describe, it, expect } from "vitest";
import { _resolveGuideByRole, handleGetGuideByRole, dedupeEmbeddedStories } from "./get-guide-by-role.js";
import type { OntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

function makeOntologyData(overrides: Partial<OntologyData> = {}): OntologyData {
  return {
    domainMapping: {},
    concernsMap: {},
    requirements: [],
    controls: [],
    roles: [
      { role_id: "developer", aliases: ["dev", "software_developer"], canonical: true, source: "00" },
      { role_id: "security-champion", aliases: ["security-champions", "appsec"], canonical: true, source: "00" },
    ],
    threats: [],
    assignments: [
      { id: "01-chap-developer-l1-us01", chapter_id: "01", practice_id: "01:practice-a", role: "developer", phase: "design", risk_level: "L1", action: "Do A", artifacts: [] },
      { id: "01-chap-developer-l2-us01", chapter_id: "01", practice_id: "01:practice-a", role: "developer", phase: "design", risk_level: "L2", action: "Do A L2", artifacts: [] },
      { id: "01-chap-security-champion-l1-us02", chapter_id: "01", practice_id: "01:practice-b", role: "security-champion", phase: "test", risk_level: "L1", action: "Review B", artifacts: [] },
      { id: "02-chap-developer-l1-us03", chapter_id: "02", practice_id: "02:practice-c", role: "developer", phase: "implement", risk_level: "L1", action: "Implement C", artifacts: [] },
    ],
    userStories: [
      { id: "01-us-01", practice_id: "01:practice-a", title: "Practice A Story", chapter_id: "01" },
      { id: "01-us-02", practice_id: "01:practice-b", title: "Practice B Story", chapter_id: "01" },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveGuideByRole", () => {
  it("throws on invalid risk_level", () => {
    let err: unknown;
    try { _resolveGuideByRole({ risk_level: "L0" }, makeOntologyData()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("returns all L1 assignments when no role or phase filter", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.assignments).toHaveLength(3);
    expect(result.risk_level).toBe("L1");
  });

  it("filters by role (exact match)", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer" }, makeOntologyData());
    expect(result.assignments.every((a) => a.role === "developer")).toBe(true);
    expect(result.assignments).toHaveLength(2);
  });

  it("resolves role aliases", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "dev" }, makeOntologyData());
    // "dev" is alias for "developer" — but our fixture aliases don't include "dev" for developer
    // canonical role resolution: resolveRoleId("dev", roles) should match alias "dev" of developer
    expect(result.canonicalRole).toBe("developer");
    expect(result.assignments.every((a) => a.role === "developer")).toBe(true);
  });

  it("filters by phase", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", phase: "design" }, makeOntologyData());
    expect(result.assignments.every((a) => a.phase === "design")).toBe(true);
    expect(result.assignments).toHaveLength(1);
  });

  it("role + phase combined filter", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer", phase: "implement" }, makeOntologyData());
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.action).toBe("Implement C");
  });

  it("groups assignments by_role and by_phase", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.by_role["developer"]).toBeDefined();
    expect(result.by_role["security-champion"]).toBeDefined();
    expect(result.by_phase["design"]).toBeDefined();
    expect(result.by_phase["test"]).toBeDefined();
  });

  it("joins user stories via practice_id", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer" }, makeOntologyData());
    const withStory = result.assignments.filter((a) => a.user_story !== undefined);
    // practice-a has a user story
    expect(withStory.length).toBeGreaterThan(0);
    expect(withStory[0]?.user_story?.title).toBe("Practice A Story");
  });

  it("meta.knownRoles lists all roles at this risk level", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.knownRoles).toContain("developer");
    expect(result.meta.knownRoles).toContain("security-champion");
  });

  it("meta.knownPhases lists all phases at this risk level", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.knownPhases).toContain("design");
    expect(result.meta.knownPhases).toContain("test");
    expect(result.meta.knownPhases).toContain("implement");
  });

  it("L2-only assignment not returned at L1", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    const ids = result.assignments.map((a) => a.id);
    expect(ids).not.toContain("01-chap-developer-l2-us01");
  });

  it("returns empty assignments for a role with no matches", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "gestao-executiva" }, makeOntologyData());
    expect(result.assignments).toHaveLength(0);
    expect(result.by_role).toEqual({});
  });

  it("meta.note is non-empty string", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(typeof result.meta.note).toBe("string");
    expect(result.meta.note.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Consumer-side role aliases (serving brief #6)
// ---------------------------------------------------------------------------

describe("consumer role aliases", () => {
  function dataWithAppsec(): OntologyData {
    return makeOntologyData({
      roles: [
        { role_id: "appsec-engineer", aliases: ["appsec"], canonical: true, source: "00" },
      ],
      assignments: [
        { id: "01-chap-appsec-l1-us01", chapter_id: "01", practice_id: "01:practice-a", role: "appsec-engineer", phase: "design", risk_level: "L1", action: "Threat model", artifacts: [] },
      ],
    });
  }

  it("maps a natural name with one unambiguous home to its canonical role", () => {
    for (const name of ["security-engineer", "application-security-engineer", "sec-engineer"]) {
      const result = _resolveGuideByRole({ risk_level: "L1", role: name }, dataWithAppsec());
      expect(result.canonicalRole).toBe("appsec-engineer");
      expect(result.assignments).toHaveLength(1);
    }
  });

  it("declara um nome não mapeado como unknown_role — nunca o promove a canónico (§1, 2026-09-11)", () => {
    // devsecops continua deliberadamente NÃO aliasado (cross-cutting); mas o input cru
    // deixou de ser promovido a `canonicalRole` (era a fabricação de canonicidade).
    const result = _resolveGuideByRole({ risk_level: "L1", role: "devsecops" }, dataWithAppsec());
    expect(result.canonicalRole).toBeNull();
    expect(result.assignments).toHaveLength(0);
    expect(result.unknown_role?.requested).toBe("devsecops");
    expect(result.unknown_role?.note).toContain("NÃO existe no vocabulário publicado");
    expect(result.unknown_role?.note).toContain("transversal");
  });

  it("papel inexistente sai com did_you_mean por distância de edição (§1, 2026-09-11)", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developr" }, makeOntologyData());
    expect(result.canonicalRole).toBeNull();
    expect(result.unknown_role?.did_you_mean).toContain("developer");
    expect(result.unknown_role?.supported_values).toContain("developer");
    // a nota NUNCA afirma canonicidade do input
    expect(result.unknown_role?.note).not.toContain("CANÓNICO e publicado");
  });

  it("secops/soc resolvem para operacoes com a repartição DECLARADA (adenda §1+§2)", () => {
    const data = makeOntologyData({
      roles: [
        { role_id: "operacoes", aliases: ["ops", "incident_response"], canonical: true, source: "00" },
        { role_id: "devops-sre", aliases: ["devops", "sre"], canonical: true, source: "00" },
      ],
      assignments: [
        { id: "12-x-operacoes-l2-us13-operate", chapter_id: "12", practice_id: "12:p", role: "operacoes", phase: "operate", risk_level: "L2", action: "Operar alertas", artifacts: [] },
      ],
    });
    for (const name of ["secops", "soc", "SecOps"]) {
      const result = _resolveGuideByRole({ risk_level: "L2", role: name }, data);
      expect(result.canonicalRole).toBe("operacoes");
      expect(result.unknown_role).toBeUndefined();
      expect(result.role_scope_split?.counterpart_role_ids).toEqual(["devops-sre"]);
      expect(result.role_scope_split?.note).toContain("REPARTIDO");
    }
    // e o outro lado da repartição também a declara quando consultado directamente
    const other = _resolveGuideByRole({ risk_level: "L2", role: "devops-sre" }, data);
    expect(other.role_scope_split?.counterpart_role_ids).toEqual(["operacoes"]);
  });

  it("scope_split do bundle (quando presente) prevalece sobre o fallback declarado", () => {
    const data = makeOntologyData({
      roles: [
        {
          role_id: "operacoes", aliases: [], canonical: true, source: "00",
          scope_split: { perspective: "secops/soc", covers: "do bundle", counterpart_role_ids: ["devops-sre"], counterpart_covers: { "devops-sre": "plataforma" } },
        },
      ],
      assignments: [],
    });
    const result = _resolveGuideByRole({ risk_level: "L1", role: "operacoes" }, data);
    expect(result.role_scope_split?.covers).toBe("do bundle");
    expect(result.role_scope_split?.source).toContain("bundle");
  });
});

describe("dedupe de histórias embebidas (§6, 2026-09-11)", () => {
  it("a mesma história em 3 fases é embebida UMA vez; as repetições levam user_story_ref", () => {
    const mk = (phase: string) => ({
      id: `12-x-operacoes-l2-us13-${phase}`, chapter_id: "12", practice_id: "12:p13",
      role: "operacoes", canonical_role: "operacoes", phase, canonical_phase: phase,
      action: "Telemetria de agentes AI", artifacts: [],
      user_story: { us_id: "US-13", title: "Telemetria de agentes AI", goal: "Como Ops quero telemetria." },
    });
    const out = dedupeEmbeddedStories([mk("govern"), mk("operate"), mk("test")]);
    expect(out.filter((a) => a.user_story !== undefined)).toHaveLength(1);
    const refs = out.filter((a) => a.user_story_ref !== undefined);
    expect(refs).toHaveLength(2);
    expect(refs[0]?.user_story_ref?.embedded_at_assignment_id).toBe("12-x-operacoes-l2-us13-govern");
    expect(refs.every((a) => a.user_story === undefined)).toBe(true);
  });

  it("invariante no bundle real: nenhuma história embebida 2× na mesma resposta", () => {
    const out = handleGetGuideByRole({ risk_level: "L2", role: "ops", include_detail: true });
    const embedded = out.assignments
      .map((a) => (a.user_story?.us_id ? `${a.chapter_id}:${a.user_story.us_id}` : null))
      .filter((x): x is string => x !== null);
    expect(new Set(embedded).size).toBe(embedded.length);
  });
});

// ---------------------------------------------------------------------------
// Role aggregation + detail-on-demand (serving brief #2) — against real bundle
// ---------------------------------------------------------------------------

describe("handleGetGuideByRole role_checklist", () => {
  it("aggregates the role's user stories with their DoD only when include_detail", () => {
    const withDetail = handleGetGuideByRole({ risk_level: "L2", role: "developer", include_detail: true });
    expect(Array.isArray(withDetail.role_checklist)).toBe(true);
    expect((withDetail.role_checklist ?? []).length).toBeGreaterThan(0);
    // entries carry the DoD checklist and proportionality (the "what must role X fulfil" answer)
    const populated = (withDetail.role_checklist ?? []).filter((e) => e.checklist_items.length > 0);
    expect(populated.length).toBeGreaterThan(0);
    // aggregation is de-duplicated by user story id
    const ids = (withDetail.role_checklist ?? []).map((e) => e.id ?? e.us_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("omits role_checklist (and heavy US detail) by default", () => {
    const noDetail = handleGetGuideByRole({ risk_level: "L2", role: "developer" });
    expect(noDetail.role_checklist).toBeUndefined();
    expect(noDetail.assignments.every((a) => a.user_story?.checklist_items === undefined)).toBe(true);
  });

  it("surfaces per-assignment DoD detail with include_detail", () => {
    const withDetail = handleGetGuideByRole({ risk_level: "L2", role: "developer", include_detail: true });
    const detailed = withDetail.assignments.some(
      (a) => (a.user_story?.checklist_items?.length ?? 0) > 0
    );
    expect(detailed).toBe(true);
  });
});

// Level ladder — proportionality-driven narrowing (serving fix, brief #3a)
describe("get_guide_by_role — level sharpening", () => {
  it("L1 narrows the role's user stories vs L3 (the ladder sharpens)", () => {
    for (const role of ["devops-sre", "qa", "appsec-engineer"]) {
      const l1 = handleGetGuideByRole({ risk_level: "L1", role, include_detail: true });
      const l3 = handleGetGuideByRole({ risk_level: "L3", role, include_detail: true });
      const n1 = (l1.role_checklist ?? []).length;
      const n3 = (l3.role_checklist ?? []).length;
      expect(n1, `${role}: L1 should not exceed L3`).toBeLessThanOrEqual(n3);
      expect(n1, `${role}: L1 should be non-empty`).toBeGreaterThan(0);
    }
    // At least one role must genuinely narrow (proof the filter bites, not a no-op).
    const dsL1 = handleGetGuideByRole({ risk_level: "L1", role: "devops-sre", include_detail: true });
    const dsL3 = handleGetGuideByRole({ risk_level: "L3", role: "devops-sre", include_detail: true });
    expect((dsL1.role_checklist ?? []).length).toBeLessThan((dsL3.role_checklist ?? []).length);
  });

  it("surfaces the level-specific obligation (proportionality_level)", () => {
    const r = handleGetGuideByRole({ risk_level: "L1", role: "devops-sre", include_detail: true });
    const withLevel = (r.role_checklist ?? []).filter((e) => typeof e.proportionality_level === "string");
    expect(withLevel.length).toBeGreaterThan(0);
  });

  it("never surfaces a non-applicable obligation at the served level", () => {
    const NON_APPLICABLE = /^\s*(não\s+aplicável|não\s+obrigatório|não|n\/a)\b/i;
    for (const L of ["L1", "L2", "L3"] as const) {
      const r = handleGetGuideByRole({ risk_level: L, role: "appsec-engineer", include_detail: true });
      for (const e of r.role_checklist ?? []) {
        if (e.proportionality_level) {
          expect(NON_APPLICABLE.test(e.proportionality_level), `${L} ${e.us_id}: ${e.proportionality_level}`).toBe(false);
        }
      }
    }
  });
});
