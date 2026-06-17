# Brief — Pontifex: release-prep `@shiftleftpt/sbd-toe-mcp@0.10.0`

**De:** Orchestrator · **Para:** Pontifex (MCP-serving) · **Data:** 2026-06-17
**Decisão do programme-lead:** publicar **minor `0.10.0`** (não patch — há tools novas + schema
novo) e **publicar ANTES** de atualizar o mini-site. O publish npm em si (auth) é do programme-lead;
o Pontifex prepara a release até ao ponto de "pronto a publicar".

## Porquê minor

Desde o `0.9.0` publicado entraram **7 tools novas** (`get_sbd_toe_chapter_implementation_checklist`,
`get_sbd_toe_operating_model`, `plan_sbd_toe_rollout`, `map_sbd_toe_regulatory_activation`,
`assess_sbd_toe_implementation`, `get_sbd_toe_verification_matrix`, `answer_sbd_toe_manual`) e o
**schema do `generate_sbd_toe_skill` mudou** (`role/format/flavour/risk_level` + resources
`sbd://toe/skill|subagent/{role}`), além de two-band `next`. Backward-compatible ⇒ minor.

## Tarefas de release-prep

1. **Reconciliar com o PR #34** (baseline-saneada + RF-S + protocolo + vista de implementação):
   confirmar que tudo o que vai em `0.10.0` está merged/incluído; se #34 ainda aberto, é o
   conteúdo desta release.
2. **Bump de versão → `0.10.0`** no `package.json` e onde o servidor reporta a sua versão.
3. **Pin do bundle**: garantir que o pacote publica o bundle `kg-v1-manual-v1.6.4-aligned-2026-06-15`
   (sha `caa8cfef…`, `consumer_contract_version` v1.6); o resource `sbd://toe/version` tem de
   refletir release_tag + sha + contract + servidor `0.10.0` corretos pós-publish.
4. **Decisão sobre o bug `get_threat_landscape`** (concern-routing base→cap.02): se o fix estiver
   pronto e smoke-validado, **incluir** em `0.10.0`; senão, **enviar `0.10.0` com a limitação
   documentada** e o fix em `0.10.1`. Recomendação do Orchestrator: não atrasar a release pelas
   7 tools novas — mas é a tua chamada técnica; sinaliza ao programme-lead a opção escolhida.
5. **Release notes / changelog** (`0.9.0 → 0.10.0`): tools novas; vista de implementação (4 faces);
   RF-S role-skills harnessed/skilled; two-band `next`; verification matrix (251 EPs 1ª-classe);
   overlay regulatório como tool; correções de grounding. Linguagem alinhada com a convenção pública.
6. **Smoke gate**: a suite de aceitação já existe — `DevelopmentGovernance/docs/mcp-surface-coverage-acceptance-suite.md`
   (secção "Functional acceptance", ~150 TCs `TC-…`). Correr um subconjunto-âncora por tool sobre
   o pacote candidato (≥1 happy-path + ≥1 never-silent + ≥1 negativo por tool); confirmar
   verification_matrix 226/251 0-gaps, assess not_reported≠pass, generate_skill harnessed/skilled,
   guardrail de review_scope, two-band presente. Reportar PASS/observações.
7. **Verificar AI Act**: confirmar se o bundle 06-15 já indexa o cross-check do AI Act (o mini-site
   atual diz que não, no `0.9.0`). O resultado alimenta a secção E do dispatch do Manual.
8. **Handoff ao programme-lead** para o `npm publish` (auth) + ao Manual (destrava o refresh do
   mini-site, brief em `sbd-ai-runtime/handover/em-curso/2026-06-17-orchestrator-manual-mcp-minisite-refresh.md`).

## Definição de pronto (release-prep)
- `0.10.0` no package + servidor reporta-o; `sbd://toe/version` correto pós-pin.
- Bundle 06-15 (sha caa8cfef, contract v1.6) empacotado.
- Decisão threat_landscape registada (incluído | diferido p/ 0.10.1) e sinalizada.
- Release notes escritas; smoke-âncora PASS reportado.
- Estado AI Act confirmado.
- Tudo pronto a `npm publish` (só falta a auth do programme-lead).

---

## ADOÇÃO + ATESTAÇÃO (Pontifex real — decisão do programme-lead 2026-06-17)

A release-prep acima foi **pré-executada por um sub-agente do Orchestrator** (acelerador), que
deixou na working-tree uma **PROPOSTA não-commitada** + dois ficheiros nas tuas pastas:
- `agentic/em-curso/2026-06-17-pontifex-release-0-10-0-prep-report.md` (relatório de prep)
- `agentic/2026-06-17-release-notes-0-10-0-DRAFT.md` (draft de release notes)

Ambos estão marcados como proveniência-sub-agente. **NÃO são uma atestação tua.** O programme-lead
decidiu que **és tu (Pontifex real) a fechar a camada durável e a atestar**.

> 🚧 **BLOQUEIO DE PROVENIÊNCIA (decidido 2026-06-17 — corrigir ANTES de publicar):** o
> `sbd://toe/version` mostra `manual.version: "0.1.0"` (placeholder) em contradição com o KG tag
> `manual-v1.6.4`. O **Codex** carimba a tag/release REAL do Manual na proveniência da bundle
> (brief `agentic/briefs/2026-06-17-orchestrator-to-codex-manual-tag-provenance.md`); depois tu
> **re-sincronizas o pin** (sha-verificado) e confirmas o `version`. **Só depois** segues os passos
> abaixo. A 0.10.0 NÃO publica com o placeholder.

Faz (após o desbloqueio de proveniência acima):

1. **Valida a proposta** — `git diff` da working-tree; confirma o bump `package.json`/`package-lock` → `0.10.0` e o pin `consumed-bundle.json` (sha caa8cfef, contract v1.6) intacto. Rejeita/corrige o que não subscreveres.
2. **Build/test** — `npm run check && npm run build && npm test` (o sub-agente não pôde correr — Bash negado). Reporta verde/vermelho.
3. **threat_landscape gate** — o fix está na tree+dist (commit `16411e4`); o servidor ligado era stale pré-fix. Após build, **reinicia** e corre `get_threat_landscape(L2, ["auth"])` → tem de devolver ameaças de domínio, NÃO `MT-021..038`. Confirma antes de afirmar "auth fixed" nas notas (fecha o item "Near — Wave 1" do teu roadmap).
4. **PR #34** — se for para entrar, consolida/merge (é o conteúdo desta release). Decisão do programme-lead.
5. **Release notes** — revê o draft, dobra no `CHANGELOG.md`.
6. **Atesta** — segue HANDOVER-v2: regista a atestação, move o trabalho de `em-curso` → `done` quando publicado.
7. **Deixa pronto a publicar** — o `npm publish @0.10.0` é a auth do programme-lead (último passo).

Respeita `PROGRAMME-PRESERVATION-PROTOCOL.md` + `FREEZE-REGISTRY.md`; nunca inventar sha/tag/DOI.
