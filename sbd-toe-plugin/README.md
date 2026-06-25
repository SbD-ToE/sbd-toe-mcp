# sbd-toe (Cowork / Claude Code plugin)

Distribution wrapper for the **standard** `@shiftleftpt/sbd-toe-mcp` MCP server.
This plugin does **not** change how the MCP server works — it only ships the same
`.mcp.json` you would otherwise add by hand (Settings → Developer), so any team
member gets the SbD-ToE tool surface with zero manual configuration.

- Same stdio MCP server, same JSON-RPC protocol, same 21 tools
  (`search_sbd_toe_manual`, `list_sbd_toe_chapters`, `generate_sbd_toe_skill`,
  `plan_sbd_toe_repo_governance`, `get_guide_by_role`, `prepare_sbd_toe_codegen_context`,
  `get_sbd_toe_verification_matrix`, `map_sbd_toe_regulatory_activation`, …).
- Removing the plugin returns to the exact prior state.

## Contents

```
sbd-toe-plugin/
├── .claude-plugin/
│   └── plugin.json         # plugin manifest (name, version, metadata)
├── .mcp.json               # MCP server definition (npx @shiftleftpt/sbd-toe-mcp@0.10.1)
└── skills/
    └── sbd-toe/
        └── SKILL.md        # thin bootstrap: routes SbD-ToE tasks through the MCP tools
```

The bootstrap skill carries **no** manual content. Grounded, citation-backed
content comes from the MCP tools at runtime (e.g. `generate_sbd_toe_skill`,
`search_sbd_toe_manual`, `prepare_sbd_toe_codegen_context`), keeping provenance
pinned to the upstream bundle. The skill is Claude-only; the MCP server is
client-agnostic.

## Version pin

`.mcp.json` pins `@0.10.1` for reproducibility. **0.10.1 must be published to
npm first** (it is the fix-forward patch that restores `dist/version-info.*` to
the tarball; `0.9.0`/`0.10.0` are broken on a clean install). Until then, repin
to the last known-good published version `@0.7.7` if you need it working
immediately:

```json
{ "mcpServers": { "sbd-toe": { "command": "npx",
  "args": ["-y", "@shiftleftpt/sbd-toe-mcp@0.7.7"] } } }
```

## Install

Plugins are installed from a marketplace. Add this repo as a marketplace source,
then install:

```
/plugin marketplace add SbD-ToE/sbd-toe-mcp
/plugin install sbd-toe
```

(Requires a `.claude-plugin/marketplace.json` at the marketplace root listing this
plugin — ask if you want it scaffolded.)
