# Acceptance scenario runs

Executable form of `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md`
(94 scenarios, 5 axes: A tool coverage · B by role · C by surface/AC · D negatives &
invariants · E regression gate) plus **Axis F** (7 scenarios added 2026-08-29 for the six
0.10.0 tools that post-date the June elicitation, and the cross-tool pagination gate G1).

```bash
npm run build
npm run eval:acceptance                 # all axes → docs/acceptance-runs/<date>-v<version>-acceptance.{md,json}
node scripts/run-acceptance-scenarios.mjs --only TC-E   # one axis / prefix
```

The runner (`scripts/run-acceptance-scenarios.mjs` + `scripts/acceptance/`) speaks MCP over
stdio to `dist/index.js` — the real server, the pinned bundle — and emits one verdict per
scenario: **PASS** (meets the verdict criteria) · **PART** (partial, or a documented
`[limite]`/`[dados]` gap confirmed as still present) · **FAIL** (contradicts the criteria) ·
**SKIP** (not executable here: commercial/stateful surface, or needs a client LLM). FAIL/PART
carry an owner (`mcp` serving · `graph` bundle data · `roadmap`). Exit code 1 when any
Axis-E scenario fails (the promotion gate). The report's **Coverage** section states what
the run touched: scenarios executed, tools exercised vs exposed, acceptance cases covered,
roles × phases.

Verdicts test behaviour, not exact strings (the doc's legend); when a scenario's premise no
longer matches the substrate the note says so rather than forcing a PASS.

Run records are committed here as the regression baseline of each release line.
