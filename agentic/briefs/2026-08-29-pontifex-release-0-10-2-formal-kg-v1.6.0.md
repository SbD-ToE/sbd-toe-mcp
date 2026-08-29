# Brief: release 0.10.2 — pin formal KG `v1.6.0` (`mcp-stable`), fecho da linha estável

**Date:** 2026-08-29
**De:** Pontifex
**Para:** programme lead (merge do PR; registo) · Codex (ask 1 do handover `2026-08-29-codex-release-v1.6.0-mcp-stable.md` executado na linha estável) · Orchestrator (fecho) · Manual (content-lag do mini-site — handoff separado no hub)
**Natureza:** relatório de execução de release (autorizado pelo programme lead 2026-08-29: PR → merge pelo lead → tag anotada `v0.10.2` no squash → `release.yml` publica no npm `latest`)

## TL;DR

Re-pin `source: release` a partir de `v1.6.0` via `mcp-stable` (`sync-bundle --from-release`, digest do asset do GitHub Release verificado); conteúdo servido **idêntico** ao dev-build v1.7.0 verificado (diff de `data/` = só o bloco `release` do `run_manifest`). Smoke ✅, check ✅, 548/548 ✅. CHANGELOG 0.10.2 final, FREEZE-REGISTRY com a linha 0.10.2 e pins upstream exactos, disclosure actualizado.

## Identificadores (verificados)

| Item | Valor |
|---|---|
| KG release formal | `v1.6.0` → `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d`; `refs/heads/mcp-stable` → mesmo commit (`git ls-remote`) |
| Asset | `sbd-toe-knowledge-graph-bundle-v1.6.0.zip` (`SbD-ToE/sbd-toe-knowledge-graph`), sha256 **`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`** = sidecar `.sha256` = handover |
| Pin | `release_tag: v1.6.0`, `source: release`, `release_ref: SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`, contrato **v1.11**, `pinned_at: 2026-08-29`, Manual **v1.7.0** `d5c2586ae2cd…` (`SbD-ToE/sbd-toe-manual`), ontologia `ontology-v1.1-fair-baseline` |
| `run_manifest.release` | `{channel: stable, version: v1.6.0}` |
| Diff `data/` vs dev-build `737efe2` (HEAD #46) | **1 ficheiro**: `data/reports/run_manifest.json`, 2 linhas (`channel`/`version`) — resto byte-idêntico |

## Ponto 2 — smoke (servidor `dist/index.js` sobre stdio)

`sbd://toe/version` → 0.10.2 / KG v1.6.0 `baf5913b…` release / contrato v1.11 / Manual v1.7.0 · `consult` L3 **256/27**, `coverage_gaps.requirements_without_control_link = 0` · `resolve_entities` REQ-AGN-001…004 + OPS-015 → 5/5 · `EX-AUT-003` → 0 · `npm run check` ✅ · `npm test` 548/548 ✅.

## Ponto 3 — ficheiros

`consumed-bundle.json` · `data/reports/run_manifest.json` · `CHANGELOG.md` (0.10.2 final: pin formal + linhagem dos dois dev-builds) · `FREEZE-REGISTRY.md` (tag protegida `v0.10.2`, estado corrente, pins upstream exactos, change log) · `AI-USE-DISCLOSURE.md` («ten exposed tools» → «exposed tools»; nota de pin/digest do bundle servido) · este brief + em-curso.

## Pontos 4–5 (executados após o merge — ver update no em-curso)

Tag anotada `v0.10.2` no squash em `origin/master` → run `Release` → `npm view @shiftleftpt/sbd-toe-mcp version dist-tags gitHead` → handoff ao Manual para levantar o content-lag do mini-site (`020-assets/mcp/01-intro.md` admonition «Versão actual e content lag»: 0.10.0 / AI Act não indexado → 0.10.2 / Manual v1.7.0 / AI Act + ENISA-CSA indexados; `11-versionamento-roadmap.md` «0.10.0 — actual», «snapshot v1.6.4»).
