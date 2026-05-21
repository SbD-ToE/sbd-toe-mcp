import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  handlePrepareCodegenContext,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultBlocked,
  type PrepareCodegenContextResultReady
} from "./prepare-codegen-context.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

function expectBlocked(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultBlocked {
  expect(result.status).not.toBe("ready_for_codegen");
}

function expectReady(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
}

// ---------------------------------------------------------------------------
// Scope gate — needs_clarification
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — needs_clarification", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("returns needs_clarification when task is empty", () => {
    const result = handlePrepareCodegenContext({ task: "" });
    expectBlocked(result);
    expect(result.status).toBe("needs_clarification");
    expect(result.reasons.join(" ")).toMatch(/vazio/i);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("returns needs_clarification when task is too short", () => {
    const result = handlePrepareCodegenContext({ task: "fix bug" });
    expectBlocked(result);
    expect(result.status).toBe("needs_clarification");
    expect(result.reasons.some((reason) => /palavras/i.test(reason))).toBe(true);
  });

  it("returns needs_clarification when task is abstract and no concerns can be inferred", () => {
    const result = handlePrepareCodegenContext({
      task: "do something nice for the team please"
    });
    expectBlocked(result);
    expect(result.status).toBe("needs_clarification");
    expect(result.suggestions.some((s) => /concerns/i.test(s))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scope gate — needs_decomposition
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — needs_decomposition", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("decomposes 'make this application secure'-style asks", () => {
    const result = handlePrepareCodegenContext({
      task: "make this application secure across the whole repo"
    });
    expectBlocked(result);
    expect(result.status).toBe("needs_decomposition");
    expect(result.reasons[0]).toMatch(/(secure|abrangente)/i);
  });

  it("decomposes regulatory 'across the API'-style asks", () => {
    const result = handlePrepareCodegenContext({
      task: "implement CRA compliance across the whole API"
    });
    expectBlocked(result);
    expect(result.status).toBe("needs_decomposition");
  });

  it("decomposes when many slice families are activated", () => {
    const result = handlePrepareCodegenContext({
      task:
        "Refactor authentication, validation, logging, secrets, CI/CD pipeline and release rollback for the payments service",
      risk_level: "L2"
    });
    expectBlocked(result);
    expect(result.status).toBe("needs_decomposition");
    expect(result.reasons.some((r) => /slice families/i.test(r))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ready path — small API/validation ask
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — ready_for_codegen (API validation)", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("returns ready_for_codegen for a bite-size payload validation task", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to the endpoint PATCH /users/:id/email",
      risk_level: "L2",
      mode: "codegen",
      stack: "Node.js/Express",
      exposure: "public",
      data_sensitivity: "personal",
      concerns: ["validation", "api"],
      changed_files: ["src/routes/users.ts"]
    });
    expectReady(result);

    // Activation trace explains every concern + slice family activation.
    expect(result.activation_trace.length).toBeGreaterThan(0);
    expect(
      result.activation_trace.some(
        (entry) => entry.source === "explicit_concern" && entry.produced === "validation"
      )
    ).toBe(true);
    expect(
      result.activation_trace.some(
        (entry) => entry.produced === "ACO-IVF" || entry.produced === "ACO-IAT"
      )
    ).toBe(true);

    // Activated scope drawn deterministically from the published artefacts.
    expect(result.activated_scope.slices.length).toBeGreaterThan(0);
    expect(
      result.activated_scope.slices.some(
        (slice) => slice.objective_family === "ACO-IVF"
      )
    ).toBe(true);
    expect(result.activated_scope.requirements.every((r) => r.source === "runtime_v0")).toBe(
      true
    );
    expect(result.activated_scope.slices.every((s) => s.source === "runtime_v1")).toBe(true);

    // No overlay requested -> overlay context empty + provenance flagged absent.
    expect(result.regulatory_overlay.frameworks).toEqual([]);
    expect(result.provenance.overlay).toBe("absent");

    // citation_map must not be empty for a ready ask and entries must self-report sources.
    expect(Object.keys(result.citation_map).length).toBeGreaterThan(0);
    for (const entry of Object.values(result.citation_map)) {
      expect(["runtime_v0", "runtime_v1", "overlay"]).toContain(entry.source);
      expect(typeof entry.source_data).toBe("string");
      expect(entry.source_data.length).toBeGreaterThan(0);
    }

    // completeness_report must be present with numbers and m_recall in [0,1].
    expect(result.completeness_report.expected_objectives).toBeGreaterThanOrEqual(0);
    expect(result.completeness_report.returned_objectives).toBeGreaterThanOrEqual(0);
    expect(result.completeness_report.m_recall).toBeGreaterThanOrEqual(0);
    expect(result.completeness_report.m_recall).toBeLessThanOrEqual(1);

    // llm_codegen_instructions must enforce grounding rules.
    const joined = result.llm_codegen_instructions.join("\n");
    expect(joined).toMatch(/citation_map/i);
    expect(joined).toMatch(/invent/i);

    // security_rationale_template must be present as a template (with placeholders).
    expect(result.security_rationale_template.decisions[0]?.decision).toMatch(/fill/i);
    expect(result.security_rationale_template.expected_evidence[0]?.artefact).toMatch(/fill/i);
  });

  it("g2_context only carries v1 entities for activated slice families", () => {
    const result = handlePrepareCodegenContext({
      task: "Add input validation to the public API endpoint",
      risk_level: "L1",
      concerns: ["api", "validation"]
    });
    expectReady(result);

    const activatedFamilies = new Set(
      result.activated_scope.slices.map((slice) => slice.objective_family)
    );
    for (const entity of [
      ...result.g2_context.control_objectives,
      ...result.g2_context.mechanisms,
      ...result.g2_context.practices,
      ...result.g2_context.artifacts
    ]) {
      expect(entity.source).toBe("runtime_v1");
      expect(activatedFamilies.has(entity.slice_family)).toBe(true);
    }
  });

  it("resolves at least one DIRECT control via requirement_control_links (link_type=maps_to_control)", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to the endpoint PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["api", "validation"]
    });
    expectReady(result);

    const directControls = result.activated_scope.controls.filter(
      (control) => control.confidence === "direct"
    );
    expect(directControls.length).toBeGreaterThan(0);
    for (const control of directControls) {
      expect(typeof control.control_id).toBe("string");
      expect(control.control_id.length).toBeGreaterThan(0);
      // Direct controls must be cited in citation_map with runtime_v0 source.
      expect(result.citation_map[control.control_id]?.source).toBe("runtime_v0");
    }
  });

  it("projects evidence_patterns using the real runtime schema (id + maps_to_*)", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to the endpoint PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["api", "validation"]
    });
    expectReady(result);

    expect(result.g2_context.evidence_patterns.length).toBeGreaterThan(0);

    const activeRequirementIds = new Set(
      result.activated_scope.requirements.map((requirement) => requirement.requirement_id)
    );
    const activeControlIds = new Set(
      result.activated_scope.controls.map((control) => control.control_id)
    );

    for (const pattern of result.g2_context.evidence_patterns) {
      // Real schema: id is mandatory, plus singular maps_to_* fields.
      expect(typeof pattern.id).toBe("string");
      expect(pattern.id.length).toBeGreaterThan(0);
      expect(pattern.source).toBe("runtime_v0");

      // Every projected pattern must touch the activated scope (otherwise the
      // matcher leaked unrelated patterns into the response).
      const touchesRequirement =
        pattern.maps_to_requirement_id !== undefined &&
        activeRequirementIds.has(pattern.maps_to_requirement_id);
      const touchesControl =
        pattern.maps_to_control_id !== undefined &&
        activeControlIds.has(pattern.maps_to_control_id);
      expect(touchesRequirement || touchesControl).toBe(true);

      // Real shape carries narrative + artifact expectations — at least one
      // must be present so the LLM has something to ground "expected
      // evidence" on.
      const hasNarrative =
        Boolean(pattern.evidence_expectation) ||
        Boolean(pattern.verification_logic) ||
        (pattern.expected_artifact_type_ids?.length ?? 0) > 0;
      expect(hasNarrative).toBe(true);

      // The defunct projection field `pattern_id` must NOT be present.
      expect((pattern as unknown as Record<string, unknown>)["pattern_id"]).toBeUndefined();
    }
  });

  it("manual_grounding only surfaces names that the rastreabilidade publishes", () => {
    const result = handlePrepareCodegenContext({
      task: "Add request input validation to /payments endpoint",
      risk_level: "L1",
      concerns: ["validation", "api"]
    });
    expectReady(result);

    // No name is invented. The loader returns v1_entity_name only when
    // substrate_landing publishes one — never for placeholders.
    for (const entry of result.manual_grounding) {
      if (entry.rastreabilidade_role === "placeholder") {
        expect(entry.v1_entity_name).toBeUndefined();
      }
    }

    // The completeness counters must agree with the projected g2_context.
    const totalV1 =
      result.g2_context.control_objectives.length +
      result.g2_context.mechanisms.length +
      result.g2_context.practices.length +
      result.g2_context.artifacts.length;
    expect(
      result.completeness_report.named_v1_entities +
        result.completeness_report.unnamed_v1_entities
    ).toBe(totalV1);
  });
});

// ---------------------------------------------------------------------------
// Overlay flows
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — regulatory overlay activation", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("includes regulatory overlay when a known framework is requested", () => {
    const result = handlePrepareCodegenContext({
      task: "Add SBOM generation step to the CI build pipeline",
      risk_level: "L2",
      concerns: ["supply_chain"],
      regulatory_frameworks: ["CRA"],
      include_regulatory_overlay: true
    });
    expectReady(result);

    // Frameworks resolved and added to activated_scope.
    expect(
      result.regulatory_overlay.frameworks.some(
        (framework) => framework.framework_id === "EXT-CRA"
      )
    ).toBe(true);
    expect(
      result.activated_scope.regulatory_obligations.some(
        (obligation) => obligation.framework_id === "EXT-CRA"
      )
    ).toBe(true);

    // citation_map carries overlay-sourced entries.
    const overlayCitations = Object.values(result.citation_map).filter(
      (entry) => entry.source === "overlay"
    );
    expect(overlayCitations.length).toBeGreaterThan(0);

    // Provenance must surface the overlay source.
    expect(result.provenance.overlay).toMatch(/overlay/);

    // LLM instructions warn the LLM not to declare compliance.
    expect(
      result.llm_codegen_instructions.some((line) =>
        /compliance|EXTERNAL cross-check/i.test(line)
      )
    ).toBe(true);
  });

  it("returns unsupported_scope when the requested framework is unknown", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["validation"],
      regulatory_frameworks: ["EXT-DOES-NOT-EXIST"],
      include_regulatory_overlay: true
    });
    expectBlocked(result);
    expect(result.status).toBe("unsupported_scope");
    expect(result.reasons.join(" ")).toMatch(/Nenhuma framework/i);
  });
});

// ---------------------------------------------------------------------------
// Provenance & citation_map shape
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — output shape contracts", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("output carries provenance, citation_map and completeness_report on ready", () => {
    const result = handlePrepareCodegenContext({
      task: "Add input validation to the public REST endpoint /orders",
      risk_level: "L2",
      concerns: ["api", "validation"]
    });
    expectReady(result);
    expect(result.provenance.runtime_v0).toMatch(/runtime/);
    expect(result.provenance.runtime_v1).toMatch(/runtime\/v1/);
    expect(result.citation_map).toBeDefined();
    expect(result.completeness_report.v1_consistency_mismatches).toEqual([]);
  });

  it("blocked outputs still carry partial_activation_trace + suggestions", () => {
    const result = handlePrepareCodegenContext({
      task: "Make the whole app secure across all surfaces"
    });
    expectBlocked(result);
    expect(result.partial_activation_trace).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("debug: true exposes rejected candidates and notes", () => {
    const result = handlePrepareCodegenContext({
      task: "Add validation to PATCH /users/:id/email",
      risk_level: "L1",
      concerns: ["api", "validation", "nonexistent_concern_xyz"],
      debug: true
    });
    expectReady(result);
    expect(result.debug).toBeDefined();
    expect(
      result.debug?.rejected_candidates.some((entry) =>
        entry.reason.includes("nonexistent_concern_xyz")
      )
    ).toBe(true);
  });

  it("review mode adds review-specific guidance to llm_codegen_instructions", () => {
    const result = handlePrepareCodegenContext({
      task: "Review changes to PATCH /users/:id/email validation",
      mode: "review",
      risk_level: "L2",
      concerns: ["api", "validation"],
      changed_files: ["src/routes/users.ts"]
    });
    expectReady(result);
    expect(
      result.llm_codegen_instructions.some((line) => /review mode/i.test(line))
    ).toBe(true);
  });

  it("test-plan mode adds test-plan-specific guidance", () => {
    const result = handlePrepareCodegenContext({
      task: "Plan tests for the validation logic at PATCH /users/:id/email",
      mode: "test-plan",
      risk_level: "L2",
      concerns: ["api", "validation", "testing"]
    });
    expectReady(result);
    expect(
      result.llm_codegen_instructions.some((line) => /test-plan/i.test(line))
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WP6 — semantic disambiguation gate cases
// ---------------------------------------------------------------------------

describe("WP6 semantic disambiguation — gate cases", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("'endpoint seguro' activates api/auth/validation/logging with explainable trace (regardless of gate status)", () => {
    // This gate test only asserts that the semantic activation step produces
    // the four expected concerns explainably. It is independent of whether
    // the scope gate then ships the ask to codegen — a four-concern ask
    // legitimately decomposes when the requirement set is large.
    const result = handlePrepareCodegenContext({
      task: "Garantir que este endpoint seguro está bem implementado",
      risk_level: "L2",
      debug: true
    });
    const trace =
      result.status === "ready_for_codegen"
        ? result.activation_trace
        : result.partial_activation_trace;
    const concernsTriggered = new Set(
      trace
        .filter((entry) =>
          [
            "compound_term",
            "task_term",
            "alias_expansion",
            "explicit_concern",
            "intent_keyword"
          ].includes(entry.source)
        )
        .map((entry) => entry.produced)
    );
    for (const expected of ["api", "auth", "validation", "logging"]) {
      expect(concernsTriggered.has(expected)).toBe(true);
    }
    // The compound activation must be present so the trace is auditable.
    expect(
      trace.some(
        (entry) =>
          entry.source === "compound_term" && entry.trigger.includes("endpoint seguro")
      )
    ).toBe(true);
    // Each trace entry exposes a numeric score.
    for (const entry of trace) {
      expect(typeof entry.score).toBe("number");
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(1);
    }
  });

  it("'segredo hardcoded' activates config + secrets (PT alias expansion)", () => {
    const result = handlePrepareCodegenContext({
      task: "Remover o segredo hardcoded do ficheiro src/config.ts",
      risk_level: "L2",
      debug: true
    });
    expectReady(result);
    const concernsTriggered = new Set(
      result.activation_trace
        .filter((entry) =>
          ["compound_term", "task_term", "alias_expansion", "explicit_concern"].includes(
            entry.source
          )
        )
        .map((entry) => entry.produced)
    );
    expect(concernsTriggered.has("secrets")).toBe(true);
    expect(concernsTriggered.has("config")).toBe(true);
    // alias_expansion: 'segredo' should appear in notes (semantic gateway expansion).
    expect(
      result.debug?.notes.some((note) => /alias_expansion.*segredo/.test(note))
    ).toBe(true);
  });

  it("'pipeline release' activates build + release but does NOT activate the whole app", () => {
    const result = handlePrepareCodegenContext({
      task: "Add an approval gate to the release pipeline before promotion",
      risk_level: "L2",
      debug: true
    });
    expectReady(result);
    const concernsTriggered = new Set(
      result.activation_trace
        .filter((entry) =>
          [
            "compound_term",
            "task_term",
            "alias_expansion",
            "explicit_concern",
            "intent_keyword"
          ].includes(entry.source)
        )
        .map((entry) => entry.produced)
    );
    expect(concernsTriggered.has("release")).toBe(true);
    expect(concernsTriggered.has("build")).toBe(true);
    // Must NOT activate the unrelated cross-cutting domains.
    expect(concernsTriggered.has("auth")).toBe(false);
    expect(concernsTriggered.has("validation")).toBe(false);
    expect(concernsTriggered.has("encryption")).toBe(false);
    // Slice families stay narrow (<=3).
    const sliceFamilies = new Set(
      result.activated_scope.slices.map((slice) => slice.objective_family)
    );
    expect(sliceFamilies.size).toBeLessThanOrEqual(3);
  });

  it("intent_keyword 'sbom' activates supply_chain via the semantic gateway", () => {
    const result = handlePrepareCodegenContext({
      task: "Update the SBOM generation step in our package workflow",
      risk_level: "L2",
      debug: true
    });
    expectReady(result);
    expect(
      result.activation_trace.some(
        (entry) =>
          entry.source === "intent_keyword" && entry.produced === "supply_chain"
      )
    ).toBe(true);
  });

  it("debug shows rejected candidates for unknown concerns and capped evidence patterns", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["api", "validation", "definitely_not_a_concern_zzz"],
      debug: true
    });
    expectReady(result);
    expect(result.debug).toBeDefined();
    // Rejected unknown concern
    expect(
      result.debug?.rejected_candidates.some(
        (entry) =>
          entry.trigger.includes("definitely_not_a_concern_zzz") && entry.score === 0
      )
    ).toBe(true);
    // Capped evidence patterns appear with source=scope_gate when there are
    // more than the cap. We assert structurally: the cap is honoured and any
    // capped entries are tagged so the LLM can audit the omission.
    const capped =
      result.debug?.rejected_candidates.filter(
        (entry) => entry.source === "scope_gate"
      ) ?? [];
    expect(
      result.completeness_report.evidence_patterns_capped
    ).toBe(capped.length);
  });
});

describe("WP9 hardening — TASK_TERM whole-word matching", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("does not activate 'testing' from the substring 'test' inside 'latest'", () => {
    const result = handlePrepareCodegenContext({
      task: "Use the latest patch for the database driver",
      risk_level: "L1",
      debug: true
    });
    const trace =
      result.status === "ready_for_codegen"
        ? result.activation_trace
        : result.partial_activation_trace;
    const concernsTriggered = new Set(
      trace
        .filter((entry) =>
          ["task_term", "compound_term", "alias_expansion"].includes(entry.source)
        )
        .map((entry) => entry.produced)
    );
    expect(concernsTriggered.has("testing")).toBe(false);
  });

  it("does not activate 'logging' from 'logical' substring", () => {
    const result = handlePrepareCodegenContext({
      task: "Refactor logical conditions in the user filter helper",
      risk_level: "L1",
      debug: true
    });
    const trace =
      result.status === "ready_for_codegen"
        ? result.activation_trace
        : result.partial_activation_trace;
    const concernsTriggered = new Set(
      trace
        .filter((entry) =>
          ["task_term", "compound_term", "alias_expansion"].includes(entry.source)
        )
        .map((entry) => entry.produced)
    );
    expect(concernsTriggered.has("logging")).toBe(false);
  });

  it("still activates the term when it appears as a whole word", () => {
    const result = handlePrepareCodegenContext({
      task: "Add unit test coverage for payment input validation",
      risk_level: "L2",
      debug: true
    });
    const trace =
      result.status === "ready_for_codegen"
        ? result.activation_trace
        : result.partial_activation_trace;
    const concernsTriggered = new Set(
      trace
        .filter((entry) =>
          ["task_term", "compound_term", "alias_expansion"].includes(entry.source)
        )
        .map((entry) => entry.produced)
    );
    expect(concernsTriggered.has("testing")).toBe(true);
    expect(concernsTriggered.has("validation")).toBe(true);
  });
});

describe("WP6 semantic disambiguation — evidence pattern capping", () => {
  beforeEach(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("caps evidence_patterns to <= EVIDENCE_PATTERN_CAP and exposes counts in completeness_report", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["api", "validation"]
    });
    expectReady(result);
    expect(result.g2_context.evidence_patterns.length).toBeLessThanOrEqual(
      result.completeness_report.evidence_pattern_cap
    );
    expect(result.completeness_report.evidence_patterns_returned).toBe(
      result.g2_context.evidence_patterns.length
    );
    expect(
      result.completeness_report.evidence_patterns_total
    ).toBeGreaterThanOrEqual(result.completeness_report.evidence_patterns_returned);
  });

  it("ranks evidence_patterns by relevance_score in descending order", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["api", "validation"]
    });
    expectReady(result);
    const scores = result.g2_context.evidence_patterns.map((pattern) => pattern.relevance_score);
    expect(scores.length).toBeGreaterThan(0);
    for (let index = 1; index < scores.length; index += 1) {
      const prev = scores[index - 1] ?? 0;
      const current = scores[index] ?? 0;
      expect(prev).toBeGreaterThanOrEqual(current);
    }
    expect(scores[0]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Runtime v1 missing -> unsupported_scope (does NOT throw to caller)
// ---------------------------------------------------------------------------

describe("handlePrepareCodegenContext — runtime v1 missing", () => {
  const originalAppRoot = process.env.SBD_TOE_APP_ROOT;
  let scratchRoot: string | undefined;

  beforeEach(async () => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
    scratchRoot = await mkdtemp(path.join(tmpdir(), "prepare-no-v1-"));
    process.env.SBD_TOE_APP_ROOT = scratchRoot;
  });

  afterAll(() => {
    if (originalAppRoot === undefined) {
      delete process.env.SBD_TOE_APP_ROOT;
    } else {
      process.env.SBD_TOE_APP_ROOT = originalAppRoot;
    }
  });

  it("returns unsupported_scope when runtime/v1 is absent", () => {
    const result = handlePrepareCodegenContext({
      task: "Add payload validation to PATCH /users/:id/email",
      risk_level: "L2",
      concerns: ["validation", "api"]
    });
    expectBlocked(result);
    expect(result.status).toBe("unsupported_scope");
    expect(result.reasons.some((line) => /AppSec Core v1/i.test(line))).toBe(true);
    expect(result.partial_activation_trace.length).toBeGreaterThan(0);
  });
});
