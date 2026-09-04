---
ai_assisted: true
model: Claude Fable 5
date: 2026-08-30
purpose: documentation
reasoning: v0.19.3 — ronda 5 + adenda r6: invariante «next executável verbatim» (5 achados além do mínimo), forma real prepare→resolve, slots por índice, verdade da matrix (50 imposto + ~190 tk/id no hint), verdade do setup-é-prompt, activadores primeiro, record_type validado declarado, medição minimal-vs-escala reportada; v0.19.2 — micro: next calibrado com limites do destino (top-3 por peso + resto informativo; tecto ≤50 no hint da matrix; TC-F-32 round-trip) + START HERE nas descrições (select/setup); v0.19.1 — ronda 4: empty_selection_warning (zero=alarme), precedência explicit_concern>narrowing lexical no R2 (exposure/data_sensitivity continuam a alimentar o R2 — replay-guard re-validada), ênfase concerns-primeiro, entrada ⛳; v0.19.0 — ronda 3: basis declared/lexical (razão «sensível à redacção»), aviso de dominância top-level no select (prepare só lexical_share — dieta), next preserva prepare+consult, slots por índice, entry point; v0.18.1 — lote formal: re-pin release KG v1.11.0 (sha b7444094…, byte-igual; stamp v1.11.0; tectos intactos; TC-F-28 re-corrido); v0.18.0 — estação 3 do walkthrough: trace_sbd_toe_requirement_sources (directas vs compensadas, «cobertura não autoria», 19 sem-fonte declarados; verbatim da superfície pré-composta; pin dev-build 2026-09-03/v1.17); v0.17.0 — ronda 2: resolve valida chaves de filtro (valid_fields derivados; caso ACC-001/ACC-003), matrix requirement_ids[] com unknown declarado, next do select fecha requisito→prova; v0.16.1 — lote formal: re-pin release KG v1.10.0 (sha d8df472b…, byte-igual ao dev-build; stamp volta à tag v1.10.0, tectos intactos); v0.16.0 — re-pin dev-build 2026-09-02 (v1.16): artifacts 25/25 no guide (requisito→prova), control_names 95/95 no threat, artefact_totals 45/469 com semântica; stamp dev:<sha12> (comprimento estável, tectos intactos); v0.15.1 — fecho da reverificação Desktop: tool_prefix placeholder visível (decisão c), next sem id inválido, mode do consult verdadeiro, orgScope→erro com lista derivada, assess completo (rejeição {}, gaps_coverage, posture not_assessed), maxItems 5 por medição; v0.15.0 — auditoria Desktop: paginação universal (threat 25/233+size_estimate; plan default 5; slot/char no read_resource), banda excluded_by_level declarada (select+prepare; ultrathin dieta), index-compact derivado (estático morto), tool_prefix, fases canon-first+phase_warning, erros harmonizados com listas de válidos, consult projecção declarada+maxItems, aliases risk_level↔riskLevel; v0.14.0 — aplicabilidade GRADUADA (decisão do Author: capítulo nunca se exclui; exigência deriva dos assignments autorados + matriz cap. 01; listas binárias/minLevel mortos; module applicability.ts); v0.13.0 — serving batch: read_sbd_toe_resource (espelho de resources/read, catálogo derivado), stamp provenance.kg por resposta (tectos intactos), inspect com Pin servido (causa do n/d confirmada e corrigida), varrimento de contagens em prosa, release_ref normalizado, ensino Step 0 identidade; v0.12.0 — formal lote: KG v1.9.0 pinned (FIL/PRI/INT-009..012 served, contract v1.15), selection v1.8.0-aware, ceilings ratified+harmonized (9.200/8.450), npm latest; v0.11.0 — MP1 selection operation (select_sbd_toe_requirements + engine; named rules R1 principal-não-humano + R2 narrowing SES; D1 gate um-sinal-uma-superfície; D3 activators; D4; consult mode index; v2 token diet ported with stable-measured ceilings; R3 teaching layer: guide/skills/affordances ensinam select + duas bandas); Axis H 1/3/6 → 10/10; v0.10.4 — formal KG release v1.7.0 pinned (D2 close: 282 curated links, threats with associated_control_ids §1.21, contract v1.14) + G-b defining-chapters threat-routing fix (auth 77→95); v0.10.3 — formal KG release v1.6.1 pinned (curated requirement→control layer v2, Manual v1.7.1, contract v1.12) + #49 (acceptance regression runner with revised Axis-E criterion, query_entities filter fix, Algolia-era cache paths removed); v0.10.2 — formal KG release v1.6.0 pinned (source: release, sha256-verified; Manual v1.7.0; contract v1.11) after two same-day dev-build pins (v1.6.7 REQ-AGN, v1.7.0); requirement-id grammar v1.10 §1.18; declared gaps vs informative citations; toolchain hygiene (vitest 4). v0.10.1 and earlier entries below (v0.10.1 entry authored with Claude Opus 4.8).
review_status: pending-human-review
---

# Changelog

## 0.19.3 — 2026-09-04

**Patch** — ronda 5 do avaliador («next executável verbatim») + adenda ronda 6 (itens
6–7). O avaliador seguiu 3 next à letra e só 1 funcionou. Bundle UNCHANGED (pin release
KG v1.11.0).

### Added — INVARIANTE DE SUITE: todo o next é executável verbatim

- `next-invariant.test.ts`: percorre os next de TODOS os builders e payloads/fixtures
  e valida cada sugestão contra o schema REAL do destino (tools/list do próprio
  servidor): tool existe, parâmetros existem, enums válidos, tectos anunciados têm
  verdade, URIs só via read_sbd_toe_resource. Next inválido PARTE a suite.
  **Apanhou além do mínimo conhecido**: `chapter=` onde o schema é `chapterId`
  (query_entities); `risk_level` onde é `riskLevel` (applicability, via regulatory);
  tecto «≤3» anunciado sobre schema sem máximo (concernsHint/regulatory);
  `record_type="ctrl_acore_alignment"` fora do enum real do resolve (row do trace →
  re-apontada ao próprio trace c/ include_chains=true); token `phase` num destino
  sem ele (rollout→checklist).

### Fixed — os 3 next do avaliador (mínimo conhecido)

- prepare→resolve com a forma REAL e ids copiáveis do citation_map
  (record_type="requirement", filters {requirement_id: {in: […]}}) — morre o «the
  cited ids»; codegen_instructions_ref.note ensina slots POR ÍNDICE (ficara para trás
  em 0.19.2) em forma compacta (dieta da secção rest, tocada pelos ids na row: nota
  encurtada + intent curto — tectos INALTERADOS); rows com URI nomeiam
  read_sbd_toe_resource.

### Fixed — verdade do limite da matrix

- O «≤50» de 0.19.2 citava o maxItems do TRACE — a matrix não tinha tecto (63 ids
  passavam). Agora: maxItems 50 no schema + IMPOSTO no handler (erro declarado) e o
  custo avisado ANTES de se pagar no hint do select (medição: ~190 tk/id; 50 ≈ 9,5k tk).

### Added — adenda ronda 6, item 6: record_type validado (declarado)

- resolve_entities valida record_type contra o enum (tratamento 0.17.0 dos filtros):
  desconhecido ⇒ resposta declarada com unknown_record_type + valid_record_types —
  morre o total:0 silencioso (caso: ctrl_acore_alignment).

### Changed — verdade do setup + activadores primeiro

- setup_sbd_toe_agent é um PROMPT MCP (4ª mordida do canal): guide/descrições dizem-no
  e dão a alternativa (agent-guide via read_sbd_toe_resource + activadores directos no
  select). Ensino: ACTIVADORES ESTRUTURADOS são a via primária (medição: 63 vs 7 da
  task sozinha); concerns REFORÇAM. Promover setup a tool: candidato futuro (lead).

### Medição — adenda ronda 6, item 7 (diagnóstico; remédio é decisão à parte)

- prepare detail=minimal vs escala da selecção (estável, medido):
  - task só (replay): selecção=16 | prepare minimal total≈4286 tk (activated_scope≈2040 tk) | status=ready_for_codegen
  - task+activadores (avaliador b19): selecção=88 | prepare minimal total≈9181 tk (activated_scope≈6915 tk) | status=ready_for_codegen
  - 3 concerns L3 (TC-F-32): selecção=53 | prepare minimal total≈6286 tk (activated_scope≈3238 tk) | status=ready_for_codegen
  - fixture baseline1-like: selecção=41 | prepare minimal total≈5524 tk (activated_scope≈2856 tk) | status=ready_for_codegen
- Conclusão na secção do relatório do ciclo; nenhum remédio implementado neste ciclo.

### Verificação

- Suite verde (invariante incluída; snapshots refrescados para a nova verdade);
  eval `2026-09-04-v0193`: **137 cenários, 98 PASS · 16 PART · 0 FAIL ·
  23 SKIP — gate E PASS** (sentinela + package_version); ouro **10/10**; TC-F-33
  (3 next à letra → funcionam; 63 ids rejeitados; record_type declarado); catálogo
  partilhado actualizado (commit lá é lane do Orchestrator).

## 0.19.2 — 2026-09-04

**Micro-patch** — dois residuais da re-verificação do avaliador. Bundle UNCHANGED
(pin release KG v1.11.0).

### Changed — next CALIBRADO com os limites do destino (princípio novo, todos os next)

- Nenhuma sugestão do `next` pode ser rejeitada pela tool que sugere. Caso concreto:
  o `empty_selection_warning` sugeria 5 concerns e o prepare rejeita >3 famílias —
  a sugestão passa a **top-3 por peso** (nº de requisitos arrumados nas categorias
  cobertas) com «mais candidatos: […]» informativo no intent; o aviso mantém a lista
  completa ordenada. Varrimento dos restantes next: hint da matrix declara o tecto
  do destino (≤50 ids) quando a página o excede; consult (≤5/maxItems, ensino ≤3) e
  restantes hints já conformes. TC-F-32 prova o princípio por round-trip executável
  (sugestão → select re-run → prepare sem decomposição).

### Changed — START HERE muda de canal (3ª mordida do canal instructions)

- O sinal de arranque vive agora nas DESCRIÇÕES: a tool `select` abre com
  «START HERE — …» (arranque: agent-guide → setup) e o prompt `setup` idem; as
  instructions mantêm o ⛳ (clientes que as ignoram deixam de perder o sinal).

### Verificação

- Suite completa verde; eval `2026-09-04-v0192`: **136 cenários, 97 PASS ·
  16 PART · 0 FAIL · 23 SKIP — gate E PASS** (sentinela + package_version);
  ouro **10/10**; TC-F-31 ajustado (≤3 no next) + TC-F-32 novo; catálogo partilhado
  actualizado (commit lá é lane do Orchestrator). Orçamentos intactos.

## 0.19.1 — 2026-09-04

**Patch** — ronda 4 do avaliador (medição B: 5 redacções, 0→43): o zero vira alarme;
declarado vence lexical. Bundle UNCHANGED (pin release KG v1.11.0).

### Fixed — `empty_selection_warning` (V2: o único caso sem aviso)

- Selecção VAZIA com candidatos elegíveis é ALARME, não resultado: aviso dedicado com
  `narrowed_categories` + `candidate_concerns` DERIVADOS (reverse do concernsMap sobre
  as categorias arrumadas); o share-warning cede ao alarme; `next[0]` = «re-corre com
  concerns explícitos» e o next NUNCA manda a lista vazia à verification_matrix.
  Antes→depois: 0 selected/114 narrowed sem aviso → alarme com candidatos.

### Fixed — precedência: EXPLÍCITO vence narrowing lexical (V4)

- R2 (narrowing SES) cede APENAS ao concern `auth` explícito do utilizador
  (`explicit_concern`) — nunca a activadores derivados (exposure/data_sensitivity),
  que continuam a alimentar o R2. V4 antes→depois: «Alterar o email da conta» com
  concerns=[auth] tinha SES em activated E narrowed×8 na MESMA resposta → agora SES
  ×8 seleccionado, contradição morta (invariante unit-testado). GUARDA re-validada
  — e a sentinela de gate apanhou ao vivo uma 1ª versão que tratava exposure como
  explícito (o replay-SES revivia): o SES espúrio do replay DualGauge (exposure=public,
  base lexical) CONTINUA a cair — ×8 narrowed, 0 seleccionados.

### Changed — ênfase concerns-primeiro + entrada inequívoca

- next/guide/descrição do select: «a task DESCOBRE; concerns declarados ESTABILIZAM».
  Instructions abrem com «⛳ START HERE — FIRST CALL, ALWAYS» (agent-guide → setup):
  um agente virgem não precisa de sorte.

### Verificação

- 694/694 (3 unit novos); eval `2026-09-04-v0191`: **135 cenários, 96 PASS ·
  16 PART · 0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10** (expectativas
  INTACTAS; GC-02 re-verificado após falso-PART de um artefacto de eval estagnado);
  TC-F-31 novo (V2/V4/replay/V1-V3; wordings = equivalentes construídos, DECLARADO);
  catálogo partilhado (commit lá é lane do Orchestrator). Orçamentos intactos.

## 0.19.0 — 2026-09-04

**Minor** — ronda 3 do avaliador: estabilidade da selecção à REDACÇÃO. Bundle
UNCHANGED (pin release KG v1.11.0, sha `b7444094…03df`).

### Added — `basis: declared | lexical` em todas as entradas e exclusões

- Cada entrada do `selection_trace` declara a estabilidade da origem: **declared**
  (concern explícito, regra nomeada, sinal de contexto, dado do bundle) vs **lexical**
  (casamento de task_terms — revogável por reescrever a frase). A razão do
  `narrowed_out` lexical di-lo textualmente: «exclusão SENSÍVEL À REDACÇÃO da tarefa
  (não é regra de domínio)». `excluded_by_level` = **declared** (regra de DADOS).

### Added — aviso de dominância lexical (limiar declarado: share > 0.5)

- No SELECT (top-level): `basis_summary` + `lexical_dominance_warning` com
  `candidate_concerns`; com aviso, o `next` sugere 1º re-correr com concerns
  EXPLÍCITOS — sai a matrix, NUNCA o par prepare+consult ensinado. Caso do avaliador
  antes→depois: «Endpoint de upload com sessão e token» = 57 selected vs «Receber
  ficheiros dos utilizadores autenticados» = 8 — a magra avisa (share 1.0, candidatos
  [files]); com `concerns` declarados → 42 selected, share 0, calado. No PREPARE,
  dieta por forma: só `selection.lexical_share` (o near-touch 9.232>9.200 do aviso
  completo foi resolvido por DIETA, nunca por tecto novo).

### Fixed — slots por índice + porta de entrada

- Slots do read_sbd_toe_resource são `{when, text}` sem id — endereço por ÍNDICE com
  catálogo REAL derivado (o «Slots válidos: .» morreu). ENTRY POINT sinalizado curto
  (instructions/guide/setup) sem reescrever a língua (política pendente do lead).

### Verificação

- 691/691; eval `2026-09-04-v0190`: **134 cenários, 95 PASS · 16 PART ·
  0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10** (oráculo INTACTO — basis aditivo);
  TC-F-29/30 novos, TC-F-13/27 preservados (runner + catálogo partilhado — commit lá
  é lane do Orchestrator). Orçamentos pós-dieta: std f2 9.128 ≤ 9.200 · min 8.402 ≤
  8.450 · ultrathin 4.833 ≤ 4.840.

## 0.18.1 — 2026-09-03

**Patch (F2, canalização)** — lote formal: re-pin `source: release` **KG v1.11.0**
(asset sha256 `b7444094…03df` verificado por digest; `mcp-stable` = `688863a` = tag;
byte-igual ao dev-build 2026-09-03 já servido — delta = só o carimbo release do
run_manifest). Contrato v1.17, Manual v1.8.0, ontologia v2.4.

- **Stamp verificado na transição**: `dev:e5c3581b46aa` → **`v1.11.0`** (regra
  0.16.0). Tectos intactos: std f2 9.123 ≤ 9.200 · min 8.396 ≤ 8.450 · ultrathin
  4.833 ≤ 4.840; snapshots regenerados (diff = só o stamp).
- **TC-F-28 re-corrido contra o pin formal**: PASS (FIL-002 direct ×3 + DEP-001
  compensado; meta 17/254/19).
- Registry: «v0.18.0 tag recorded (`b1dbc7e6`)» — boleia declarada.
- Verificação: 691/691; eval `2026-09-03-v0181`: **132 cenários, 93 PASS ·
  16 PART · 0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10**.

## 0.18.0 — 2026-09-03

**Minor** (tool nova, justificado) — walkthrough estação 3: a rastreabilidade
requisito→fonte SERVIDA. Pin novo `source: dev-build`
**kg-v1-manual-v1.8.0-aligned-2026-09-03** (KG master `c30c6c2`; sha256
`e5c3581b…9734` digest-verified; contrato **v1.17 §1.24** aditivo). Stamp
`dev:e5c3581b46aa` pela regra 0.16.0.

### Added — `trace_sbd_toe_requirement_sources` (estação 3)

- Por requisito, VERBATIM da superfície publicada
  (`data/publish/semantic/requirement_source_coverage.jsonl`, pré-composta pelo KG):
  fontes **DIRECTAS** (`direct.source_anchors` com proveniência file/line/marker
  «Fontes» — autoria do Manual) e cadeia **COMPENSADA** REQ→CTRL→ACO→fontes
  (tipo/confiança por salto; landing resolved counts; rótulo `coverage_compensated`).
  A distinção nunca se esbate — «cobertura, NÃO autoria» (nota epistémica da
  ontologia v2.4, servida no provenance). `related` não cobre (coverage_rule do
  bundle no meta). Os **19 sem-fonte-declarada** e ids desconhecidos vêm DECLARADOS.
  `include_chains=false` = dieta (contagens + ref). Paginada sobre os ids (G1).
  Exemplo vivo: FIL-002 → `direct` (3 anchors, `UNIT-V5.2.2`…); DEP-001 →
  `coverage_compensated` (1º salto exact@0.95 via CTRL-supply-chain…); resposta
  2 ids + fake ≈ **1.5k tokens**.
- Materialização: `bundle-files.json` ganha as 2 superfícies semantic (optional,
  since kg-2026-09-03) — `ctrl_acore_alignment.jsonl` (267: meta + 102 base + 164
  ACP) também segue no tarball; bundles antigos → erro DECLARADO na tool (nunca
  inventado). Guide: rota «Where is the SOURCE of this requirement?».

### Verificação

- 691/691; eval `2026-09-03-v0180`: **132 cenários, 93 PASS · 16 PART ·
  0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10**; TC-F-28 novo (DEP-001+FIL-002
  numa chamada; runner + catálogo partilhado — commit lá é lane do Orchestrator).
  Tectos do prepare INTACTOS (superfície opt-in; snapshots diff = só o stamp).

## 0.17.0 — 2026-09-02

**Minor** — 2ª ronda do avaliador: never-silent no resolve_entities + cadeia
requisito→prova na navegação (achados 2 e 3; o achado 1 tem desenho próprio pendente).
Bundle UNCHANGED (pin release KG v1.10.0, sha `d8df472b…204e`).

### Fixed — resolve_entities valida as chaves de filtro (a ÚLTIMA contradição do never-silent)

- Caso do lead reproduzido antes/depois: `record_type=requirement,
  filters={"id":{"in":["ACC-001","ACC-003"]}}` — ANTES total:0 silencioso; DEPOIS
  `unknown_filter_fields:["id"]` + `valid_fields` (12, incl. `requirement_id`)
  **derivados da união de chaves dos próprios registos** (26 record_types; nada
  hardcoded). Dot-notation: `applicable_levels.L2` válido (247, sem aviso);
  `applicable_level.L2` declarado inválido. Aviso no payload (a saída de emergência
  continua exploratória — nunca erro duro), nota marca que o total não reflecte
  campos desconhecidos.

### Added — get_sbd_toe_verification_matrix `requirement_ids[]` (requisito → prova)

- «Como provo ESTES?»: filtra a matriz por requisitos concretos, coerente com a
  paginação; pedidos sem EvidencePattern DECLARADOS em `unknown_requirement_ids`.
  O `next` do select aponta «provar os requisitos seleccionados» com os ids da
  selecção — o fecho da cadeia deixa de depender de inferência. Guide com a rota
  «How do I PROVE these requirements?».

### Verificação

- 691/691; eval `2026-09-02-v0170`: **131 cenários, 92 PASS · 16 PART ·
  0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10**; TC-F-26/27 novos (runner +
  catálogo partilhado — commit lá é lane do Orchestrator). Orçamentos intocados.

## 0.16.1 — 2026-09-02

**Patch (F2, canalização)** — lote formal: re-pin `source: release` **KG v1.10.0**
(asset sha256 `d8df472b…204e` verificado por digest; `mcp-stable` = `a3e4445` = tag;
conteúdo do grafo BYTE-IGUAL ao dev-build 2026-09-02 já servido — delta = só o carimbo
release do run_manifest). Contrato v1.16, Manual v1.8.0, ontologia v2.3.

- **Stamp verificado na transição**: com pin release, `provenance.kg` volta a estampar
  a tag (**`v1.10.0`**) pela regra 0.16.0 (`dev:<sha12>` era só para dev-builds). A tag
  curta NÃO toca tectos: std f2 9.123 ≤ 9.200 · min 8.396 ≤ 8.450 · ultrathin
  **4.833 ≤ 4.840**. Snapshots regenerados (diff = só o stamp, 8×1 linha).
- Registry: linha «v0.16.0 tag recorded (`3e32af19`)» — boleia declarada neste patch.
- Verificação: 691/691; eval `2026-09-02-v0161`: **129 cenários, 90 PASS ·
  16 PART · 0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10** (sem divergência).

## 0.16.0 — 2026-09-02

**Minor** — re-pin dev-build «dívida de dados» + exposição dos joins (ciclo Codex
autorizado pelo lead, verificado pelo Orchestrator).

### Changed — served bundle re-pinned (dev-build 2026-09-02, contract v1.16 §1.23 aditivo)

- Pin `source: dev-build` **kg-v1-manual-v1.8.0-aligned-2026-09-02** (KG master
  `6f73417`; snapshot sha256 `c832fd97…6a107`, VERIFICADO por digest). Substrato
  `manual-v1.8.0 + sbdtoe-ontology-v2.3`; 273/29 e 305 arestas inalterados.

### Added — a dívida de dados exposta nos payloads (antes → depois)

- **guide_by_role**: `artifacts` por assignment servidos — o elo requisito→prova que o
  auditor pediu. Dev L2 detail: **0/25 → 25/25** assignments com artefactos (ex.:
  `ficheiro_classificacao_aplicacao_yaml…`); payload 14.798 → 15.486 tk (medido,
  declarado; guide não tem tecto formal). Descrição da tool actualizada.
- **get_threat_landscape**: `associated_control_names` (233/233 no bundle) expostos —
  fatia auth95: **0 → 95/95** com nomes; `related_antipatterns` agora com dados (5
  não-vazios no bundle; 2 na fatia auth). auth95: 22.846 → 27.294 tk (limit 300);
  página default 25 ≈ 8.2k tk. Descrição alinhada ao grão real: promete ids+derivation
  **+ names** (a promessa `associated_controls_text` de v1.14 mantém-se — 233/233
  presentes neste bundle).
- **plan_repo_governance**: `artefact_totals` com SEMÂNTICA declarada do bundle —
  `{distinct_count: 45, chapter_relation_count: 469, count_semantics}` (o «469» deixa
  de circular sem qualificação; nota da tool actualizada; nunca recontado em código).

### Changed — forma do stamp `provenance.kg` (0.16.0)

- Releases estampam a tag (`v1.9.0`); **dev-builds estampam `dev:<sha12>`**
  (ex. `dev:c832fd978169`) — identidade honesta com comprimento ESTÁVEL: a tag longa
  de dev-build somava ~7 tk por resposta e tocava dois tectos por 1 token
  (rest f1 1.351>1.350; ultrathin f2 4.841>4.840). Com a forma curta: 1.345/4.836 —
  tectos INTACTOS, sem paragem nem tecto novo. Verificável contra `sbd://toe/version`
  (tag + sha completos).

### Verificação

- 691/691; eval `2026-09-02-v0160`: **129 cenários, 90 PASS · 16 PART · 0 FAIL — gate
  E PASS**; ouro **10/10**; TC-F-25 novo (25/25 artifacts; 95/95 names; totais 45/469
  c/ semântica) + TC-F-16/17 ajustados à regra do stamp (runner + doc §4.4). Snapshots
  regenerados (diff = só o stamp). Orçamentos: std f2 9.125 ≤ 9.200 · min 8.399 ≤
  8.450 · ultrathin 4.836 ≤ 4.840.

## 0.15.1 — 2026-09-02

**Patch** — fecho da reverificação Desktop (lead: «vale a pena então estas alterações»).
Bundle UNCHANGED (pin release KG v1.9.0). Nenhuma capacidade nova.

### Item-a-item (1–7, com a decisão tomada)

1. **tool_prefix default → decisão (c), placeholder visível**: sem parâmetro, o
   frontmatter `tools:` usa `<MCP_TOOL_PREFIX>…` e o corpo abre com a instrução de
   substituição (⚠ SUBSTITUI …). Justificação: (b) default proxied instalaria
   SILENCIOSAMENTE com tools erradas fora do Desktop; (a) erro quebraria o fluxo
   comum; o placeholder torna o esquecimento VISÍVEL — um subagente sem substituição
   instala-se sem tools de forma óbvia, nunca silenciosa. Com `tool_prefix`, comportamento
   de 0.15.0.
2. **next sem id inválido**: o brief com `found:false` deixa de sugerir tools com o id
   que a própria resposta invalidou (placeholder genérico).
3. **mode do consult conta a verdade**: o default 'full' devolve PROJECÇÕES
   (id/name/category/type — ver projection_note; corpos via resolve_entities); 'index'
   devolve só ids por categoria. As duas descrições dizem o mesmo.
4. **orgScope desconhecido → ERRO accionável** (-32602) com a amostra de secções
   válidas DERIVADA dos dados na própria mensagem (+ data.valid_section_titles) —
   o aviso-com-sucesso-vazio morreu.
5. **assess completo**: `kpi_values: {}` REJEITADO com erro instrutivo (metric_ids de
   amostra derivados do catálogo); `gaps_offset`/`gaps_limit` com `gaps_coverage`
   própria (o destaque 2-de-91 sem caminho morreu — walk 92/92 provado); posture
   distingue **below** (avaliado, abaixo) de **not_assessed** (nada avaliado; `at`
   quando o avaliado cumpre com not_reported declarado em totals).
6. **Descrição do offset do plan** corrigida (default real = 1ª página de 5).
7. **maxItems dos concerns re-avaliado POR MEDIÇÃO**: 1→2,0k · 3→3,6k · 5→4,3k ·
   8→6,6k tokens — o payload manda: **sobe para 5** (justificado; ≈metade do prepare
   std), recomendação de ensino continua ≤3 no next ("compostas → select; exploração
   ampla → lotes"). O servidor nunca cortou concerns (verificado) — sem corte
   silencioso em nenhum cenário.

### Notas de contrato (0.15.0 → consumidores; reafirmadas)

- `get_threat_landscape` é PAGINADO POR DEFAULT desde 0.15.0 (25/página;
  `coverage.hasMore` + `size_estimate` sempre) — quem consumia a lista inteira segue
  `coverage.nextOffset`.
- `concerns` do consult: schema declara o limite (agora **maxItems 5**, medido;
  recomendado ≤3).

### Verificação

- 691/691 testes (6 sondas substituem `{}` nos unitários do assess + 3 novos);
  eval `2026-09-02-v0151`: **128 cenários, 89 PASS · 16 PART · 0 FAIL ·
  23 SKIP — gate E PASS**; ouro **10/10**; TC-F-23/24 novos + TC-F-05/TC-F-21
  re-baselinados (runner + doc de governança, §4.4). Orçamentos intocados (prepare
  inalterado; snapshots idênticos).

## 0.15.0 — 2026-09-01

**Minor** — Desktop-audit cycle: P0 completo + paginação universal + banda por nível.
Autorização: programme lead («avança»); triagem calibrada pelo Orchestrator (spot-checks
confirmados). Bundle UNCHANGED (pin release KG v1.9.0). Tudo determinístico.

### Item-a-item (lane Pontifex 1–10)

1. **index-compact DERIVADO** do bundle no arranque (`buildDerivedIndexCompact`):
   demand_by_level + technologies (reverso da tabela de serving); o estático de Março
   com minLevel MORREU (ficheiro + 3 listas de empacotamento) — 5ª instância de
   conteúdo-em-código fechada. activatedBundles: hack «13 apenas L3» e «Sempre para
   L2+» já tinham morrido em 0.14.0; plan_repo_governance ch. 13 JÁ era igual em
   L1/L2 via requirement-ladder (verificado: 32 artefactos em ambos) — reportado.
2. **Paginação universal**: get_threat_landscape com limit/offset (default 25;
   coverage + size_estimate SEMPRE — L2 inteiro era ≈59k tokens, página default
   ≈7,1k); plan_repo_governance default paginado (5 capítulos; antes ≈13,7k);
   read_sbd_toe_resource ganha `slot` (codegen-instructions) e char_offset/char_limit
   com coverage; consult devolve size_estimate.
3. **Banda `excluded_by_level[]`** no select (grupos por categoria com razão + ids) e
   counts aditivos no completeness do prepare — o filtro de nível (selection.ts:210)
   deixa de ser silencioso. Exemplo L1: 15 categorias / 60 requisitos declarados.
   ultrathin DIETA os dois counts (tecto 4.840 vigiado: 4.833 medido — near-miss
   4.850 evitado por dieta, não por tecto novo). Ouro 10/10 mantido.
4. **generate_sbd_toe_skill `tool_prefix`** (default `mcp__sbd-toe__`) — o prefixo
   real depende do deployment do cliente.
5. **Fases**: alias implement→develop CANON-FIRST (se o vocabulário canónico tiver a
   fase, o alias não se aplica); fase desconhecida ⇒ `phase_warning` com knownPhases
   (nunca [] silencioso); exemplo 'implement' corrigido na descrição.
6. **Erros harmonizados**: brief desconhecido ⇒ found:false + erro + valid_chapter_ids
   (e aceita número '8', convenção unificada com o checklist); orgScope sem match ⇒
   warning declarado com sample_section_titles; slot inválido ⇒ lista de slots.
7. **consult**: projecção DECLARADA (projection_note + descrição: corpos completos via
   resolve_entities); concerns maxItems 3 no schema; enum harmonizado (agents no
   threat_landscape); checklist risk_level já era «informational» no schema.
8. **codegen-instructions**: `line_note` com a ressalva de linha (trace_sbd_toe_graph
   só na 0.20; nesta linha include_relations=true); remediação interna
   (checkout:backend) removida do texto servido (prompt + resolve_entities).
9. **skill/{role}**: L2 fixo DECLARADO na descrição (outro nível via
   generate_sbd_toe_skill).
10. **Naming**: aliases ADITIVOS risk_level↔riskLevel nos dois sentidos (shim no
    dispatch; nada renomeado) + convenção declarada no agent-guide.

**Opcional (assess gaps/per_kpi/kpi_values={})**: DEFERIDO para 0.15.1 — reportado,
não corrigido (orçamento da sessão).

### Verificação

- 689/689 testes; eval `2026-09-01-v0150`: **126 cenários, 87 PASS · 16 PART ·
  0 FAIL · 23 SKIP — gate E PASS**; ouro **10/10**; TC-F-18..22 novos + TC-D-10/
  TC-E-02/TC-C-14/TC-A-10/TC-A-11 re-baselinados (runner + doc §4.4). Orçamentos:
  std f2 9.123 ≤ 9.200 · min 8.396 ≤ 8.450 · ultrathin 4.833 ≤ 4.840 (dieta).

## 0.14.0 — 2026-09-01

**Minor** — served SEMANTICS change: applicability becomes **GRADUATED**. Author's
decision (programme lead, 2026-09-01, verbatim): «Sim: capítulo nunca se exclui por
nível; a exigência escala L1→L3 conforme a matriz do cap. 01 e a proporcionalidade
das user stories. A noção binária desaparece do serving.» Bundle pin UNCHANGED
(release KG v1.9.0, sha `11153c85…`).

### Changed — graduated chapter applicability (the binary lists die)

- `RISK_LEVEL_CHAPTERS` (resources) and `ACTIVE_CHAPTERS_BY_RISK` (structured-tools)
  are GONE, along with the `minLevel` theory, the "13 apenas L3" hack and the ch-06
  "Sempre para L2+" reason — the 4th content-in-code instance closed. New derivation
  module `src/serving/applicability.ts`: chapter set ← bundle_catalog (+ the DECLARED
  `00-fundamentos` fallback — foundational, no bundle entry; precedent: the KG
  base-set rule); demand ← aggregation of the AUTHORED assignment `proportionality`
  per chapter × level (obrigatório/recomendado/opcional; free-text counts as
  `specific`, never re-classified); anchor ← the chapter-01 canonical matrix
  (addon 05-matriz-controlos-por-risco).
- `map_sbd_toe_applicability`: `active`/`excluded` REPLACED by `chapters[]` (15,
  presence unconditional, per-chapter `demand`+`dominant`+roles/user_stories) +
  `semantics` + `canonical_anchor`; `conditional` (context/technologies overlay)
  unchanged; `projectRole` now yields a per-role `role_view` (US + authored
  proportionality) — coherent with `get_guide_by_role` (same assignments).
  Measured: ≈1.470 tokens (L1), ≈2.325 with role view.
- Resource `sbd://toe/chapter-applicability/{riskLevel}` and
  `setup_sbd_toe_agent` prompt: same graduated derivation; the "Excluded chapters"
  line dies ("No chapter is excluded").
- `list_sbd_toe_chapters`: riskLevel ANNOTATES, never filters — all chapters with
  `applicability {L1,L2,L3} = true` and derived `demand_by_level`; `minLevel` retired.
- The demand really scales in the data: mandatory assignments L1 76 → L2 234;
  cap. 06 at L1 = 10 obrigatórios / 3 recomendados / 3 opcionais (authored);
  cap. 13 at L1 present with light demand.

### Verification

- 689/689 tests (16 legacy binary tests re-baselined graduated); scenarios
  TC-A-06/07/12 + TC-E-10 re-baselined in the SAME change (runner + governance doc);
  `eval:acceptance` (record `2026-09-01-v0140-*`): 121 scenarios, **80/17/0 FAIL/23 —
  gate E PASS** (E now 16 PASS/1 PART — TC-E-10 upgraded to full PASS); golden cases
  **10/10** (selection untouched — would have been a STOP).

## 0.13.0 — 2026-09-01

**Minor** — serving batch: canalização + 1 capacidade. Bundle UNCHANGED: pin release
**KG v1.9.0** (sha256 `11153c85…`) intacto. Authorised by the programme lead
(2026-08-31/09-01, «sim confirmo»), incl. the new-tool-on-stable gate.

### Added — `read_sbd_toe_resource(uri)` (mirror of resources/read)

- For clients WITHOUT MCP resource support (real case: Claude Desktop): returns any
  server resource by URI, templated ones included (value in the URI, e.g.
  `sbd://toe/codegen-instructions/codegen`) — the `codegen_instructions_ref` of dieted
  prepare payloads becomes resolvable on ANY client, and `sbd://toe/version` readable
  as a tool. One shared materializer (`materializeResource`) now backs BOTH
  resources/read and the tool — no drift; the valid URI set DERIVES from the single
  `RESOURCE_CATALOG` (also the source of resources/list). Unknown URI ⇒ declared
  error listing the valid URIs (never-silent). Scenarios TC-F-16 in the same change
  (§4.4), mirrored to the governance doc.

### Added — per-response version stamp `provenance.kg`

- Every response provenance object carries the compact stamp `kg: <release_tag>` of
  the served pin (`v1.9.0`), via a cached `servedKgReleaseTag()` — 13 tools + the
  protocol envelope + prepare. Measured against the payload budgets: fixture totals
  +3–4 tokens (std f2 9.105 ≤ 9.200, min f2 8.379 ≤ 8.450, ultrathin f2 4.833 ≤
  4.840) — **no ceiling touched, no re-baseline needed**. Golden snapshots
  regenerated (diff = +1 provenance line each). Scenario TC-F-17.

### Changed — `inspect_sbd_toe_retrieval` presents the pin provenance

- New "Pin servido (consumed-bundle.json)" line: kg release_tag/source/sha256/
  contract + manual tag/commit + ontology tag. Root cause of the production
  `run_id/commit_sha=n/d` CONFIRMED with a correction to the hypothesis: the
  gateway reads the upstream CHECKOUT's run_manifest (dev-only, absent in
  production) — `data/reports/run_manifest.json` does ship in the tarball but that
  code path never read it. The checkout fields now fall back DECLARED ("ausente —
  identidade de produção no Pin servido"), never a bare "n/d". The
  "Substrate version: v2-draft" fossil is intentionally untouched (KG manifest
  lane).

### Changed — number sweep in served prose + cosmetics + teaching

- Data-governed counts no longer live in code prose: verification-matrix description
  "the 223 published patterns" (real: 273) → "the published patterns — totals
  declared per response"; ontology resource description drops "8 inference rules /
  4 resolution pipelines"; server instructions "15 chapters (00–14)" → "Chapters
  00–14" (range = identity, not a count).
- `consumed-bundle.json` `release_ref` owner normalized `Shiftleftpt` → `SbD-ToE`
  (cosmetic; sha unchanged) — AND the generator default in `scripts/sync-bundle.mjs`
  fixed so the typo cannot regress on the next pin.
- Teaching: server instructions + agent-guide "Session setup" gain **Step 0 —
  identify the server** (read `sbd://toe/version`, or the new tool on clients
  without resources); guide Resources table lists `sbd://toe/version`; routing rows
  for "what version is this?" and "client cannot read resources".

### Verification

- 689/689 tests; `eval:acceptance` (record `2026-09-01-*`): **121 scenarios, 98
  executed, 80 PASS · 18 PART · 0 FAIL · 23 SKIP — gate E PASS**; golden cases
  **10/10** (no divergence — would have been a STOP); **23/23 tools** exercised.

## 0.12.0 — 2026-08-31

**Minor** — the served catalogue gains **FIL/PRI/INT-009..012** and the selection
engine is v1.8.0-aware. Ships the v1.8.0 wave and the formal pin on top of the MP1 cycle (0.11.0 below).
*(Correction 2026-09-01: this intro previously claimed the v0.11.0 tag "will not be
created" — in fact v0.11.0 WAS tagged and published on 2026-08-31, fulfilling the
G-mp1a two-line gate; see FREEZE-REGISTRY.)*

### Changed — formal KG pin (lote v1.9.0; lead's "3 sims" 2026-08-31)

- Served bundle re-pinned `source: release` **KG v1.9.0** (asset sha256
  `11153c85d8cb16e022f2be2d999ba131d437275becbbe6dd6b5556915b71f069`, verified;
  `mcp-stable` = `93fe9fb1` = `v1.9.0^{commit}`): the formal, zero-delta
  formalization of the dev-build `kg-v1-manual-v1.8.0-aligned-2026-08-31` served
  since #61 — graph content byte-identical, delta only in `run_manifest.release`.
  Contract **v1.15**, Manual v1.8.0, ontology v2.3.
- Payload ceilings **RATIFIED and HARMONIZED across lines** (lead, "3 sims"):
  fixture 2 `standard` ≤ **9.200**, `minimal` ≤ **8.450** — gates fixed at exactly
  these values; no declared deviations remain on this line.
- Formal-pin re-run: suite 689/689; gate E PASS; golden cases **10/10 with zero
  divergence** vs the 2026-08-31 v1.8.0 run (case-by-case identical).

### (dev-build phase, 2026-08-31 — absorbed by this release)

Serving line pinned to the dev-build **`kg-v1-manual-v1.8.0-aligned-2026-08-31`**
(sha256 `ad0fc96c…f4df`, contract **v1.15**, Manual v1.8.0): **273 requirements / 29
categories** (+17: FIL 8, PRI 5, INT 4), 305 links, EP 273/273.

### Added — selection signals for the new catalogues (declared, Manual-anchored)

- `files` concern → FIL: task terms file/upload/uploading/attachment/photo + PT
  aliases ficheiro(s)/anexo(s)/fotografia(s); `privacy` concern → PRI: pii/personal
  data + PT dados pessoais/finalidade, and `data_sensitivity: personal|regulated`
  now also activates PRI.
- **R-image** (closes the DualGauge replay finding): "image"/"imagem" is a homonym —
  disambiguated by declared context: image+docker/registry/container → container sense
  (deployment/distribution → CNT via ch. 09); image+file/upload/photo → FIL; both →
  both; neither → historical sense. Proven by TC-F-14 (docker → CNT ×11 with 0 FIL;
  file → FIL ×8 with 0 CNT; GC-05 "push da imagem" unchanged).
- **`SES-008-por-tecnologia`** (Author's decision): the JWT/user-token signal selects
  SES-008 at ANY level, named in the `selection_trace` — closes the GC-08 paradox; the
  level filter still rules everything else (TC-F-15: JWT@L1 → SES-008 in;
  no JWT → out). The Axis-H runner carries a DECLARED levelGuard exemption for it —
  the oracle v1 is untouched (the closure annotation is the lead's, v1.1).

### Changed — golden re-run with declared re-baseline (oracle untouched)

- **Axis H stays 10 PASS / 0 / 0** (coverage 100%, strict precision 100%) over the
  273/29 catalogue, and the oracle's four registered gaps flip to **covered**:
  GC-01 → FIL-001..008 (upload/file signals); GC-06 → PRI-001..005 (data_sensitivity +
  personal-data signals); GC-08 → SES-008-por-tecnologia; GC-10 → INT-009..012
  (messaging: poison messages/DLQ/replay). The per-case reports carry the
  "transição lacuna → coberto" lines; the oracle file was never edited.
- Count re-baselines: 256→273 / 27→29 (req-agn suite), links 282→305 (TC-F-08:
  141 catalogue-rule + 148 recalculated + 16 curated).
- Payload re-baseline (fixture2 is a file-upload endpoint — FIL now correctly
  applies, +8 requirements + the ~+1 republished-bundle delta; citationIds 143→152):
  stable ceilings standard f2 8.900 → **9.200** (measured 9.102), minimal f2
  8.200 → **8.450** (8.375); sections rest-full 1.600 (1.560), activated_scope
  5.500/5.500/2.500 (5.396/5.396/2.423). Fixture1 unchanged (104 citations; 6.110 /
  5.463 / 3.685). Golden snapshots regenerated (diff = FIL additions + bundle
  provenance).

### Verification

- `npm run check` green (pin sha256-verified); **689/689** tests; `eval:acceptance`
  (record `2026-08-31-v180-*`): **119 scenarios, 96 executed, 78 PASS · 18 PART ·
  0 FAIL · 23 SKIP — gate E PASS**; Axis H **10/0/0**; 22/22 tools; TC-F-14/15 added
  (capability ⇒ scenario).

## 0.11.0 — 2026-08-31 (published: tag v0.11.0 = `102b8166`, npm 0.11.0 — correction 2026-09-01, the earlier "never tagged" note was stale)

**Minor** — the MP1 selection operation lands in the serving layer (new tool), closing the
four Axis-H defects (ciclo MP1, P2; gate G-mp1a). Served bundle unchanged: formal KG
`v1.7.0` (sha256 `29156b86…fb9a`, contract v1.14, Manual v1.7.1).

### Axis H — before / after (oracle v1 untouched)

| | 0.10.4 (baseline) | **0.11.0** |
|---|---|---|
| Verdicts | 1 PASS · 3 PART · 6 FAIL | **10 PASS · 0 PART · 0 FAIL** |
| prepare coverage (avg) | 41 % | **100 %** (strict precision 100 % — 0 must-NOT selected) |
| Negative case (GC-09) | PASS | PASS (`needs_clarification`, 0 requirements) |

P2 landed the engine at 6 PASS · 4 PART · 0 FAIL; P3 (lead's post-P2 rule decisions,
same day) closed the remaining four via NAMED, declared rules — final record
`docs/acceptance-runs/2026-08-31-p3-axis-h-selection-v0.11.0.md`. The oracle was never
edited and nothing was tuned to it: every change is a declared serving rule.

### Added — P3: named selection rules (post-P2 lead decisions, 2026-08-31)

- **R1 `R1:principal-nao-humano`** (GC-07): the `agents` concern also selects, as a
  named rule declared in each item's `selection_trace`, the non-human-principal set
  {ACC-002, AUT-006, ENC-006} ∪ {DEP-011, DEP-013, DEP-014} — the agent is a principal
  (ARC-015: least privilege for agents).
- **R2 `R2:narrowing-de-sinais-SES`** (GC-02): SES-* resolves by signal narrowing —
  without user-session/login/token signals in the task the SES category leaves to
  `narrowed_out` with a declared reason; with them (GC-01, GC-08) it stays. The
  loader's `concernsMap` (`auth → [AUT, ACC, SES]`) is untouched this cycle (data lane
  annotated for future loader work). Fixture effect: −8 citations each (SES-001..008),
  snapshots regenerated, `citationIds` 112→104 / 151→143.
- **Missing signals**: `deployment` also activates the base DST category (GC-03
  DST-006 — deploy only via validated pipeline); `mtls` carries cryptographic-material
  management → `secrets` (GC-10 CFG-006); `message queue` integration carries
  critical-event logging → `logging` (GC-10 LOG-001).
- **Scope gate: one signal = one surface.** The decomposition gate now counts
  `decompositionFamilies` — the slice families of each signal's PRIMARY concern —
  instead of all activated families: supporting concerns of the same signal
  (mtls→secrets, mensageria→logging) activate categories but are not new surfaces.
  `sliceFamilies` (grounding) is untouched; genuinely multi-surface asks still
  decompose (existing negatives all green).

### Added — `select_sbd_toe_requirements` (MP1, consultive L3, OSS)

- Single selection engine `src/serving/selection.ts`: eligibility from the PUBLISHED
  `requirement_selection_model` (baseline cap. 02 `type: base` by level ∪ domain chapters
  activated by context — changed_files via the review-scope path map, technologies/stack,
  concern-derived chapters ⊕ overlay `extend`; `replace` awaits ADR 0014), then
  deterministic narrowing into two DECLARED bands: `selected[]` (per-item
  `selection_trace`: source/trigger/score) and `narrowed_out[]` (grouped by category,
  with reason) — never silent. Paginated (G1). `prepare_sbd_toe_codegen_context` now
  consumes the engine (its `completeness_report.selection` declares
  eligible/selected/narrowed-out with an executable ref).
- Acceptance scenarios in the same change (factory rule): TC-F-11/12.

### Changed — scope gate (D1) + activators (D3) + lexicon role (D4)

- The "max 50 activated requirements" cap is GONE (a legitimate L2 task activates >50 by
  design). The gate now guards task scope — vague/multi-family asks still return
  `needs_clarification`/`needs_decomposition`, and a task with NO real signal (only the
  informational risk_level) is `needs_clarification` — and payload (diet + budgets).
- `exposure` and `data_sensitivity` stop being decorative: declared activators
  (internal/authenticated → auth+logging; public → +api/validation/architecture;
  personal/regulated → encryption+validation+logging; secrets → secrets), each with its
  own `activation_trace` source. `agents` heuristics (mandate/kill-switch/tool-call/
  autonomy) reach the stable line (beta parity); new audited PT/EN signals (mtls,
  mensageria/fila de mensagens, assinatura → integrity+encryption, imagem/image,
  spa/frontend, formulário de registo; terraform/ansible narrowed to iac).
- The concern lexicon is now ONE signal among seven — the reference-semantics composition
  is the engine (D4).

### Changed — teaching layer (R3, pre-release requirement, 2026-08-31)

- **`sbd://toe/agent-guide`** now teaches the selection operation: when to use
  `select_sbd_toe_requirements` vs `consult` vs `prepare` ("choosing between the three
  requirement surfaces"); the two-band semantics — `selected[]` is the recommendation,
  `narrowed_out[]` lists what was eligible and why it left, and *if you need something
  from there, call again with the missing signal*; `mode: "index"`; new rows in the
  question-type routing table and in "Interpreting tool output". No reference to the
  old max-50 scope-gate semantics anywhere in the teaching surface (scenario-guarded).
- **Skills/subagents** (`generate_sbd_toe_skill` + plugin SKILL.md): intent routing
  gains *"which requirements apply to this task?"* → `select`; the harnessed tool
  list ships the new tool; the non-harnessed path teaches the operation for connected
  clients. The historical s4 guard ("no variant mentions the codegen tool") was
  deliberately retired by R3 — the guard is now positive (variants teach selection).
- **`next[]` affordances**: `map_sbd_toe_applicability`, `consult_security_requirements`
  and `list_sbd_toe_chapters` now suggest `select_sbd_toe_requirements`; select already
  points back to `prepare` (codegen) and `consult` (detail).
- **TC-F-13** (capability ⇒ scenario): walks the taught path — reads the guide,
  selects for an API-keys task (SES narrowed with a teachable reason), re-calls with
  the session signal (SES ×8 recovered), asserts `next[]` suggests prepare+consult and
  that the old gate semantics is gone from the guide.
- Lexicon (Manual-anchored growth, per the cycle's anti-overfitting principle — never
  from an oracle case): PT aliases `sessão`/`sessões` → `session` (ch. 02 category SES).

### Changed — `consult_security_requirements`

- `mode: "index"` opt-in (G-mp1a decision 3, option c): per-category requirement index
  (ids + counts) with the same filters/totals; default mode byte-unchanged.
  Index-by-default stays flagged for a future major.

### Added — v2 token diet ported from the 0.20 beta line (byte-identical)

- `detail: full | standard | minimal | ultrathin` + `include_relations` on `prepare`,
  the `sbd://toe/codegen-instructions/{mode}` resource, golden snapshots, and the diet
  test suite (detail/minimal/ultrathin/caps-resource/reuse-hint/budget; the
  relations-ref suite stays beta-only — `relations_ref` names `trace_sbd_toe_graph`,
  which ships on the 0.20 line; on this line use `include_relations: true`, as the tool
  schema documents).
- **Stable payload ceilings fixed by measurement (P2)** — the MP1 selection summary adds
  ≈+50 tokens to `completeness_report`: totals `standard` fixture2 8.800 → **8.900**
  (measured 8.833), `minimal` 5.800 → **5.950** (5.850) and 8.100 → **8.200** (8.107);
  `rest` section budgets re-measured (980/985/1055). All other totals hold, including
  `standard` fixture1 ≤ 6.500. The beta re-ratifies its own ceilings when it absorbs P2.

### Verification

- `npm run check` green; **689/689** tests (engine + select + P3 rule suites; diet
  suite ported); full `eval:acceptance` (R3 record `2026-08-31-r3-*`): 117 scenarios,
  94 executed, **76 PASS · 18 PART · 0 FAIL · 23 SKIP — gate E PASS** (no regression);
  22/22 tools; Axis H re-run unchanged at **10 PASS / 0 / 0**.
- Stable payload ceilings hold with margin after R2 (measured P3): `standard` f2
  8.446 ≤ 8.900, `minimal` 5.463 ≤ 5.950 and 7.720 ≤ 8.200, `standard` f1 6.109 ≤ 6.500,
  ultrathin 3.684/4.581.

## 0.10.4 — 2026-08-30

**Patch** — formal KG release `v1.7.0` (D2 cycle close) + the G-b routing decision in the
serving layer. Additive on the tool surface (per-threat `associated_control_ids`,
`associated_controls_text`, `associated_control_ids_derivation`); no tool removed or reshaped.

Served bundle: **formal KG release `v1.7.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.7.0`, commit `894af32a85d6a50f648f10d8a643848e806e533e`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.7.0.zip`, sha256
**`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`**, fetched and
digest-verified against the release `.sha256`; `run_manifest.release = {stable, v1.7.0}`),
`consumer_contract_version` **v1.14** (§1.21), ontology `sbdtoe-ontology-v2.2`, **Manual
v1.7.1** @ `8e03454c`. Supersedes `v1.6.1` (0.10.3) and the dev-build v2.2 pin (#53).

### Changed — served knowledge (`v1.6.1` / dev-build v2.2 → `v1.7.0`)

- Curated requirement→control layer: 281 → **282 links** (GOV-013 gains its curated CAP
  secondary — Archon convergence 27/27; curated on surface 12 + 4). Requirements 256/27,
  EvidencePatterns 256/256, 20 controls unchanged.
- **Threats now carry structural control ids** (contract v1.14 §1.21, G-b decision 8):
  `associated_control_ids` (CTRL-* ids, chapter-grained derivation **declared per record**
  via `associated_control_ids_derivation`; 233/233 in this release) and
  `associated_controls_text` (the Manual's prose); `associated_controls` unchanged for
  compatibility. Served through `get_threat_landscape` — previously the surface carried
  only the prose field.

### Changed — threat routing (G-b decision 2, serving-layer fix)

- The **defining chapters** of the activated controls (`defining_chapter_ids`, published
  since contract v1.13) now count as in-scope in `get_threat_landscape`, and the ch.02
  suppression applies only to controls merely *catalogued* there: a control that DEFINES
  in ch.02 (C1 identity/auth, C2 data_protection, C3 dev tooling) brings the ch.02
  threats with it, with the control listed in `mitigated_by`. Post-fix scopes at L2:
  **auth 77 → 95** (+18 ch.02 catalogue threats), encryption 107, validation 72;
  logging (15) and iac unchanged — no ch.02-defining control. No-concern landscape
  unchanged (233).
- Acceptance criterion for TC-E-01/02 updated accordingly (both PASS: `mitigated_by` and
  `associated_control_ids` populated with resolving ids); TC-F-08 re-baselined to 282
  links / curated 12+4. Run record: `docs/acceptance-runs/2026-08-30-v0.10.4-acceptance.md`
  — 104 scenarios, 81 executed, **63 PASS · 18 PART · 0 FAIL · 23 SKIP, gate E PASS**.

## 0.10.3 — 2026-08-30

**Patch** — formal KG release `v1.6.1` (curated requirement→control layer v2) + the #49
serving/test changes. Additive on the tool surface (`filters` on `query_sbd_toe_entities`);
no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.1`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.1`, commit `e9fc54f312829c632ecd50e2306bfa356e9e457c`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.1.zip`, sha256
**`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.1}`), `consumer_contract_version`
**v1.12** (§1.19 curated layer v2), **Manual v1.7.1** @ `8e03454c` (mini-site aligned to
0.10.2; illustrative `REQ-NNN` → `EX-REQ-NNN`), ontology `ontology-v1.1-fair-baseline`.
Supersedes `v1.6.0` (0.10.2).

### Changed — served knowledge (`v1.6.0` → `v1.6.1`)

- **Curated requirement→control layer v2** (Archon opinion ratified 2026-08-30, applied by
  curated edit, no rebuild): `requirement_control_links` 263 → **265**, **0 requirements
  without a link**; 12 links removed / 14 added, each new link carrying an additive
  `curation {curator: archon-2026-08-29, rationale}` key (tolerated by the loader — served
  fields unchanged). Re-targets served: AUT-007/AUT-008 → identity control, AUT-010 →
  monitoring, CNT-003/005/006/009 → images, ENC-007 → secrets, GOV-009 → suppliers,
  REQ-001 → classification; INT-008 → suppliers (+ segmentation); ARC-013 + segmentation,
  ARC-001 + architecture. 10 EvidencePatterns follow (`maps_to_control_id`); overlay
  mappings 6382 → 6457; cross-layer referrals 7240 → 7315. Requirements 256/27 and
  EvidencePatterns 256/256 unchanged.
- Manual v1.7.1: content-only wave — the 25 illustrative `REQ-NNN` example ids became
  `EX-REQ-NNN` (never resolve, no citation note), and the mini-site `020-assets/mcp/`
  describes 0.10.2 as published (content-lag lifted).

### Acceptance regression (`npm run eval:acceptance`, this bundle)

- See `docs/acceptance-runs/2026-08-30-v0.10.3-acceptance.md`. Axis E criterion revised by
  the programme lead: the structural mitigation link is `mitigated_by` (must be populated,
  ids must resolve); the substrate's textual `associated_controls` is passed through and
  reported as PART, never as a serving FAIL. New TC-F-08 checks the curated layer v2 (265
  links, 0 gaps, the AUT re-targets, `curation` tolerated).

### Record corrections (Manual v1.7.1 handover, verified live on 0.10.2)

- AI Act overlay: **661** mappings (earlier handoffs said 651); the server exposes **3**
  prompts (`setup_sbd_toe_agent`, `ask_sbd_toe_manual`, `prepare_grounded_codegen`), not 2;
  the npm `beta` dist-tag is **0.20.0-beta.3** (not beta.2).

### Added — acceptance regression runner (merged in #49)

- **`npm run eval:acceptance`** (`scripts/run-acceptance-scenarios.mjs` + `scripts/acceptance/`):
  executes the **94 acceptance scenarios** of
  `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` (axes A–E) against the real
  stdio server on the pinned bundle, one verdict per scenario (PASS / PART / FAIL / SKIP with
  owner `mcp`·`graph`·`roadmap`), Axis E as the promotion gate (exit 1 on FAIL), and a
  **coverage** section (scenarios executed, tools exercised vs exposed, ACs covered, roles ×
  phases). **Axis F** (7 scenarios) covers the six 0.10.0 tools that post-date the June
  elicitation plus the G1 pagination gate. Run records live in `docs/acceptance-runs/`.
- First run on `0.10.2` / KG `v1.6.0`: 101 scenarios, 78 executed (23 SKIP: 21 commercial
  ACs + 2 needing a client LLM), **58 PASS · 18 PART · 2 FAIL**; **21/21 tools exercised**.
  The two FAILs (TC-E-01/02) are data-rooted: `associated_controls` on threats is empty for
  ch.12 and textual elsewhere in the bundle (routed to Codex); `mitigated_by` is populated
  structurally on every threat.

### Fixed — `query_sbd_toe_entities` filters (found by TC-A-13)

- `entityType` and `riskLevel` filters returned **0 for every query**: they matched the
  Algolia-era record fields `entity_type` / `risk_levels`, which no chunk of the current
  substrate carries. They now match what the substrate publishes — entity types via the
  chunk's entity mentions (`Requirement | UserStory | Metric | Threat`, aliases accepted) and
  the risk facet `filter_tags.risk_level` — over the full ranked retrieval, and the response
  declares `filters {applied, retrieval_pool, matched, pool_with_risk_facet, note}` (chunks
  without a risk facet are not returned — declared, never silent). `chapterId` accepts the
  bundle id or its numeric prefix. Tool schema documents the vocabulary.

### Removed — Algolia-era snapshot-cache paths (dead at runtime)

- `structured-tools.ts` (`list_chapters`, `query_entities`, `chapter_brief`,
  `map_applicability`) and `plan-repo-governance.ts` carried a `SnapshotCache` branch that
  the server never reached (runtime calls pass no cache). Removed, together with the ~25
  unit tests that only exercised those branches with `chapter_bundle` /
  `practice_assignment` / `risk_levels` fixtures; replaced by tests over the runtime bundle.
  Suite: 532 tests.

## 0.10.2 — 2026-08-29

**Patch** — served-bundle alignment + declared-gap serving. Additive on the tool
surface (new response fields, one new `concerns` value); no tool removed or reshaped.

Served bundle: **formal KG release `v1.6.0`** (GitHub Release
`SbD-ToE/sbd-toe-knowledge-graph@v1.6.0`, commit `aad4e962cd20b105cd0a4840a5dea6f7011dcd5d`
= `mcp-stable`; asset `sbd-toe-knowledge-graph-bundle-v1.6.0.zip`, sha256
**`baf5913b596fdeb17c77d9c3a1d9394738c4c9319a8bcf0ec03972ba5db1d93b`**, fetched and
digest-verified against the release `.sha256` by `sync-bundle --from-release`;
`run_manifest.release = {channel: stable, version: v1.6.0}`), `consumer_contract_version`
**v1.11** (§1.19), **Manual v1.7.0** @ `d5c2586a` (remote `SbD-ToE/sbd-toe-manual`), ontology
`ontology-v1.1-fair-baseline` (unchanged). `source: release` — supersedes the formal `v1.5.0`
pin of 0.10.0/0.10.1. Lineage on this line (same day, both dev-builds, merged in #45 / #46):
`kg-v1-manual-v1.6.7-aligned-2026-08-29` (`762ccaaf`, sha256 `a66c3245…5276`, contract v1.10)
→ `kg-v1-manual-v1.7.0-aligned-2026-08-29` (`737efe20`, sha256 `2c27f4eb…64fa`, contract v1.11);
`v1.6.0` is byte-identical to the latter in `data/publish` — the only difference in the
consumed files is the `release` block of `run_manifest.json`.

### Changed — served knowledge (dev-build 2026-08-29 v1.6.7 → v1.7.0, contract v1.11)

- **Manual v1.7.0**: **OPS-015** «Sinais contínuos de saúde e disponibilidade operacional»
  (L2/L3, chapter 12) → `requirements.json` 255 → **256** (27 categories); EvidencePatterns
  256 (coverage 256/256). Per level: L1 120, L2 231, L3 256.
- **Curated requirement→control layer** (`requirement_control_links` 242 → **263**,
  `--preserve-existing`): the 20 requirements previously without a control link (AGN ×4,
  ARC-014/015, DEP-011…014, DPL-010/011, OPS-011…014, GOV-013/014, THR-008, VAL-008) and
  OPS-015 are now linked — REQ-AGN-001…004 → `CTRL-governance-classificacao-e-governacao-por-risco-*`
  via the curated `domain_mapping.AGN: [governance, identity]` (programme-lead judgement,
  not Manual-derived). `coverage_gaps.requirements_without_control_link` is therefore **0**
  at every level — the declaration machinery stays (data-driven).
- **Legacy citations corrected upstream**: 0 unresolvable `REQ-[A-Z]{3}-NNN` mentions and
  0 `EX-` entries in `chunk_entity_mentions` → **0 declared legacy-citation gaps**. The 25
  illustrative `REQ-NNN` example mentions (20 ids, 8 example docs) and non-requirement
  tokens captured by the `<CAT>-NNN` shape (`CWE-`, `SHA-256`, …) are **informative, not
  gaps**: `query_sbd_toe_entities` / `resolve_entities` surface them as `citation_note` /
  `meta.citation_note` (`status: "informative"`) while keeping their normal path — never
  aliased, never silent.
- `00-fundamentos/macro-processos.md` (new, 82 chunks, role `addon`) is served in the
  **`guide`** and `consult` profiles (MP1–MP5 are not entities, by declaration).

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29 v1.6.7; superseded above)

### Changed — served knowledge (formal `v1.5.0` → dev-build 2026-08-29)

- **REQ-AGN-001…004 served** — the AI-agent / automation governance catalogue (versioned
  mandate, autonomy A0–A4, kill-switch, intent declaration; Manual
  `02-requisitos-seguranca/addon/09-governaca-automatismos.md`). `requirements.json`
  251 → **255**, categories 26 → **27** (`AGN`, chapter 02); EvidencePatterns 251 → **255**
  (coverage 255/255). Per level: L1 118 → 120, L2 226 → 230, L3 251 → 255. Closes the
  Pontifex side of `agentic/briefs/2026-08-02-orchestrator-to-pontifex-req-agn-surface-gap.md`.
- Collateral of the dev-build line (contract v1.9, 2026-06-18): the regulatory overlay now
  indexes **AI Act** and **ENISA-CSA** (`external_frameworks` 4 → 6; overlay mappings 6360;
  cross-layer referrals 7218). The 0.10.0 note "AI Act cross-check is not indexed" no
  longer holds.
- Legacy `REQ-<CAT>-NNN` citations of base requirements no longer resolve by substring
  accident to requirements with another meaning (contract §1.18) — declared instead, below.

### Added — requirement-id grammar (consumer contract v1.10 §1.18)

- `src/serving/requirement-id.ts` — the single serving-side source of the grammar
  `^(?:REQ-[A-Z]{3}-\d{3}|[A-Z]{3}-\d{3})$` (**fullmatch**; never search, never prefix
  normalisation). `category` = the segment before the number (`AGN`, never `REQ`).
  Audit: no site in this server assumed the old `^[A-Z]{3}-\d{3}$`; the loader now flags on
  stderr (never drops, never rewrites) any published id outside the grammar. Mandatory
  cases under test: `REQ-AGN-001` ✓, `AUT-003` ✓, `EX-AUT-003` ✗ (the Manual's illustrative
  `EX-` prefix — never resolves to `AUT-003`), `REQ-AUTH-001` ✗.
- `consult_security_requirements`: new `concerns` value **`agents`** → category `AGN`
  (consult only; `get_threat_landscape` has no domain chapter for it).

### Added — declared gaps (never silent; Codex handover 2026-08-29)

- **(a) Requirements without a control link.** `consult_security_requirements` returns
  `coverage_gaps.requirements_without_control_link` `{count, requirement_ids, note}` and a
  `REQUIREMENT_WITHOUT_CONTROL_LINK` rule-trace line. The 20 requirements with no
  `requirement_control_links` entry (AGN ×4, ARC-014/015, DEP-011…014, DPL-010/011,
  OPS-011…014, GOV-013/014, THR-008, VAL-008) are served with the absence declared — not
  omitted, no controls invented (link layer of 2026-04-07; refresh is a Codex decision).
- **(b) Legacy citations.** `query_sbd_toe_entities(query=<id>)` and
  `resolve_entities(requirement, {requirement_id})` answer a cited-but-unpublished
  requirement id with a **declared gap** (`match: "declared_gap"` / `meta.declared_gap`,
  with the citing chunk/document ids). The 20 legacy `REQ-<CAT>-NNN` citations (16 ids,
  6 Manual files) carry the serving phrase «citação legada não resolvível (finding
  editorial em curso)» — never «requisito inexistente», never a silent semantic fallback.
  The 21st (`REQ-AC-010`) is not present in this bundle's `chunk_entity_mentions`, so
  there is nothing to declare for it until the KG surfaces it.
- `assets/agent-guide.md`: requirement identifier convention (both forms, category rule,
  `EX-` illustrative prefix, legacy-citation rule), the `agents` concern, and
  interpretation rows for `coverage_gaps` / `declared_gap` / `citation_note`.

### Changed — toolchain hygiene (devDependencies only, no package impact)

- Dependabot alerts on the test toolchain: `vitest` 1.6.1 → **4.1.9**, `@vitest/coverage-v8`
  and `@vitest/ui` 1.6.1 → **4.1.9** (Dependabot #39/#41/#42), pulling `vite` 8.2.2 and
  `postcss` 8.5.26 through the tree; `esbuild` and `brace-expansion` (the other two alerts) are no
  longer in the dependency tree at all (vite 8 builds on rolldown; `test-exclude`/`minimatch` dropped).
  `npm audit`: 0 vulnerabilities. `npm test` / `npm run check` green; `npm pack --dry-run`
  file list identical before/after — toolchain hygiene, no impact on the published package.

### Governance

- No interim AGN gap declaration had been implemented in the served code (brief 02-08
  item 1); nothing to lift — the closure is the published data itself.
- Not a freeze event; `FREEZE-REGISTRY.md` unchanged. Pending upstream before a formal
  release: KG formal release (re-pin `source: release`) + `mcp-stable` move (Codex /
  programme lead); Manual correction of the legacy citations, then Codex recompile.

## 0.10.1 — 2026-06-25

**Patch** — packaging, distribution, and repository-metadata changes only. No
functional, API, or served-bundle changes; the MCP tool surface is identical to
0.10.0.

### Fixed

- **Broken npm tarball on clean install (`ERR_MODULE_NOT_FOUND`).** The `files`
  allowlist in `package.json` enumerated `dist/` outputs file-by-file and omitted
  `dist/version-info.js` (plus its `.d.ts` / `.js.map`), which `dist/index.js`
  imports. As a result `0.9.0` and `0.10.0` failed to start from a clean
  `npx -y @shiftleftpt/sbd-toe-mcp` pull (the file was only present in cached
  builds). Added the three `dist/version-info.*` entries to `files`; verified via
  `npm pack` that the tarball now contains them. `0.7.7` was unaffected and
  remained the last known-good published version.

### Changed

- Repository relocated to `github.com/SbD-ToE/sbd-toe-mcp` (was
  `Shiftleftpt/sbd-toe-mcp-poc`). Updated `repository`/`homepage`/`bugs` in
  `package.json`, the GitHub Releases link in `README.md`, and
  `repository-code`/`url` in `CITATION.cff`. The npm package name
  (`@shiftleftpt/sbd-toe-mcp`) is unchanged.

### Added

- **Distribution wrappers (zero-config install).** A Claude Code plugin
  (`sbd-toe-plugin/` + `.claude-plugin/marketplace.json`) and an OpenAI Codex CLI
  config example (`examples/codex-config.toml`). These wrap the standard,
  unchanged `@shiftleftpt/sbd-toe-mcp` server — no new server code, no change to
  the served bundle or tool surface.
- **`FREEZE-REGISTRY.md`** at the repo root, satisfying
  `PROGRAMME-PRESERVATION-PROTOCOL.md` §5 (the file was previously absent).
  AI-prepared skeleton, pending human verification; unverified tag→event mappings
  are marked `TODO — verify`, and no hashes/DOIs/tags were invented.

> Note: published `0.10.0` is immutable per `PROGRAMME-PRESERVATION-PROTOCOL.md`
> (Principle 1 / Rule 3); this is a fix-forward patch, not a republish of 0.10.0.

## 0.10.0 — 2026-06-17

**Minor** bump: 7 new tools + a changed `generate_sbd_toe_skill` schema + a `next`
advisory band retrofitted onto the legacy tools. Additive / backward-compatible on the
existing tools' core contract ⇒ minor.

Served bundle: **formal KG release `v1.5.0`** (GitHub Release
`Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`, sha256 `feaa0155…7294`,
`consumer_contract_version` v1.8, **Manual v1.6.4** @ `09b20f6f`, ontology
`ontology-v1.1-fair-baseline`).

### Added — Implementation view ("how do I run this" family)

- **`get_sbd_toe_chapter_implementation_checklist`** — retrieval-grounded canon/20
  "how to implement chapter NN" guidance; coverage-preserving, cites chunk ids.
- **`get_sbd_toe_operating_model`** — RACI / decision-rights / governance cadences /
  org-model from the rollout playbook; retrieval-grounded prose.
- **`plan_sbd_toe_rollout`** — phased rollout roadmap: the 8 canonical lifecycle phases
  mapped to manual chapters. Phase-ordered MVP; the dependency DAG is declared-deferred.
- **`assess_sbd_toe_implementation`** — stateless KPI self-report vs published per-level
  thresholds (`metrics.json`) → posture + gaps. An applicable KPI with no value is
  `not_reported`, never a pass; thresholds cited, never invented.

Together with `get_guide_by_role` these are the implementation view: what to do (role/DoD)
· how to implement (checklist) · who governs (operating model) · in what order (rollout)
· how compliant am I (assess).

### Added — Verification reference

- **`get_sbd_toe_verification_matrix`** — the EXPECTED side of verification: per
  requirement/control at a risk level, the validation method + expected evidence +
  EvidencePattern reference, cited per row. EvidencePatterns are first-class published
  entities — full coverage (L1 118, L2 226, L3 251 requirements covered; 0 gaps,
  0 unhinted). Coverage-preserving.

### Added — Regulatory lens

- **`map_sbd_toe_regulatory_activation`** — reverse-of-provenance lens: framework
  (DORA / NIS2 / CRA / RGPD) → which manual chapters it activates, grouped with mapping +
  obligation counts (coverage-preserving). DORA: 14 chapters, 1430 mappings.

### Added — Manual answering

- **`answer_sbd_toe_manual`** — retrieves grounded manual context and requests the final
  answer from the client's model via MCP sampling; falls back to formatted retrieval when
  the client lacks sampling support.

### Changed — Role-skill / sub-agent serving (RF-S)

- **`generate_sbd_toe_skill` schema extended**: `role`, `format` (`skill` | `subagent`),
  `flavour` (`harnessed` | `skilled`), `risk_level`, `phase`, `include_detail`.
  - **harnessed** sub-agent grants `mcp__sbd-toe__*` (queries live; embedded slice = index).
  - **skilled** sub-agent carries no MCP tools, embeds the frozen slice (DoD inline).
  - Coverage is declared (chapters / assignments / user stories / checklist items).
- New resources `sbd://toe/skill/{role}` and `sbd://toe/subagent/{role}`.

### Changed — Protocol envelope (`next` advisory band, RF-H)

- Tool responses carry a two-band **`next`** advisory band — ≤3 adjacent tools the caller
  likely needs next, each `kind: "semantic" | "structural"`, referencing only real
  tools/resources. Emitted by all new tools and retrofitted onto the legacy tools
  (`consult_security_requirements`, `get_threat_landscape`, `list_sbd_toe_chapters`,
  `map_sbd_toe_applicability`, `get_sbd_toe_chapter_brief`, `resolve_entities`,
  `plan_sbd_toe_repo_governance`, `map_sbd_toe_review_scope`, `generate_sbd_toe_skill`).
  Advisory only — never changes a tool's primary result shape.

### Fixed

- **`get_threat_landscape` base-concern routing** — base concerns
  (`auth` / `access` / `encryption` / `validation` / `session`) previously collapsed onto
  chapter 02 (their requirements' catalog home), surfacing the requirements-process
  meta-threats (`MT-021…038`) instead of the domain threats. Now routed by the concern's
  domain (`CONCERN_TO_DOMAIN_CHAPTER` + the resolved controls' chapters); chapter 02 is
  surfaced only for the explicit `requirements` concern. (`auth` → 144 domain threats,
  no `MT-021…038`.)
- `get_guide_by_role` now sharpens user stories by risk level via the assignment's
  proportionality (L1 ⊂ L3), and surfaces the level-specific obligation.
- `plan_sbd_toe_repo_governance` filters requirement-first (`applicable_levels`) instead
  of a hardcoded chapter table; control/artifact = floor.
- `map_sbd_toe_review_scope` path table extended beyond GitHub (containers/k8s/helm → 09,
  Terraform/Bicep → 08, Python deps → 05, CI → 07/10/11, `.env` → 06); unmapped paths
  fall to the foundation guardrail via an explicit pattern.
- `get_threat_landscape` passes through the substrate's `associated_controls`
  (previously hard-coded `[]`).
- `inspect_sbd_toe_retrieval` / response shaping: consumer-aware bounding, honours `topK`
  (≈17 MB → ≈50 KB at `topK=5`); no silent truncation.
- `list_sbd_toe_chapters` returns per-level `applicability {L1,L2,L3}` + `minLevel`.

### Provenance

- `sbd://toe/version` now exposes the served knowledge provenance: server version,
  **Manual `tag`/`version` (real — v1.6.4, read from `run_manifest.manual`, not the KG
  compiler version)**, KG `release_tag` + sha256 + `consumer_contract_version`, and
  ontology tag/commit — read live from the `consumed-bundle.json` pin, never invented.
- Pin: `consumed-bundle.json` → **formal release `v1.5.0`** (`source: release`,
  `release_ref: Shiftleftpt/sbd-toe-knowledge-graph@v1.5.0`), sha256
  `feaa0155b64d78fe529d805c6e17430fb3ce9fe1c5b5900eb6e267e2fa077294`, contract v1.8 —
  fetched + digest-verified from the GitHub Release (`sync-bundle --from-release`), not a
  local dev snapshot.

### Notes

- AI Act cross-check is **not** indexed in this bundle (RGPD / NIS2 / DORA / CRA are).

## 0.9.0 — 2026-05-21

### Added — KG / runtime surface

- Consumes the AppSec Core V1 runtime surface (`data/publish/runtime/v1/`): `slices.json`, `control_objectives.json`, `mechanisms.json`, `practices.json`, `artifacts.json`, `relations.jsonl`, `manual_rastreabilidade.jsonl`, `v1_manifest.json`.
- Consumes the regulatory overlay surface (`data/publish/overlay/`): `external_frameworks.json`, `external_obligations.json`, `overlay_playbooks.json`, `overlay_mappings.jsonl`, `framework_overlay_index.json`.
- Pinned KG state: `master` @ `5c02010358d4afa5fc0b4aae5a026d5da25aa796` (baseline tag `kg-v1-cycle-b-manual-ref-2026-05-14`).
- `checkout-backend` extended to copy declared overlay artefacts (filter via upstream `publication_manifest.json`), expose `runtime/v1` and `overlay` status in `BackendCheckout`, and run a post-copy `sanitizePrivateAbsolutePaths` pass over the published runtime/indexes/overlay text artefacts.

### Added — Deterministic loaders

- `src/tools/g2-runtime-loader.ts`: caches the AppSec Core v1 surface with consistency checks against `v1_manifest.json` (entity counts, relation counts, file sha256) and exposes `getV1EntityDisplayName(entityId)` that returns `undefined` when `manual_rastreabilidade.jsonl` did not publish a name (no name invention).
- `src/tools/regulatory-overlay-loader.ts`: caches frameworks/obligations/mappings/playbooks with `frameworksByShortCode` lookup (case-insensitive). Returns `status: "absent"` when the overlay is not published, `OverlayAssetMissingError` when partially present.
- Both loaders tolerate legitimate upstream patterns: nullable `subject_type`/`object_type` for `objective_*` relations and empty `obligation_id` for `playbook_*` mapping types.

### Added — MCP tool surface

- New tool **`prepare_sbd_toe_codegen_context`** — prepares deterministic, bite-sized grounded context for a downstream LLM to generate, review or test-plan code. **Does not generate code and does not edit files.** Returns one of four statuses: `ready_for_codegen` | `needs_clarification` | `needs_decomposition` | `unsupported_scope`. On `ready_for_codegen` the response carries `activation_trace`, `activated_scope`, `g2_context`, `manual_grounding`, `regulatory_overlay`, `citation_map`, `completeness_report`, `llm_codegen_instructions` and `security_rationale_template`.
- `resolve_entities` extended with **10 new record types**: `appsec_slice`, `control_objective`, `mechanism`, `appsec_practice`, `appsec_artifact`, `appsec_relation` (runtime v1) and `regulatory_framework`, `regulatory_obligation`, `regulatory_mapping`, `regulatory_playbook` (overlay). Per-source provenance: runtime v0 → `data/publish/runtime/*.json`; runtime v1 → `data/publish/runtime/v1/*`; overlay → `data/publish/overlay/*` (or `... (absent)` when not published — never throws for overlay).

### Added — Semantic disambiguation (WP6)

- Activation engine carries deterministic per-entry `score` in `[0,1]` and exposes the following sources in `activation_trace`: `explicit_concern` (1.0), `task_term` (0.8), `compound_term` (0.7), `alias_expansion` (0.6 via `expandQueryWithAliases`), `intent_keyword` (0.5 via whole-word matcher; the gateway substring matcher is intentionally NOT reused for codegen), `changed_file` (0.5), `risk_level` (1.0).
- Compound phrases cover canonical multi-domain asks: `endpoint seguro`/`secure endpoint`, `segredo hardcoded`/`hardcoded secret`, `pipeline release`/`release pipeline`, `trust boundary`, `service to service`, etc.
- Evidence patterns are ranked by deterministic relevance (direct control match = 1.0, active requirement = 0.7, derived control = 0.5) and capped at 25 patterns to keep the LLM context manageable. Capped patterns appear in `debug.rejected_candidates` when `debug=true`.

### Added — Agent guidance

- New MCP resource `sbd://toe/grounded-codegen-guide` exposing the canonical agent guide at `prompts/sbd-toe-grounded-codegen.md`.
- New MCP prompt `prepare_grounded_codegen` that bundles the guide with a user task and instructs the agent to call `prepare_sbd_toe_codegen_context` before producing code. The guide enforces: cite `citation_map` IDs, fill `security_rationale_template` (decisions/validations/expected_evidence/residual_risk), distinguish code/tests/evidence, never declare regulatory compliance, never invent identifiers, never treat AI-generated code as evidence, route `needs_clarification`/`needs_decomposition`/`unsupported_scope` to user dialog instead of silent guessing.

### Hardened — Release artefact hygiene

- `npm run check:npm-package` now scans every published text artefact under `data/publish/**` and `data/reports/**` for absolute build-machine paths (`/Users/`, `/home/`, `/Volumes/`). Banned prefixes now include `data/upstream/` and `data/publish/overlay/p2v2_round_1/`.
- `package-release-lib.mjs` runs a recursive `scanBundleForPrivatePaths` over the entire release bundle (with an allowlist for placeholder strings such as `<absolute-path-to-repo>` and `<private>`). The release script aborts before tar/zip if leaks are detected.
- `shouldExcludeFromBundle` filters `.DS_Store`, `Thumbs.db`, `._*`, `.AppleDouble`, `.LSOverride` from the release tarball.
- Pre-existing leak fixed: `docs/MCP-QUALITATIVE-EVAL-PLAN.md` now references `<absolute-path-to-repo>/dist/index.js` instead of the author's local path.

### Notes

- This is the MVP G2 release. The full Paper 5 evaluation programme is out of scope.
- The tool's semantic activation is deterministic at WP6 (lexicon + alias expansion + whole-word intents). Probabilistic / learned scoring is not part of this release.
- The shipped npm package is ~4.19 MB (runtime/v1 ~1.3 MB, overlay ~4.6 MB raw, compressed in tarball).

## 0.8.0 — earlier

See git history (`git log v0.7.x..v0.8.0`).
