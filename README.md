# @shiftleftpt/sbd-toe-mcp

MCP server for the **SbD-ToE** (**Security by Design — Theory of Everything**) security manual — structured tools for Claude, GitHub Copilot, Cursor, Windsurf, Zed and any MCP-compatible client.

[![npm](https://img.shields.io/npm/v/@shiftleftpt%2fsbd-toe-mcp)](https://www.npmjs.com/package/@shiftleftpt/sbd-toe-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

---

## Quick Start

**Zero configuration required.** Works out-of-the-box with `npx`:

**Claude Code:**
```bash
claude mcp add sbd-toe -- npx -y @shiftleftpt/sbd-toe-mcp
```

**Claude Desktop / Cursor / Windsurf** — add to your MCP config:
```json
{
  "mcpServers": {
    "sbd-toe": {
      "command": "npx",
      "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
    }
  }
}
```

**VS Code + GitHub Copilot** — add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "sbdToe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@shiftleftpt/sbd-toe-mcp"]
    }
  }
}
```

For full installation instructions for all clients see [`docs/installation.md`](docs/installation.md).

**Requirements:** Node.js ≥ 20.9.0

---

## What it does

This MCP server gives any AI client structured access to the [SbD-ToE security manual](https://www.securitybydesign.dev/sbd-toe/sbd-manual/) — a 15-chapter (00–14) framework for Security by Design — Theory of Everything.

All data is bundled locally. No Algolia, no internet connection required at runtime, no API keys.

---

## Tools

| Tool | Description |
|---|---|
| `search_sbd_toe_manual` | Retrieval over the manual — returns grounded context with citations |
| `answer_sbd_toe_manual` | Retrieval + answer via MCP sampling (uses the user's model) |
| `inspect_sbd_toe_retrieval` | Debug tool — shows retrieval scores, selection and prompt |
| `list_sbd_toe_chapters` | Lists all 14 manual chapters with readable titles and risk levels |
| `query_sbd_toe_entities` | Queries structured entities (controls, requirements, patterns) |
| `get_sbd_toe_chapter_brief` | Returns a structured brief for a specific chapter |
| `map_sbd_toe_applicability` | Maps a project profile to applicable chapter bundles |
| `map_sbd_toe_review_scope` | Maps changed file paths to relevant SbD-ToE knowledge bundles |
| `plan_sbd_toe_repo_governance` | Produces an advisory governance plan for a repository |
| `consult_security_requirements` | Resolves requirements/controls/artifacts for an application context |
| `get_threat_landscape` | Returns canonical threats for an application context |
| `get_guide_by_role` | Returns practices/assignments/user stories per role and phase |
| `resolve_entities` | Low-level entity resolver over runtime v0 + AppSec Core v1 + regulatory overlay (per-source provenance) |
| `generate_sbd_toe_skill` | Generates the skill template payload for AI agents |
| `prepare_sbd_toe_codegen_context` | **New in 0.9.0.** Prepares deterministic grounded context for codegen / review / test-plan. Returns one of `ready_for_codegen`, `needs_clarification`, `needs_decomposition`, `unsupported_scope`. **Does not generate code.** See [Grounded codegen](#grounded-codegen-v090) below. |

### Resources

| Resource | Description |
|---|---|
| `sbd://toe/agent-guide` | Operational guide for AI agents (read first) |
| `sbd://toe/index-compact` | Compact chapter index (<5KB) — injectable into system prompts |
| `sbd://toe/chapter-applicability/{riskLevel}` | Chapter applicability by risk level |
| `sbd://toe/ontology` | Full SbD-ToE ontology YAML with domain mapping and inference rules |
| `sbd://toe/version` | Running MCP server name/version/description |
| `sbd://toe/grounded-codegen-guide` | **New in 0.9.0.** Agent-facing guide for using `prepare_sbd_toe_codegen_context` |

### Prompts

| Prompt | Description |
|---|---|
| `ask_sbd_toe_manual` | Grounded Q&A prompt — guides retrieval before answering |
| `setup_sbd_toe_agent` | Slash command to configure an AI agent with SbD-ToE context |
| `prepare_grounded_codegen` | **New in 0.9.0.** Bundles the grounded-codegen guide with a user task — instructs the agent to call `prepare_sbd_toe_codegen_context` before producing code |

---

## Grounded codegen (v0.9.0)

`prepare_sbd_toe_codegen_context` is the v0.9.0 entry point for code-generation, code-review and test-plan work that has to stay grounded in the SbD-ToE manual / AppSec Core v1 surface / regulatory overlay.

### What it does — and what it does NOT do

- **Does** assemble deterministic context: activation trace, activated scope (requirements / controls / slices / regulatory obligations), AppSec Core v1 entities and relations, evidence patterns ranked by relevance, manual rastreabilidade entries, regulatory overlay entries, citation map, completeness report, LLM codegen instructions, and a `security_rationale_template` for the agent to fill.
- **Does** apply an auditable scope gate before returning ready context (see below).
- **Does NOT** generate code, edit files, or call an LLM. The tool returns context only.
- **Does NOT** invent identifiers, slices, requirements, controls, obligations or evidence. Anything not in the `citation_map` did not surface in the deterministic resolvers.
- **Does NOT** declare regulatory compliance. Regulatory overlay is published as an external cross-check, never as a SbD-ToE conformance signal.

### Scope gate — four output states

| Status | When | What the agent should do |
|---|---|---|
| `ready_for_codegen` | Task is bite-size (one technical surface, one phase, 1–3 concerns, ≤3 slice families) | Fill `security_rationale_template`, cite IDs from `citation_map`, produce code + tests + expected evidence |
| `needs_clarification` | Task missing/too short, no concerns activatable, ambiguous | STOP. Echo `reasons[]` and `suggestions[]` to the user; ask for the missing input before re-calling |
| `needs_decomposition` | Vague pattern matched (e.g. "make secure"), >3 slice families, or >50 estimated v0 requirements | STOP. Propose 2–4 sub-tasks; let the user pick one; re-call for that sub-task |
| `unsupported_scope` | Runtime v1 missing locally, overlay requested but absent, regulatory framework unknown | STOP. Report the missing capability verbatim. Do NOT fabricate IDs to keep working |

### Semantic activation

Each `activation_trace` entry carries `source`, `produced`, `trigger`, `score` (deterministic, in `[0,1]`), `confidence` and `reason`. Sources include:

- `explicit_concern` (1.0)
- `task_term` (0.8)
- `compound_term` (0.7) — e.g. *"endpoint seguro"*, *"segredo hardcoded"*, *"release pipeline"*
- `alias_expansion` (0.6) — PT↔EN expansion (via the semantic gateway + codegen alias table)
- `intent_keyword` (0.5) — whole-word matcher; the semantic gateway's substring matcher is intentionally NOT reused for codegen activation
- `changed_file` (0.5) — path-based heuristics over `changed_files`
- `risk_level` (1.0) — informational, drives v0 requirement filtering

Evidence patterns are scored against the activated scope (direct control match = 1.0, active requirement = 0.7, derived control = 0.5) and capped at 25 to keep the LLM context manageable. Capped patterns surface in `debug.rejected_candidates` when `debug=true`.

### How to consume the response

See [`prompts/sbd-toe-grounded-codegen.md`](prompts/sbd-toe-grounded-codegen.md) (also exposed as the MCP resource `sbd://toe/grounded-codegen-guide`). The guide is the authoritative contract for agents — keep it open while wiring downstream LLM flows.

### Limitations

- This is the MVP G2 release. The full Paper 5 experimental programme is not in scope.
- The activation lexicon is deliberately small and auditable. Probabilistic/learned scoring is not part of v0.9.0.
- The shipped overlay represents the published regulatory cross-check, not a compliance attestation surface.

---

## Architecture

```
AI client (Claude / Copilot / Cursor / ...)
    ↓  MCP stdio
sbd-toe-mcp server
    ↓  local read
data/publish/   ← semantic snapshots bundled in the package
```

1. The user asks a question in their AI client.
2. The client calls a tool (e.g. `search_sbd_toe_manual`).
3. The server reads the local snapshots in `data/publish/`.
4. Retrieval combines documentary and structured records.
5. The server returns grounded context with citations and links.
6. The user's model answers based on that context.

---

## Distribution

**Primary channel: npm**

```bash
npx -y @shiftleftpt/sbd-toe-mcp
```

**Secondary channel: GitHub Releases** — self-contained bundle for environments without internet access or `npx`. Each release publishes:

- `sbd-toe-mcp-vX.Y.Z-bundle.tar.gz`
- `sbd-toe-mcp-vX.Y.Z-bundle.zip`
- `sbd-toe-mcp-vX.Y.Z-bundle.sha256`

### Installing from a GitHub Release bundle

For environments without npm/npx:

1. Download `sbd-toe-mcp-vX.Y.Z-bundle.zip` from [GitHub Releases](https://github.com/SbD-ToE/sbd-toe-mcp/releases).
2. Extract the archive.
3. Point your MCP client to the extracted `dist/index.js`:
   ```json
   {
     "command": "node",
     "args": ["/path/to/extracted/dist/index.js"]
   }
   ```
4. No `npm ci` or `npm run build` needed — the bundle is self-contained.

---

## Optional configuration

No environment variables are required. The following can be overridden:

| Variable | Default | Description |
|---|---|---|
| `DEBUG_MODE` | `false` | Enable debug metadata in responses |
| `MAX_CONTEXT_RECORDS` | `8` | Max records returned per query |
| `SITE_BASE_URL` | `https://www.securitybydesign.dev/` | Override base URL |
| `MANUAL_BASE_URL` | `https://www.securitybydesign.dev/sbd-toe/sbd-manual/` | Override manual URL |
| `CROSS_CHECK_BASE_URL` | `https://www.securitybydesign.dev/sbd-toe/cross-check-normativo/` | Override cross-check URL |
| `SBD_TOE_APP_ROOT` | auto (resolved from `dist/`) | Override app root path |

Copy `.env.example` to `.env` and adjust as needed.

---

## Relation to the SbD-ToE ecosystem

| Repository | Role |
|---|---|
| `SbD-ToE/sbd-toe-manual` | canonical editorial source of the manual |
| `SbD-ToE/sbd-toe-knowledge-graph` | builder/publisher of the compiled manual surface |
| `@shiftleftpt/sbd-toe-mcp` | MCP server — consumes snapshots, exposes tools |

This project **consumes** the published bundle of the compiled SbD-ToE manual. It does not re-index the manual, does not reconcile `AppSec Core` directly, does not rebuild semantics and does not replace the builder.

Maintainers who want to update the bundled snapshots from a local checkout of `sbd-toe-knowledge-graph`:

```bash
npm run checkout:backend
```

---

## Development

```bash
npm ci
npm run check
npm run build
npm run test
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution workflow.

---

## Security

See [`SECURITY.md`](SECURITY.md). Vulnerabilities must be reported privately by email, never via public issue.

---

## Licence

Split licensing:

- code and runtime: [`LICENSE`](LICENSE) (`Apache-2.0`)
- documentation and bundled snapshots: [`LICENSE-DATA`](LICENSE-DATA) (`CC BY-SA 4.0`)
- mapping and attribution note: [`LICENSE-NOTE.md`](LICENSE-NOTE.md)
