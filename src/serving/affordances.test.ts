import { describe, it, expect } from "vitest";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { handleGetGuideByRole } from "../tools/get-guide-by-role.js";
import { handleResolveEntities } from "../tools/resolve-entities.js";
import {
  handleListSbdToeChapters,
  handleMapSbdToeApplicability,
  handleGetSbdToeChapterBrief
} from "../tools/structured-tools.js";
import { handlePlanRepoGovernance } from "../tools/plan-repo-governance.js";
import { handleMapSbdToeReviewScope } from "../tools/map-review-scope.js";

// Stage 3 RF-H: the advisory `next` band is retrofitted onto every legacy tool.
// All registered tool names the affordances may reference (real tools / resources only).
const REAL_TOOLS = new Set([
  "read_sbd_toe_resource",
  "trace_sbd_toe_requirement_sources",
  "search_sbd_toe_manual", "answer_sbd_toe_manual", "list_sbd_toe_chapters",
  "query_sbd_toe_entities", "get_sbd_toe_chapter_brief", "map_sbd_toe_applicability",
  "consult_security_requirements", "select_sbd_toe_requirements", "get_threat_landscape", "get_guide_by_role",
  "resolve_entities", "prepare_sbd_toe_codegen_context", "map_sbd_toe_review_scope",
  "plan_sbd_toe_repo_governance", "generate_sbd_toe_skill", "inspect_sbd_toe_retrieval",
  "map_sbd_toe_regulatory_activation", "get_sbd_toe_chapter_implementation_checklist",
  "get_sbd_toe_operating_model", "plan_sbd_toe_rollout", "assess_sbd_toe_implementation",
  "get_sbd_toe_verification_matrix"
]);
const REAL_RESOURCE_PREFIX = "sbd://toe/";

function assertBand(next: unknown) {
  expect(Array.isArray(next)).toBe(true);
  const arr = next as Array<{ tool: string; kind: string; intent: string }>;
  expect(arr.length).toBeGreaterThan(0);
  expect(arr.length).toBeLessThanOrEqual(3); // RF-H ≤3
  for (const a of arr) {
    expect(typeof a.intent).toBe("string");
    expect(["structural", "semantic"]).toContain(a.kind);
    const isTool = REAL_TOOLS.has(a.tool);
    const isResource = a.tool.startsWith(REAL_RESOURCE_PREFIX);
    expect(isTool || isResource, `affordance references a real tool/resource: ${a.tool}`).toBe(true);
  }
}

describe("RF-H — next band on every legacy tool", () => {
  it("consult / threat / guide / resolve carry a grounded next band", () => {
    assertBand(handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["AUT"] }).next);
    assertBand(handleGetThreatLandscape({ risk_level: "L2", concerns: ["AUT"] }).next);
    assertBand(handleGetGuideByRole({ risk_level: "L2", role: "qa" }).next);
    assertBand(handleResolveEntities({ record_type: "control" }).next);
  });

  it("structured tools (list / applicability / chapter-brief) carry a next band", () => {
    assertBand((handleListSbdToeChapters({}) as { next: unknown }).next);
    assertBand((handleMapSbdToeApplicability({ riskLevel: "L2" }) as { next: unknown }).next);
    assertBand((handleGetSbdToeChapterBrief({ chapterId: "02-requisitos-seguranca" }) as { next: unknown }).next);
  });

  it("plan_repo_governance and map_review_scope carry a next band", () => {
    assertBand(handlePlanRepoGovernance({ riskLevel: "L2" }).next);
    assertBand(handleMapSbdToeReviewScope({ changedFiles: ["Dockerfile"], riskLevel: "L2" }).next);
  });

  it("the band is deterministic (pure function of the response)", () => {
    const a = handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["AUT"] }).next;
    const b = handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["AUT"] }).next;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
