# SbD-ToE Grounded Codegen Guide

This guide tells an AI agent how to generate, review or test-plan code with SbD-ToE grounding using the `prepare_sbd_toe_codegen_context` MCP tool. The tool itself does NOT generate code. It returns deterministic context (requirements, controls, slices, evidence patterns, regulatory obligations) that the agent must use to produce traceable output.

Authority: the MCP server is the only source of normative IDs (requirement_id, control_id, slice_id, evidence pattern id, regulatory obligation_id). Anything not in the tool's `citation_map` does NOT exist for the purposes of SbD-ToE grounding.

---

## Workflow

1. Collect the user's task. Identify minimum bite-size: one technical surface, one phase, 1–3 concerns.
2. Call `prepare_sbd_toe_codegen_context` with at least `task`. Provide `risk_level`, `mode` (`codegen` | `review` | `test-plan`), `stack`, `exposure`, `data_sensitivity`, `concerns`, `changed_files`, `regulatory_frameworks`, `include_regulatory_overlay` whenever they are known.
3. Branch on `status`. Do NOT generate code before reading the status.

### status: ready_for_codegen

You may proceed. Treat the response as the only normative context.

Required output discipline:

- Cite at least one ID from `citation_map` per non-trivial decision in `security_rationale.decisions[].cited_ids`. If no ID applies, write `"none"` and justify in the rationale.
- Fill `security_rationale.validations[]` with the concrete code-level validations you implemented (surface, rule, rejection behaviour).
- Fill `security_rationale.expected_evidence[]` with the artefacts a reviewer should look for (test path, log shape, SBOM entry, attestation, scan report). Code on its own is NEVER evidence.
- Fill `security_rationale.residual_risk` with anything NOT addressed by this change.
- Preserve relevance ranking: the response's `g2_context.evidence_patterns` is already ordered and capped. Prefer the highest-scored patterns; if you skip a high-score one, justify it.
- Mention `completeness_report.m_recall` when below `1.0` — that signals partial coverage and the agent must flag it.

### status: needs_clarification

STOP code generation. Reply to the user with:

1. The `reasons[]` from the tool response, in plain language.
2. A minimal set of follow-up questions derived from `suggestions[]`. Do NOT propose code, scaffolds or fixes. Do NOT call `prepare_sbd_toe_codegen_context` again until the user has supplied the missing inputs.

### status: needs_decomposition

STOP code generation. Reply to the user with:

1. The `reasons[]` showing why the ask is too broad.
2. A proposed decomposition into 2–4 bite-size sub-tasks, each scoped to:
   - one technical surface (endpoint, module, file group);
   - one phase (`implement` | `test` | `deploy` | `operate`);
   - 1–3 concerns from the lexicon surfaced by `partial_activation_trace`.
3. Ask the user which sub-task to take first. Once chosen, call `prepare_sbd_toe_codegen_context` again for THAT sub-task.

Never silently pick one sub-task and proceed.

### status: unsupported_scope

STOP. Report the missing capability verbatim:

- AppSec Core v1 runtime ausente → the deployment is incomplete; the user must re-run `npm run checkout:backend` or pin a different KG snapshot.
- Overlay regulatório ausente → the deployment does not publish overlay artefacts; the user must remove `regulatory_frameworks` / `include_regulatory_overlay` or wait for the overlay to be published.
- Framework regulatório desconhecida → list the supported short codes from `regulatory_overlay.frameworks` if present.

Do NOT fabricate IDs, slices, or obligations to keep working.

---

## Context reuse — one call per task, then loop on it

The tool is deterministic: an identical call returns an identical payload. Re-calling it with the same task only re-buys context you already hold.

- The payload already in context is the source for the whole write-test-edit loop: test and fix against the citations and requirements you already received — do NOT re-call the tool with the same task.
- Legitimate re-consultations (refining `concerns`, deepening one requirement) use `detail: "minimal"` or a targeted `consult_security_requirements` call — never re-request the full payload.
- Use `mode: "review"` for the review step only if it runs in a new session; in the same session, review against the context already received.

---

## Output discipline — what to ALWAYS do

- Treat `citation_map` as the closed world of valid identifiers for this task.
- Distinguish three artefact classes in any answer:
  - **Code** — the actual source you propose to add or change.
  - **Tests** — automated checks that exercise the validation rules in `security_rationale.validations[]`.
  - **Evidence** — artefacts a reviewer can inspect (log lines, SBOM, attestation, audit report, scan output). Tests are part of evidence; code is not.
- Surface IDs in the PR description / commit message / `security_rationale`. Avoid filling source files with `// per ACO-IVF-001` style comments — rastreabilidade belongs in the PR record, not the code body, unless the WHY is non-obvious from the implementation.

## What to NEVER do

- Never declare compliance, conformity or adherence to any regulatory framework, control objective or requirement on the basis of generated code alone. Regulatory overlay is an external cross-check, not an SbD-ToE conformance signal.
- Never invent identifiers shaped like SbD-ToE/AppSec Core/overlay IDs (e.g. `ACO-…`, `ACM-…`, `EXT-…`, `EP-…`, `CTRL-…`). If you need an identifier that is not in `citation_map`, the answer is to STOP and re-call the tool with a sharper ask.
- Never copy entity names that the rastreabilidade did not publish. If `g2_context.*` returns an entity without a `name`, refer to it strictly by its `entity_id`.
- Never bypass the scope gate by re-calling the tool with the same payload after a `needs_*` response.
- Never treat AI-generated code as the evidence of correctness; require human review and explicit tests.

## Mode-specific reminders

- **codegen**: produce code + tests + security_rationale; keep diffs focused on the activated surface; respect `risk_level` (do not propose L3 controls inside an L1 ask).
- **review**: enumerate findings per `changed_files`, each mapped to one or more `citation_map` IDs. If a finding has no ID coverage, mark it `"no normative ID covers this — flag for human review"`.
- **test-plan**: produce a checklist grouped by validated_id (requirement_id or control_id). Each test must state input → expected outcome → which `evidence_patterns[].id` it satisfies. Reuse `expected_artifact_type_ids` to name the artefact a reviewer inspects.

## Reading the response

- `activation_trace[]`: every item carries `source`, `produced`, `trigger`, `score`, `confidence`, `reason`. Use it to explain to the user WHY a slice was activated.
- `activated_scope`: the closed set of requirements / controls / slices / regulatory obligations.
- `g2_context`: AppSec Core v1 entities + relations + ranked, capped evidence patterns.
- `manual_grounding[]`: pointers into the SbD-ToE manual (chapter, file, commit). Cite these in `security_rationale` when the change directly references a manual section.
- `regulatory_overlay`: optional. Use only as a cross-check, never as a conformance claim.
- `citation_map`: closed world of valid IDs for this task.
- `completeness_report`: includes `m_recall` and `evidence_patterns_capped`. Flag low recall to the user.
- `llm_codegen_instructions`: the deterministic instructions the tool already validated for this task. Honour them verbatim.
- `security_rationale_template`: structure you must fill before declaring the change ready.

---

If anything in the response feels missing or contradicts what you would expect to ground the change, treat that as a `needs_clarification` signal and ask the user — do not improvise the missing piece.
