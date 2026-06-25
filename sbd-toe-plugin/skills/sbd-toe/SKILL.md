---
name: sbd-toe
description: >-
  Bootstrap/activation skill for Security-by-Design (SbD-ToE) and AppSec Core
  work. Use whenever a task involves the SbD-ToE manual, AppSec Core ontology,
  secure-by-design guidance, security requirements/controls grounding, security
  code generation or review, security test plans, regulatory/framework overlay
  mapping, role-based security guides, or repository security governance. This
  skill carries NO manual content itself — it instructs the agent to obtain
  grounded, citation-backed answers from the sbd-toe MCP tools instead of
  answering from memory.
---

# SbD-ToE — grounded activation

This is a thin bootstrap. It contains no SbD-ToE manual content on purpose: the
authoritative content is served, grounded and citation-backed, by the **sbd-toe
MCP server** against a SHA-256-pinned knowledge bundle. Your job is to route the
task through the MCP tools, not to paraphrase security guidance from memory.

## Rule

For any Security-by-Design / AppSec Core task, **call the MCP tools first** and
build the answer from their grounded, cited output. Do not invent control names,
chapter numbers, citations, provenance hashes, DOIs, or release tags — these come
only from the MCP responses.

## Routing

Pick the entry point that matches the task:

- **Question about the manual / a concept / a control** → `search_sbd_toe_manual`
  (grounded retrieval; returns cited chunk ids). Use `list_sbd_toe_chapters` to
  orient first if the chapter is unknown.
- **Generate code, review code, or produce a test plan** that must stay grounded
  → `prepare_sbd_toe_codegen_context` first. It returns one of
  `ready_for_codegen`, `needs_clarification`, `needs_decomposition`,
  `unsupported_scope`. **It does not generate code** — only after it returns
  `ready_for_codegen` do you write code, staying within the returned context.
- **Produce a reusable skill / playbook** for a chapter or topic →
  `generate_sbd_toe_skill` (emits a grounded, versioned skill — prefer this over
  hand-writing one).
- **Plan repository security governance** → `plan_sbd_toe_repo_governance`.
- **Role-specific guidance** (developer, architect, reviewer, etc.) →
  `get_guide_by_role`.

If the relevant tool is unavailable, say so and stop — do not substitute
ungrounded security advice.

## Scope note

This skill is Claude-specific (it ships inside the Claude plugin). The MCP server
itself is client-agnostic; in Codex/Cursor/Zed you call the same tools directly,
without this skill.
