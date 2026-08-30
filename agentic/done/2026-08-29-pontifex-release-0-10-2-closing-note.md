# Closing note — release 0.10.2 (linha estável) — 2026-08-29

**Outcome:** `@shiftleftpt/sbd-toe-mcp@0.10.2` publicado (`latest`), servindo o KG formal `v1.6.0` (Manual v1.7.0).

| Item | Valor |
|---|---|
| Tag | `v0.10.2` (anotada) → `31aa22af780d56f958b220258ffa82ca46f1d7c7` (squash de #47) |
| npm | version `0.10.2`, dist-tags `latest: 0.10.2` (`beta: 0.20.0-beta.2` inalterada), gitHead `31aa22af…`, 168 ficheiros, integrity `sha512-0S8Ay9803JsHQDnDEBJavEZbdH2knZxpxd7gzkDfZK6vZlqy9uibeSZKya1PgHcQBIZdBMyyRyvkz9QFcVB30A==` |
| GitHub Release | `v0.10.2` (não-prerelease): `sbd-toe-mcp-v0.10.2-bundle.{tar.gz,zip,sha256}`; run `Release` 33265635554 ✅ |
| Pin | KG `v1.6.0` @ `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d` (= `mcp-stable`), asset sha256 `baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`, contrato v1.11; Manual v1.7.0 `d5c2586ae2cd12ab2e31b65febb2e85ed20e1bce`; ontologia `ontology-v1.1-fair-baseline` |
| Verificação pós-publicação | instalação limpa de `0.10.2` → `sbd://toe/version` KG v1.6.0 / Manual v1.7.0; consult L3 256/27, `requirements_without_control_link` 0 |
| Linhagem do dia | #45 `bc8c918` (dev-build v1.6.7, REQ-AGN, gramática v1.10, gaps declarados) → #46 `947f38e` (dev-build v1.7.0, citações informativas, vitest 4) → #47 `31aa22a` (formal v1.6.0) |

**Briefs:** `agentic/briefs/2026-08-29-pontifex-to-orchestrator-req-agn-dev-build-pin-0-10-2-prep.md` · `…-kg-v1.7.0-repin-toolchain.md` · `…-release-0-10-2-formal-kg-v1.6.0.md`.
**Handoffs no hub:** release (`2026-08-29-pontifex-release-0-10-2-formal-kg-v1.6.0.md`) · Manual content-lag (`2026-08-29-pontifex-to-manual-minisite-content-lag-lifted.md`).

**Follow-ups (fora de Pontifex):** Manual — refresh do mini-site `020-assets/mcp/` (0.10.2 / v1.7.0 / AI Act indexado) e 25 IDs `REQ-NNN` ilustrativos → `EX-`; Codex — revisão das 49+5 arestas com drift; exclusão de prefixos `CWE-`/`SHA-` na captura de menções; Dependabot #40 (typescript 6), #38 (`yaml`), actions #29/#37/#44; linha beta `0.20.0-beta.3` re-pin `v1.6.0`.

**Correcção (2026-08-30, handover Manual v1.7.1, verificado ao vivo em 0.10.2):** o dist-tag `beta` era **`0.20.0-beta.3`** (não beta.2) à data; o overlay AI Act tem **661** mappings (não 651); o servidor expõe **3** prompts (`setup_sbd_toe_agent`, `ask_sbd_toe_manual`, `prepare_grounded_codegen`).
