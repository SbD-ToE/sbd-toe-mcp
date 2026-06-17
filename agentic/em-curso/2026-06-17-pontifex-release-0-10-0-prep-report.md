# Release-prep report — `@shiftleftpt/sbd-toe-mcp@0.10.0`

> ⚠️ **PROVENIÊNCIA:** este relatório e as mudanças de working-tree associadas foram
> **pré-preparados por um sub-agente do Orchestrator** (não pelo Pontifex do framework) e
> constituem uma **PROPOSTA não-commitada**, não uma atestação HANDOVER-v2. O **Pontifex real**
> deve VALIDAR (check/build/test + restart-smoke), ADOTAR e ATESTAR antes de mover para `done`.
> Ver "ADOÇÃO + ATESTAÇÃO" no brief `agentic/briefs/2026-06-17-orchestrator-pontifex-release-0-10-0.md`.

**Pré-preparado por:** sub-agente do Orchestrator · **Para validação/atestação:** Pontifex · **Data:** 2026-06-17
**Estado:** working tree em PROPOSTA (não-commitada); falta validação do Pontifex + `npm publish` (auth do programme-lead).

---

## 1. Estado do repo / PR

- Ramo de trabalho: `feat/kg-tripartition-cycle-2026-06-10` (sincronizado com origin).
- HEAD: `16411e4 fix(threat-landscape): route concerns by threat domain, not requirement source-chapter` (15 jun 2026).
- **PR #34** ("Wave 1 serving-corrections (Pontifex) — green bucket") está **OPEN/draft**.
  - O seu conteúdo (review_scope path-table, response-shaping/inspect bounding, `list_chapters`
    applicability, decorative-params relabel, threat `associated_controls` passthrough) **já está
    presente no ramo de trabalho** — o ramo `feat/kg-tripartition-cycle-2026-06-10` contém estes
    commits. O PR #34 É o conteúdo desta release (Wave 1 + implementation-view + verification
    matrix + RF-S + protocolo).
  - **Não foi feito merge** — é decisão do programme-lead. A release prepara-se a partir do ramo
    de trabalho como está. Recomendação: consolidar #34 + o ciclo KG no merge para `master` antes
    (ou em conjunto com) a tag de release.
- Sem ficheiros monitorizados por commitar pendentes além das alterações desta prep (ver §2).

## 2. Version bump (working-tree only — feito)

- `package.json`: `0.9.1` → **`0.10.0`**.
- `package-lock.json`: dois campos `version` (`0.9.1` → `0.10.0`).
- O servidor auto-reporta a versão **apenas** a partir de `package.json` (`src/index.ts`
  `loadPackageMetadata()` → `sbd://toe/version`). Não há outra fonte de versão (sem
  tag-driven nesta branch). Um único bump cobre o self-report.
- Nota: a versão publicada é `0.9.0`; o `0.9.1` no tree era um bump local nunca publicado.
  `0.10.0` é o salto correto independentemente disso.

## 3. Pin do bundle (confirmado — NÃO repointado)

`consumed-bundle.json`:
- `release_tag`: `kg-v1-manual-v1.6.4-aligned-2026-06-15` ✓
- `release_sha256`: `caa8cfef5318aaac324fcedce2490cd76ef450b724ec2579224d27afce74d6b2` ✓
- `consumer_contract_version`: `v1.6` ✓
- `source`: `dev-build` · Manual v0.1.0 @ `09b20f6f` · ontology `ontology-v1.1-fair-baseline`.

É exatamente o bundle 06-15 esperado. **Não houve repoint.** O `npm run check` corre
`verify-consumed-bundle.mjs` (digest-verified) — a correr no ambiente do programme-lead
antes do publish.

## 4. Decisão `get_threat_landscape` (base-concern routing)

**Achado factual (smoke live):**
- `concerns:["iac"]` → MT-132…148, todos `chapter_id: 08-iac-infraestrutura` → **CORRETO**.
- `concerns:["auth"]` → MT-021…038, todos `chapter_id: 02-requisitos-seguranca` (meta-threats
  de processo de requisitos) → **bug reproduzido** (comportamento PRÉ-fix).

**Reconciliação:** o fix existe no tree e está testado:
- Commit `16411e4` (15 jun 17:19) adiciona `CONCERN_TO_DOMAIN_CHAPTER` + routing pelos
  `chapter_ids` dos controlos resolvidos, e remove a ch02 exceto para a concern `requirements`.
- `src/tools/get-threat-landscape.test.ts` assere explicitamente que para `concerns:["auth"]`
  o resultado **inclui** o domain threat (ch04, onde vive o controlo) e **não inclui** o
  meta-threat de ch02 (MT-002). Suite 511 testes verde (per commit).
- O build `dist/` (15 jun 17:31) é mais recente que o source e **contém** `CONCERN_TO_DOMAIN_CHAPTER`.

**Por que o smoke live mostra o bug na mesma:** o servidor MCP conectado nesta sessão é um
**processo STALE** — tem as 7 tools novas e o `next` band (logo é pós-implementation-view),
mas corre um artefacto anterior ao build com o fix (não reiniciado após o rebuild das 17:31).
Não é um problema do tree.

**Recomendação técnica (Pontifex):** **INCLUIR o fix no 0.10.0** — está no tree, testado, e o
`prepack` (=`npm run build`) reconstrói o artefacto a partir do source atual, pelo que o pacote
npm publicado **leva o fix**. **Porém o smoke gate não conseguiu confirmar o fix num servidor a
correr** (o conectado é pré-fix). Gate antes de anunciar "auth corrigido":
1. Após o build, **reiniciar** o servidor e correr 1 smoke: `get_threat_landscape(L2, concerns:["auth"])`
   deve devolver threats de domínio (ch04/06/07/09/11), **não** MT-021…038.
2. Se esse smoke pós-restart passar → release notes podem mover "auth routing" de *known
   limitation* para *fixed*.
3. Se o programme-lead preferir não reiniciar/validar agora → publicar 0.10.0 com a limitação
   **documentada** (as release notes draft já a documentam) e fechar o live-confirm em 0.10.1.

Em qualquer caso **não atrasar a release pelas 7 tools novas** (alinhado com a orientação do
Orchestrator).

## 5. Release notes

Draft escrito em `agentic/2026-06-17-release-notes-0-10-0-DRAFT.md` (0.9.0 → 0.10.0):
7 tools novas (implementation view 4-faces + verification matrix + regulatory overlay +
answer_manual), RF-S harnessed/skilled, two-band `next` (RF-H), correções de grounding Wave 1,
e a known-limitation do threat_landscape. A dobrar no `CHANGELOG.md` no publish (não commitado).

## 6. Smoke gate (subset-âncora live, servidor conectado)

| Tool | Verdito | Observação |
|---|---|---|
| `get_sbd_toe_verification_matrix` L2 | **PASS** | 226/226 covered, 0 gaps, 0 unhinted; two-band next |
| `get_sbd_toe_verification_matrix` L3 | **PASS** | 251/251 covered, 0 gaps, 0 unhinted; EPs first-class |
| `assess_sbd_toe_implementation` | **PASS (por contrato)** | ARC-K01=85 in; KPIs sem valor → `not_reported` (≠ pass), invariante do motor; output grande (76 KB) cortou leitura linha-a-linha mas a invariante é declarada e testada |
| `generate_sbd_toe_skill` harnessed | **PASS** | frontmatter grant `mcp__sbd-toe__*`; slice = índice; "queries live" |
| `generate_sbd_toe_skill` skilled | **PASS** | sem MCP tools (só Read/Write/Edit/Grep/Glob/Bash); slice frozen com DoD inline — **difere** do harnessed |
| `map_sbd_toe_review_scope` (path não mapeado) | **PASS** | guardrail → ch01+ch02 via pattern explícito; two-band next |
| `map_sbd_toe_regulatory_activation` DORA | **PASS** | 14 chapters, 1430 mappings, coverage-preserving, two-band next |
| `plan_sbd_toe_rollout` | **PASS** | 8 fases, phase-ordered MVP, DAG declarado-deferido, two-band next |
| `get_sbd_toe_operating_model` | **PASS** | 30 secções, coverage-preserving, two-band next |
| `list_sbd_toe_chapters` | **PASS** | 15 chapters, applicability {L1,L2,L3}+minLevel presente, two-band next |
| `search_sbd_toe_manual` | **PASS** | retrieval grounded com citações [M…] + fonte/URL |
| `get_threat_landscape` iac | **PASS** | ch08 domain threats |
| `get_threat_landscape` auth | **FAIL (servidor stale)** | MT-021…038 ch02 — fix no tree não reflectido no processo live; ver §4 |
| `get_sbd_toe_chapter_implementation_checklist` | **n/v** | permission-denied nesta sessão (não falha de tool); partilha a projeção de operating_model/rollout que passaram |

Two-band `next` (semantic+structural) presente em **todas** as respostas observadas.

## 7. AI Act

**NÃO indexado** no bundle 06-15. Duas pesquisas distintas (`search_sbd_toe_manual("AI Act…")`)
devolvem cross-checks **RGPD/GDPR, NIS2, DORA** (ex. secção "10.9 Cruzamento com cross-check RGPD")
e conteúdo de **AI BOM / GenIA / self-hosted inference** — mas **nenhum cross-check normativo do
AI Act**. A afirmação atual do mini-site (AI Act NÃO indexado no 0.9.0) **mantém-se verdadeira**
no 0.10.0. Alimenta a secção E do dispatch do Manual: o refresh do mini-site deve manter "AI Act
não indexado".

## 8. Passo manual remanescente (programme-lead)

1. (Opcional, recomendado) Consolidar PR #34 + ciclo KG no merge.
2. `npm run check && npm run build && npm test` no ambiente com auth.
3. (Recomendado) Reiniciar o servidor e correr o smoke `get_threat_landscape(L2, auth)` →
   confirmar ch04/domain (gate do §4) antes de declarar "auth fixed".
4. **`npm publish`** de `@shiftleftpt/sbd-toe-mcp@0.10.0` (auth = programme-lead).
5. Tag de release + handoff ao Manual para o refresh do mini-site (AI Act = não indexado).

**Nada bloqueia a release** exceto a auth do `npm publish`. O único item a sinalizar é o
gate de confirmação do threat_landscape (§4): incluído no artefacto, por live-confirmar.

---

## ATESTAÇÃO — Pontifex real (2026-06-17)

Validei e **adotei** esta proposta. Resultados (Bash disponível, o sub-agente não tinha):

- **check / build / test:** ✅ `npm run check`, `npm run build`, **511 testes** verdes.
- **Gate de proveniência (RESOLVIDO):** o Codex re-emitiu `kg-v1-manual-v1.6.4-aligned-2026-06-17`
  (sha `4500c709…9919`). Re-pinei (sha-verificado) e corrigi a leitura: `sync-bundle.mjs` +
  `verify-consumed-bundle.mjs` + `version-info.ts` passam a ler `run_manifest.manual.tag/version`
  (Manual real **v1.6.4**), não o `version` top-level (compilador KG). `sbd://toe/version`
  mostra agora `manual { tag: v1.6.4, version: 1.6.4 }` — **placeholder 0.1.0 eliminado**.
  contract **v1.7** (subiu vs v1.6 do 06-15 — observação sinalizada ao Orchestrator).
- **Gate §4 threat_landscape (CONFIRMADO):** num **processo fresco** (não o servidor stale da
  sessão), `get_threat_landscape(L2, ["auth"])` → **144 ameaças de domínio, zero MT-021..038**.
  `auth` movido de *known-limitation* → **fixed** no CHANGELOG.
- **Release notes:** dobradas em `CHANGELOG.md` (## 0.10.0) com as correções (manual v1.6.4,
  contract v1.7, threat fixed). O DRAFT fica como histórico (superseded).
- **AI Act:** não indexado neste bundle — confirmado.

**Estado:** pronto a publicar. Falta só a **auth do `npm publish`** (programme-lead).
Mantenho em `em-curso/` até o publish; movo para `done/` quando publicado.
