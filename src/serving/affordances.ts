/**
 * affordances — the RF-H per-tool advisory band (the `next` clause of the protocol).
 *
 * Stage 3: the greenfield tools (implementation-view + regulatory) already emit `next`
 * via the protocol envelope; this module retrofits the SAME band onto the legacy tools
 * so every response carries the advisory layer — closing the protocol.
 *
 * Each builder is a PURE function of the response (deterministic, invariant #8), returns
 * ≤3 ranked affordances (boundAffordances), references only REAL tools/resources (never
 * invented), and is the cross-tool complement of the E5 coverage band (coverage = depth
 * of THIS tool's set; next = breadth to ADJACENT tools). Seed: the RF-H per-tool table
 * in DevelopmentGovernance/docs/mcp-role-skill-and-affordance-capabilities.md.
 */

import { boundAffordances, type Affordance } from "./protocol-envelope.js";

const concernsHint = (concerns: string[] | undefined): string =>
  concerns && concerns.length > 0 ? `concerns=[${concerns.slice(0, 5).join(", ")}]` : "<=3 concerns";

export function listChaptersAffordances(): Affordance[] {
  return boundAffordances([
    { intent: "open a chapter's operational brief", tool: "get_sbd_toe_chapter_brief", with: "chapterId", kind: "structural" },
    { intent: "filter chapters by what's active at a risk level", tool: "map_sbd_toe_applicability", with: "riskLevel", kind: "semantic" },
    { intent: "select the requirements for one concrete task", tool: "select_sbd_toe_requirements", with: "risk_level + task (+ changed_files)", kind: "semantic" }
  ]);
}

export function mapApplicabilityAffordances(riskLevel: string | undefined): Affordance[] {
  const L = riskLevel ?? "L2";
  return boundAffordances([
    { intent: "select the requirements for one concrete task in this scope", tool: "select_sbd_toe_requirements", with: `risk_level="${L}", task (+ changed_files)`, kind: "structural" },
    { intent: "get the requirements for the active areas", tool: "consult_security_requirements", with: `risk_level="${L}", <=5 concerns (recomendado <=3; compostas → select)`, kind: "structural" },
    { intent: "list the governance artefacts to produce", tool: "plan_sbd_toe_repo_governance", with: `riskLevel="${L}"`, kind: "semantic" }
  ]);
}

export function selectRequirementsAffordances(riskLevel: string, selectedIds: readonly string[] = [], lexicalConcerns?: readonly string[]): Affordance[] {
  // 0.19.0: dominância lexical ⇒ a 1ª sugestão é ESTABILIZAR a selecção.
  const stability: Affordance[] = lexicalConcerns && lexicalConcerns.length > 0
    ? [{ intent: "a redacção decide parte desta selecção — re-corre com concerns EXPLÍCITOS para estabilidade", tool: "select_sbd_toe_requirements", with: `risk_level="${riskLevel}", concerns=[${lexicalConcerns.slice(0, 5).join(", ")}]`, kind: "structural" }]
    : [];
  const idsHint = selectedIds.length > 0 ? `requirement_ids=[${selectedIds.slice(0, 3).join(", ")}${selectedIds.length > 3 ? ", …" : ""}]` : "requirement_ids=[…os selected…]";
  const proveRow: Affordance = { intent: "provar os requisitos seleccionados (requisito → prova)", tool: "get_sbd_toe_verification_matrix", with: `risk_level="${riskLevel}", ${idsHint}`, kind: "structural" };
  const consultRow: Affordance = { intent: "get the controls/artifacts behind the selected requirements", tool: "consult_security_requirements", with: `risk_level="${riskLevel}", <=5 concerns (recomendado <=3)`, kind: "structural" };
  const prepareRow: Affordance = { intent: "prepare grounded codegen context for one concrete task", tool: "prepare_sbd_toe_codegen_context", with: "task + risk_level (+ changed_files)", kind: "semantic" };
  // 0.19.0: com dominância lexical, a 1ª sugestão é ESTABILIZAR — sai a matrix,
  // NUNCA o par prepare+consult (contrato ensinado no R3/TC-F-13).
  return boundAffordances(stability.length > 0 ? [...stability, consultRow, prepareRow] : [proveRow, consultRow, prepareRow]);
}

export function consultAffordances(riskLevel: string, concerns: string[] | undefined): Affordance[] {
  return boundAffordances([
    { intent: "narrow to what applies to ONE concrete task (two declared bands)", tool: "select_sbd_toe_requirements", with: `risk_level="${riskLevel}", task`, kind: "structural" },
    { intent: "see the threats these requirements mitigate", tool: "get_threat_landscape", with: `risk_level="${riskLevel}", ${concernsHint(concerns)}`, kind: "semantic" },
    { intent: "turn the requirements into per-role work", tool: "get_guide_by_role", with: `risk_level="${riskLevel}", role`, kind: "semantic" }
  ]);
}

export function chapterBriefAffordances(chapterId: string | undefined): Affordance[] {
  return boundAffordances([
    { intent: "list this chapter's entities (controls/threats/artefacts)", tool: "query_sbd_toe_entities", with: chapterId ? `chapter="${chapterId}"` : "chapter", kind: "structural" },
    { intent: "get the per-role work for this chapter", tool: "get_guide_by_role", with: "risk_level + role (+ phase)", kind: "semantic" },
    { intent: "get the implementation checklist for this chapter", tool: "get_sbd_toe_chapter_implementation_checklist", with: chapterId ? `chapter="${chapterId}"` : "chapter", kind: "semantic" }
  ]);
}

export function queryEntitiesAffordances(): Affordance[] {
  return boundAffordances([
    { intent: "resolve full structured detail by type + filters", tool: "resolve_entities", with: "record_type, filters", kind: "structural" },
    { intent: "look up an exact id (CTRL-…/MT-…/ART-…)", tool: "query_sbd_toe_entities", with: 'query="<exact-id>"', kind: "structural" }
  ]);
}

export function resolveEntitiesAffordances(): Affordance[] {
  return boundAffordances([
    { intent: "read the entity schemas", tool: "sbd://toe/ontology", kind: "structural" },
    { intent: "see how these entities map to role work", tool: "get_guide_by_role", with: "risk_level + role, include_detail=true", kind: "semantic" }
  ]);
}

export function guideByRoleAffordances(riskLevel: string, role: string | null): Affordance[] {
  return boundAffordances([
    { intent: "get a user story's full Definition-of-Done detail", tool: "resolve_entities", with: 'record_type="user_story", filters', kind: "structural" },
    { intent: "get the implementation checklist for a chapter in scope", tool: "get_sbd_toe_chapter_implementation_checklist", with: "chapter", kind: "semantic" },
    ...(role ? [{ intent: "install this role as a skill / sub-agent", tool: "generate_sbd_toe_skill", with: `role="${role}", format=subagent`, kind: "semantic" as const }] : [])
  ]);
}

export function threatLandscapeAffordances(riskLevel: string, concerns: string[] | undefined): Affordance[] {
  return boundAffordances([
    { intent: "resolve a mitigating control's full detail", tool: "resolve_entities", with: 'record_type="control", filters', kind: "structural" },
    { intent: "get the requirements behind these threats", tool: "consult_security_requirements", with: `risk_level="${riskLevel}", ${concernsHint(concerns)}`, kind: "semantic" }
  ]);
}

export function planRepoGovernanceAffordances(riskLevel: string | null): Affordance[] {
  return boundAffordances([
    { intent: "filter chapters by what's active at a level", tool: "map_sbd_toe_applicability", with: riskLevel ? `riskLevel="${riskLevel}"` : "riskLevel", kind: "semantic" },
    { intent: "open a chapter's brief to scope its artefacts", tool: "get_sbd_toe_chapter_brief", with: "chapterId", kind: "structural" }
  ]);
}

export function reviewScopeAffordances(riskLevel: string): Affordance[] {
  return boundAffordances([
    { intent: "get the requirements for the bundles in scope", tool: "consult_security_requirements", with: `risk_level="${riskLevel}", <=5 concerns (recomendado <=3)`, kind: "semantic" },
    { intent: "prepare grounded review context for the changed files", tool: "prepare_sbd_toe_codegen_context", with: "mode=review", kind: "semantic" }
  ]);
}

export function prepareCodegenAffordances(status: string): Affordance[] {
  const byStatus: Affordance =
    status === "needs_decomposition"
      ? { intent: "split into 2-4 subtasks and call again per subtask", tool: "prepare_sbd_toe_codegen_context", with: "one subtask scope", kind: "structural" }
      : status === "ready_for_codegen"
        ? { intent: "cite the citation_map and fill the rationale as you implement", tool: "resolve_entities", with: "the cited ids", kind: "structural" }
        : { intent: "narrow the scope or consult requirements to unblock", tool: "consult_security_requirements", with: "risk_level + <=5 concerns (recomendado <=3)", kind: "structural" };
  return boundAffordances([
    byStatus,
    { intent: "check the threats relevant to this work", tool: "get_threat_landscape", with: "risk_level + concerns", kind: "semantic" }
  ]);
}

export function generateSkillAffordances(): Affordance[] {
  return boundAffordances([
    { intent: "get a role-specialised skill or installable sub-agent", tool: "generate_sbd_toe_skill", with: "role, format=skill|subagent, flavour=harnessed|skilled", kind: "semantic" },
    { intent: "read the canonical operating guide", tool: "sbd://toe/agent-guide", kind: "structural" }
  ]);
}
