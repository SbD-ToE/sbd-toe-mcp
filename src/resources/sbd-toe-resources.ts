// Static chapter applicability data aligned with the SbD-ToE manual (chapters 00–14).
// Source of truth: assets/agent-guide.md chapter reference table.
// Used by MCP resources chapter-applicability and prompt setup_sbd_toe_agent.

import { CANONICAL_ANCHOR, GRADUATED_SEMANTICS, gradedChapters } from "../serving/applicability.js";
import { readFileSync } from "node:fs";
import path from "node:path";

import { resolveAppPath } from "../config.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}


// (ciclo 0.14.0) RISK_LEVEL_CHAPTERS morreu — «capítulo nunca se exclui por nível»
// (decisão do Author, 2026-09-01). Derivação graduada: src/serving/applicability.ts.


/**
 * Returns a JSON-serialisable object with active/excluded chapters for the given risk level.
 * Throws if riskLevel is not in the allowlist.
 * SEC note: riskLevel validated via allowlist (VAL-002).
 */
export function buildChapterApplicabilityJson(riskLevel: string): object {
  if (!isValidRiskLevel(riskLevel)) {
    throw new Error(
      `riskLevel inválido: "${riskLevel}". Valores permitidos: L1, L2, L3.`
    );
  }
  // Ciclo 0.14.0 — aplicabilidade GRADUADA, derivada dos dados do bundle.
  return {
    riskLevel,
    semantics: GRADUATED_SEMANTICS,
    canonical_anchor: CANONICAL_ANCHOR,
    chapters: gradedChapters(riskLevel)
  };
}

/**
 * Returns a structured prompt text instructing an agent to follow the SbD-ToE manual.
 * Throws if riskLevel is not in the allowlist.
 * SEC note: riskLevel validated via allowlist (VAL-002); projectRole is optional free text included as-is.
 */
export function buildSetupAgentPrompt(riskLevel: string, projectRole?: string): string {
  if (!isValidRiskLevel(riskLevel)) {
    throw new Error(
      `riskLevel inválido: "${riskLevel}". Valores permitidos: L1, L2, L3.`
    );
  }

  const roleContext =
    projectRole !== undefined && projectRole.length > 0
      ? ` Project role: ${projectRole}.`
      : "";

  // Ciclo 0.14.0: aplicabilidade graduada — presença sempre, exigência escala.
  const graded = gradedChapters(riskLevel);
  const mandatory = graded.filter((c) => c.dominant === "obrigatorio").map((c) => `${c.chapter_id} (${c.title})`);
  const others = graded.filter((c) => c.dominant !== "obrigatorio").map((c) => `${c.chapter_id} (${c.dominant})`);

  return [
    `You are operating under the SbD-ToE manual at risk level ${riskLevel}.${roleContext}`,
    "",
    "Applicability is GRADUATED (Author decision, 2026-09-01): every chapter applies at",
    "every level — the DEMAND scales L1→L3 per the chapter-01 canonical matrix and the",
    "authored user-story proportionality. No chapter is excluded.",
    "",
    `Dominantly MANDATORY at ${riskLevel}:`,
    mandatory.join(", ") || "(none dominant-mandatory at this level)",
    "",
    `Remaining chapters (dominant demand in parentheses):`,
    others.join(", "),
    "",
    "Rules:",
    "1. Always start with Cap. 00 (Fundamentos) → Cap. 01 → Cap. 02 before any technical chapter.",
    "2. Use search_sbd_toe_manual for grounding before answering about the manual.",
    "3. Never assert compliance without evidence in the codebase or manual.",
    "4. Never invent citations, chapter references, control IDs, or links.",
    "5. Treat AI-generated code as untrusted — require human review.",
    "",
    "Recommended next step:",
    `Call plan_sbd_toe_repo_governance(riskLevel="${riskLevel}") to get the full list of artefacts/documents`,
    "the manual identifies for this risk level, grouped by chapter.",
    "Use that list as the basis for any governance, documentation, or audit planning — do not invent artefacts."
  ].join("\n");
}

const VALID_CODEGEN_MODES = ["codegen", "review", "test-plan"] as const;
type CodegenMode = (typeof VALID_CODEGEN_MODES)[number];

function isValidCodegenMode(value: unknown): value is CodegenMode {
  return typeof value === "string" && (VALID_CODEGEN_MODES as readonly string[]).includes(value);
}

/**
 * Loads the static grounded-codegen guide from disk. Path is resolved against
 * the configured app root so packaged installs and dev checkouts both work.
 */
export function readGroundedCodegenGuide(): string {
  const guidePath = resolveAppPath(path.join("prompts", "sbd-toe-grounded-codegen.md"));
  return readFileSync(guidePath, "utf-8");
}

/**
 * Builds a per-task prompt that bundles the canonical grounded-codegen guide
 * with the user's task and a directive to call `prepare_sbd_toe_codegen_context`
 * before producing any code. The mode/risk_level/concerns/regulatory_frameworks
 * arguments are echoed back so the agent can call the tool with the same shape
 * the user described.
 */
export function buildGroundedCodegenPrompt(args: {
  task: string;
  mode?: string;
  riskLevel?: string;
  concerns?: readonly string[];
  regulatoryFrameworks?: readonly string[];
  includeRegulatoryOverlay?: boolean;
  stack?: string;
}): string {
  const task = args.task.trim();
  if (task.length === 0) {
    throw new Error('The "task" argument is required and must be a non-empty string.');
  }
  const mode = isValidCodegenMode(args.mode) ? args.mode : "codegen";
  // Whitelist riskLevel to L1/L2/L3. Anything else (including stray strings,
  // numbers cast to string, etc.) is treated as "not provided" so the agent
  // is forced to ask the user instead of echoing untrusted input.
  const riskLevelLine = isValidRiskLevel(args.riskLevel)
    ? `- risk_level: ${args.riskLevel}`
    : '- risk_level: (not provided — ask the user before proceeding if the ask is non-trivial)';
  const concernsLine =
    args.concerns && args.concerns.length > 0
      ? `- concerns: [${args.concerns.map((concern) => JSON.stringify(concern)).join(", ")}]`
      : "- concerns: (let the activation engine infer them, or supply explicit ones if you have them)";
  const stackLine =
    args.stack !== undefined && args.stack.length > 0
      ? `- stack: ${args.stack}`
      : "- stack: (informational)";
  const overlayWanted =
    args.includeRegulatoryOverlay === true ||
    (args.regulatoryFrameworks !== undefined && args.regulatoryFrameworks.length > 0);
  const regulatoryLine = overlayWanted
    ? `- regulatory_frameworks: ${
        args.regulatoryFrameworks && args.regulatoryFrameworks.length > 0
          ? `[${args.regulatoryFrameworks.map((framework) => JSON.stringify(framework)).join(", ")}]`
          : "(none specified — overlay catalog only)"
      }; include_regulatory_overlay: true`
    : "- regulatory_frameworks: (none); include_regulatory_overlay: false";

  const guide = readGroundedCodegenGuide();

  return [
    guide,
    "",
    "---",
    "",
    "## Task for this session",
    "",
    `> ${task}`,
    "",
    "### Suggested first tool call",
    "",
    "Call `prepare_sbd_toe_codegen_context` with at least:",
    "",
    `- task: ${JSON.stringify(task)}`,
    `- mode: ${mode}`,
    riskLevelLine,
    concernsLine,
    stackLine,
    regulatoryLine,
    "",
    "Then branch on `status` exactly as described in the guide above:",
    "- `ready_for_codegen` → fill `security_rationale_template`, cite `citation_map` IDs, produce code + tests + evidence.",
    "- `needs_clarification` → STOP, ask the user the specific missing inputs.",
    "- `needs_decomposition` → STOP, propose 2–4 bite-size sub-tasks; ask the user to pick one before re-calling the tool.",
    "- `unsupported_scope` → STOP, report the missing capability verbatim. Do NOT fabricate IDs.",
    "",
    "Do NOT declare regulatory compliance. Do NOT invent identifiers. Do NOT treat AI-generated code as evidence."
  ].join("\n");
}
