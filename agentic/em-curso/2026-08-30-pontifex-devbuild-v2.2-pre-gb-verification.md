# Em curso — pin dev-build v2.2 + verificação pré-G-b (eval:acceptance re-baselined)

**Date:** 2026-08-30 · **Persona:** Pontifex · **Dispatcher:** programme lead + espelho Codex `2026-08-30-codex-s2-rerun-v2.2-scorecard-g-b.md` · **Sem release/tag/npm/mcp-stable** (dev-build; S3 após G-b)

- [x] Pin `kg-v1-manual-v1.7.1-aligned-2026-08-30-v2.2` (`e2b94a97`), `source: dev-build`, sha256 `08d87f2e08d22edcdbf44d603ec7b267eb676c119ae84f3c569b5aff31dbc628` verificado; contrato **v1.13**; Manual v1.7.1; `pinned_at 2026-08-30`; verificador ✅
- [x] Re-baseline: TC-F-08 → 281 links / curadas 12+3 na superfície / `catalogue_rule*` tolerado / spot-checks AUT-006/007/008 → C1, AUT-010 + INT-007 + LOG → monitoring; **TC-F-09** (`data_protection`: 1 controlo, 15 links, activo no consult) e **TC-F-10** (10 AUT → C1, nunca CAP/DEV) novos — propor ao documento de governança pela regra de manutenção
- [x] `eval:acceptance` → `docs/acceptance-runs/2026-08-30-devbuild-v2.2-v0.10.3-acceptance.{md,json}`: **104 cenários, 81 executados, 61 PASS / 20 PART / 0 FAIL / 23 SKIP, gate E PASS**; check ✅; suite 533/533
- [x] Desvio observado (informativo, pré-G-b): âmbito de `get_threat_landscape(L2, ["auth"])` cai 159 → **77 threats** (capítulos 8/9/11/12/14) — o routing deriva dos `chapter_ids` dos controlos resolvidos e o novo C1 (`identity-identidade-autenticacao-e-sessoes`) publica `chapter_ids` diferentes do controlo IDN anterior; sem concerns mantém 233. Owner: dados/ontologia (registar no G-b)
- [ ] PR → merge (lead); G-b é do lead; S3 (release formal + mcp-stable + re-pin) depois
