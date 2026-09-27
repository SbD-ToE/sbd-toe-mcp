---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-26"
---

# Auditoria dos docs do MCP no Manual face à 0.21.0 — inventário e lote de correcções à fonte PT

**Data:** 2026-09-26 · **Persona:** Pontifex · **Para:** Orchestrator (→ Manual Agent aplica; cc lead)
**Despacho:** `sbd-ai-runtime/handover/em-curso/2026-09-26-orchestrator-pontifex-despacho-auditoria-docs-mcp.md` (autorização do lead, só leitura).
**Âmbito:** os 18 ficheiros de `SbD-ToE-Manual/manuals_src/docs/sbd-toe/020-assets/mcp/` (os `_category_.json` não têm conteúdo). **Nada foi editado**: nem o Manual nem o MCP. Sem commits.

## 1. Referência e método

Cada achado foi verificado contra a **0.21.0 servida**, não contra memória: `master` @ `d603a83` (tag `v0.21.0` → `b54951a`, npm `next`), construído e sondado ao vivo — `tools/list`, `resources/list`, `prompts/list`, `sbd://toe/activation-vocabulary`, `sbd://toe/version`, chamadas reais às tools citadas nos docs, e o arranque do pacote publicado via `npx`. Onde um achado depende de um facto medido, a coluna «devia» diz «verificado».

Números da superfície servida hoje, para contexto (e é precisamente por mudarem que a classe 2 propõe tirá-los da prosa): **29 tools · 14 resources · 3 prompts · 24 concerns · 13 papéis · 8 fases canónicas · 274 requisitos · 29 categorias · 15 capítulos**. KG v1.12.0, Manual v1.14.0, contrato v1.25.

## 2. Resumo

| classe | achados | o que é |
|---|---:|---|
| **1 — agnóstico de versão** | 68 | errado seja qual for a versão: corrige-se no texto |
| **2 — preso a uma versão** | 23 | número, data ou contagem à mão: reescrever sem o número, apontando para `sbd://toe/version` / CHANGELOG |
| **3 — em falta** | 20 | capacidade da 0.21 que os docs não descrevem |
| **total** | **111** | prioridade A 64 · B 38 · C 9 |

**O que mais pesa na visibilidade (prioridade A, por impacto):**

1. **A porta de entrada não aparece.** `select_sbd_toe_requirements` — que as descrições das tools marcam «START HERE» — e o contrato declarativo (declaras o que leste; o `task` é registado, não interpretado; sem declaração → `needs_input`) não existem nos docs. O leitor é encaminhado para `consult` e para o prompt `setup_sbd_toe_agent`.
2. **Exemplos que falham tal como estão escritos.** O exemplo central do caso *Codegen grounded* devolve `unsupported_scope` (`GDPR` não é código reconhecido; `data_sensitivity: "credentials"` não existe). Parâmetros com nome errado: `search`/`inspect` usam `question`, não `query`; o brief usa `chapterId`; `resolve_entities` com `filters: {chapter}` devolve zero.
3. **A aplicabilidade graduada contradiz os docs.** «L2 desbloqueia 06 e 11», `chapter-applicability` com `excluded`, `min_level`, «capítulos excluídos» — tudo retirado; o recurso servido declara o contrário na sua `semantics`.
4. **`citation_map` e `evidence_patterns` morreram na 0.21** e aparecem em 6 ficheiros; o prepare mudou de forma (requisito fundido, três níveis, `adjacency`, tectos com lotes, `size_estimate`, notas por referência) e nada disso está descrito.
5. **Contradição interna sobre o AI Act** no caso de cross-check e na epistémica (indexado numa linha, «só no manual web» noutra).
6. **Repositórios mudaram** (`SbD-ToE/sbd-toe-mcp`, `SbD-ToE/sbd-toe-manual`) — 10 links em 4 ficheiros.
7. **O ficheiro 11 é quase todo classe 2**: a secção «Release actual» e o «Changelog resumo» envelhecem a cada release.

## 3. Achados transversais (repetem-se; tratá-los uma vez)

- **T1 — repositório:** `Shiftleftpt/sbd-toe-mcp-poc` → `SbD-ToE/sbd-toe-mcp`; `Shiftleftpt/SbD-ToE-Manual` → `SbD-ToE/sbd-toe-manual`. Em 01, 03, 10, 11.
- **T2 — versões na prosa:** `0.10.2`, `v1.7.0`, `v1.6.0`, `v1.11` em 01, 06, 07-index, 07-06, 08, 09, 10, 11.
- **T3 — `citation_map` → `citations`:** em 01, 05, 06, 07-index, 07-02, 07-07.
- **T4 — vocabulário enumerado à mão:** listas de concerns com 12 ou 13 valores (são 24); apontar para `sbd://toe/activation-vocabulary`.
- **T5 — aplicabilidade graduada:** «desbloqueia», «activos/condicionais/excluídos», `min_level` em 01, 02, 04, 05, 06, 07-04, 10.
- **T6 — AI Act:** indexado; retirar a excepção em 07-06 e 09.
- **T7 — `setup_sbd_toe_agent` tratado como chamada:** é um *prompt* MCP; clientes sem prompts (Claude Desktop) não o expõem. Continua válido, mas não deve ser o único arranque nem a única validação.

## 4. Inventário por ficheiro

Classe: **1** agnóstico · **2** preso a versão · **3** em falta. Prioridade: **A** visível e bloqueante · **B** importante · **C** cosmético ou opcional.


### `01-intro.md` — 13 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 18 | «cada `CTRL-*`, `REQ-*`, `THR-*` ou `ART-*`» | `THR-*` não existe: as ameaças são `MT-NNN`; requisitos `<CAT>-NNN` (e `REQ-AGN-NNN`). Proposta: «cada requisito, controlo, ameaça ou artefacto que o agente refere passa a ser verificável». | 1 | B |
| 23 | Repositório `Shiftleftpt/sbd-toe-mcp-poc` | `SbD-ToE/sbd-toe-mcp` (é o `repository.url` do `package.json` publicado). | 1 | A |
| 29-33 | Caixa «Versão actual»: `0.10.2`, manual `v1.7.0`, KG `v1.6.0`, contrato v1.11 | Sem números: «O servidor serve um *snapshot* datado do manual e do KG. A versão exacta — servidor, manual, KG, ontologia e contrato — está em `sbd://toe/version`; o histórico no CHANGELOG do servidor.» | 2 | B |
| 41-46 | Tabela de modos CONSULT/GUIDE/SETUP/IMPL | Falta a porta de entrada `select_sbd_toe_requirements` (GUIDE, «START HERE»), as leituras CONSULT (`explain_sbd_toe_topic`), NORMATIVA (`get_sbd_toe_playbook`), PROGRAMA (`get_sbd_toe_macro_processes`) e IMPL (`get_sbd_toe_chapter_capability`). Em SETUP, `setup_sbd_toe_agent` é um *prompt*, não uma tool. | 3 | A |
| 58-80 | Tabela de tools: 21 entradas | A 0.21.0 expõe 29. Faltam 8: `select_sbd_toe_requirements`, `explain_sbd_toe_topic`, `get_sbd_toe_chapter_capability`, `get_sbd_toe_macro_processes`, `get_sbd_toe_playbook`, `trace_sbd_toe_graph`, `trace_sbd_toe_requirement_sources`, `read_sbd_toe_resource`. | 3 | A |
| 71 | `prepare_sbd_toe_codegen_context` «com `citation_map` fechado» | «com `citations` — o mundo fechado de ids legais». O `citation_map` deixou de existir. | 1 | A |
| 84-93 | Tabela de resources: 8 entradas | Faltam 6: `sbd://toe/quick-start`, `sbd://toe/model`, `sbd://toe/activation-vocabulary`, `sbd://toe/codegen-instructions/{mode}`, `sbd://toe/notes`, `sbd://toe/notes/{id}`. | 3 | A |
| 88 | `chapter-applicability` = «Capítulos activos/condicionais/excluídos» | Aplicabilidade GRADUADA: todos os capítulos aplicam-se a todos os níveis; muda a exigência (ver `semantics` do próprio recurso). | 1 | A |
| 97-100 | Prompts: 2 entradas | Falta `prepare_grounded_codegen` (terceiro prompt). | 3 | B |
| 113-114 | L2 «desbloqueia capítulos 06 e 11»; L3 «desbloqueia adicionalmente o capítulo 13» | Nenhum capítulo se desbloqueia por nível — todos aplicam-se a todos; a exigência escala L1→L3 (matriz do cap. 01). Retirar «desbloqueia». | 1 | A |
| 116-118 | Lista de 12 *concerns* | O vocabulário tem 24. Não enumerar na prosa: «vocabulário fechado em `sbd://toe/activation-vocabulary` (valores e o que cada um activa)». | 1 | A |
| 122-124 | «13 papéis canónicos» com a lista | Correcto hoje (13). Opcional: apontar para `sbd://toe/activation-vocabulary` → `roles` em vez de repetir a lista. | 2 | C |
| 134 | «o `citation_map` devolvido é o mundo fechado de IDs válidos» | «o bloco `citations` devolvido é o mundo fechado de ids válidos (legenda por fonte + ids referenciados por caminho do payload)». | 1 | A |

### `02-quickstart.md` — 3 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 30 | «devolver os 15 capítulos» | Correcto hoje. Opcional sem número: «a devolver o índice de capítulos». | 2 | C |
| 69-73 | Validar a ligação com `setup_sbd_toe_agent(...)` como se fosse chamada; resposta «capítulos activos» | É um *prompt* MCP (clientes sem prompts, como o Claude Desktop, não o expõem). A resposta real descreve aplicabilidade graduada («dominantemente obrigatório em L2»), não capítulos activos. Validar antes com `read_sbd_toe_resource(uri="sbd://toe/version")` ou `list_sbd_toe_chapters`. | 1 | A |
| 75-79 | «E a seguir» sem a primeira chamada real | Acrescentar a primeira chamada que as descrições das tools marcam como START HERE: `select_sbd_toe_requirements` com o que o agente leu DECLARADO (risk_level, concerns, exposure, data_sensitivity, technologies, changed_files). | 3 | A |

### `03-instalacao.md` — 5 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 26 | Espaço em disco «~40 MB» | Medido na 0.21.0: 58 MB descompactado (6 MB de download). Sem número: «algumas dezenas de MB (snapshot do manual, KG e ontologia)». | 2 | B |
| 30, 166 | Links de releases em `Shiftleftpt/sbd-toe-mcp-poc` | `SbD-ToE/sbd-toe-mcp/releases`. O bundle existe (`sbd-toe-mcp-v<versão>-bundle.tar.gz`/`.zip` + `.sha256`) — acrescentar «verificar o `.sha256`». | 1 | A |
| 164 | «(ar-gapped, *air-gapped*, *self-hosted*)» | Gralha duplicada: «(*air-gapped*, *self-hosted*)». | 1 | C |
| 193 | `map_sbd_toe_applicability(projectAttributes)` «o agente resolve» o risk level | A tool exige `riskLevel` (não o decide) e aceita `technologies`, `hasPersonalData`, `isPublicFacing`, `projectRole`. Para decidir o nível: método do cap. 01; a tool mostra o efeito de cada nível. | 1 | A |
| 205 | «Deve devolver 15 capítulos» | Correcto hoje. Opcional: «devolve o índice de capítulos (`00-fundamentos` … `14-governanca-contratacao`)». | 2 | C |

### `04-skills-agentes.md` — 5 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 24 | Claude Code: `.claude/skills/sbd-toe.md` | Para skills de papel a tool sugere `.claude/skills/sbd-<role>.md` e subagents `.claude/agents/sbd-<role>.md` (`suggested_path`). Alinhar a tabela com isso; o guia sem papel não traz `suggested_path`. | 1 | B |
| 41-44 | Parâmetros de `generate_sbd_toe_skill` | Falta `tool_prefix` e `clientType` (este último listado só em 05). Acrescentar. | 3 | C |
| 70-75 | Estado inicial: «Capítulos activos / excluídos / condicionais» | Aplicabilidade graduada: nenhum capítulo excluído; o prompt devolve a exigência por capítulo no nível. | 1 | A |
| 119-121, 144 | «começar por chamar `consult_security_requirements` antes de propor código» | Para uma tarefa concreta, a porta de entrada é `select_sbd_toe_requirements` (declarativo) ou `prepare_sbd_toe_codegen_context`; `consult` devolve o catálogo do nível. Rever as duas recomendações. | 1 | A |
| 148 | «6 cenários» | São 7 casos de uso. Sem número: «os casos de uso». | 2 | B |

### `05-tools-reference.md` — 24 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 15 | «três modos (CONSULT / GUIDE / SETUP)» | Há também IMPL e as leituras NORMATIVA e PROGRAMA. Proposta: «as tools organizam-se por leitura» + lista. | 1 | B |
| 17 | Lista das determinísticas | Falta `select_sbd_toe_requirements` (a selecção declarativa é determinística e reproduzível). | 3 | A |
| 30 | `search_sbd_toe_manual` — parâmetro `query` | O parâmetro é `question` (obrigatório); opcionais `topK`, `useVectorRecall`, `debug`. A descrição servida marca-a NÃO-NORMATIVA. | 1 | A |
| 55-58 | Parâmetros de `consult_security_requirements` | Faltam `exposure`, `data_sensitivity` e `mode` (`full` \| `index`). | 3 | B |
| 59-62 | «fechado — 13 valores exatos» + lista | 24 valores. Não enumerar: apontar para `sbd://toe/activation-vocabulary`. Manter a nota de que valores fora do vocabulário são declarados, não aproximados. | 1 | A |
| 89-90 | Tamanhos «L1 ≈ 22k · L2 ≈ 36k · L3 ≈ 36k» | Medido na 0.21.0: 32k / 48k / 51k (com `auth`+`logging`: 9k). Sem número: «a resposta completa de L2/L3 pode exceder o contexto; o guia (`sbd://toe/agent-guide`) publica os tamanhos medidos na build servida; cada resposta declara o seu em `size_estimate`». | 2 | B |
| 104-110 | `map_sbd_toe_applicability`: «atributos do projecto»; output «activos/condicionais/excluídos» | Parâmetros: `riskLevel` (obrigatório), `technologies`, `hasPersonalData`, `isPublicFacing`, `projectRole`. Output graduado: `chapters` com exigência por capítulo, `conditional`, `activatedBundles`. | 1 | A |
| 118-120 | `get_sbd_toe_chapter_brief`: parâmetro `chapter_id`; output `phases`, `artifact_ids[]`, `topics[]`, `controls[]` | Parâmetro `chapterId`. Output: `id`, `found`, `title`, `objective`, `role`, `phases`, `artifacts`, `artifacts_basis`. | 1 | A |
| 126-128 | `list_sbd_toe_chapters`: «`min_level`, `domains`»; `risk_level` filtra | Campos: `id`, `title`, `readableTitle`, `applicability`, `demand_by_level` (a teoria do `min_level` foi retirada). Parâmetro `riskLevel`; não exclui capítulos. | 1 | A |
| 176 | `record_type` (`control` \| `requirement` \| `role` \| `practice`) | Lista incompleta: há `threat`, `artifact`, `evidence_pattern`, os `appsec_*` do AppSec Core v1 e os `regulatory_*` do overlay. Um valor desconhecido devolve a lista válida. | 1 | B |
| 202 | `phase`: `requirements \| design \| implement \| test \| deploy \| operate \| governance` | Fases canónicas: `plan`, `design`, `develop`, `build`, `test`, `deploy`, `operate`, `govern`. Os aliases resolvem (verificado: `implement`→`develop`, `requirements`→`plan`, `governance`→`govern`). | 1 | B |
| 239-241 | Aviso: concerns de base roteiam para o cap. 02 (`MT-021..038`), «fix em curso» | Corrigido no servidor. Hoje cada resposta declara `routing_basis` por concern (`domain_chapter` \| `activated_controls`); só 11 concerns têm capítulo de ameaças próprio, os outros chegam pelos capítulos que definem os controlos activados. A página 1 é a parte relevante. | 1 | A |
| 247-251 | `plan_sbd_toe_repo_governance`: «lista de `artifact_id` + `chapter_id` + `description`» | Output: `byChapter`, `totalArtefacts`, `artefact_totals`, `coverage`, `risk_level_effect`; parâmetros `riskLevel`, `offset`, `limit` (paginado). | 1 | A |
| 272 | `prepare…`: «`task` (string) — obrigatório» | Em modo declarativo (default) o `task` é contexto REGISTADO e opcional; é motor só em `selection_mode: "discover"`. | 1 | A |
| 273 | Parâmetros opcionais do `prepare` | Faltam `technologies`, `chapters`, `categories`, `selection_mode`, `detail` (`lista` \| `standard` \| `full`), `include_relations`, `debug`. | 3 | A |
| 276-283 | Tabela de `status` (4) | Falta `needs_input` (sem declaração: devolve o vocabulário, candidatos a confirmar e, para declarações inertes, `valid_values`). `needs_decomposition` acima do tecto traz `requirement_ceiling.batches` executáveis cuja união é a selecção inteira. | 1 | A |
| 286 | «O `citation_map` devolvido é o mundo fechado» | `citations`. | 1 | A |
| 284-292 | Disciplina após `ready_for_codegen` | Acrescentar a forma da resposta: um objecto por requisito `{id, name, type, description, verify, evidence}`; `adjacency` (o que não declaraste e mudaria o conjunto); `completeness_report.verification`; `size_estimate`; `note_id` resolvidos em `sbd://toe/notes/{id}`. | 3 | A |
| 321-323 | `setup_sbd_toe_agent`: «Output: capítulos activos» | Output graduado: exigência dominante por capítulo no nível; nenhum capítulo excluído. | 1 | B |
| 327 | «Implementation view (V5)» | Rótulo interno de versão. Sem número: «Vista de implementação». | 2 | C |
| 356 | `get_sbd_toe_verification_matrix`: `risk_level`, `limit?`, `offset?` | Falta `requirement_ids` (até 50 por chamada) — o fecho requisito→prova a partir de uma selecção. | 3 | B |
| 363, 366-368 | `assess…`: parâmetros; «em L2 são ~92» | Falta `chapter` (restringe o universo) e `offset`/`limit`. `kpi_values` vazio é recusado (-32602). Sem número: «devolve todos os KPIs aplicáveis». | 2 | B |
| (nova secção) | — | Entradas para as 8 tools em falta (ver 01-intro:58-80), começando por `select_sbd_toe_requirements`. | 3 | A |
| 419-424 | Padrão «Codegen grounded»: ramificar por status | Acrescentar o ramo `needs_input` e o `detail`. | 1 | B |

### `06-resources-prompts.md` — 9 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 37 | agent-guide: «mapa dos 15 capítulos» | Correcto hoje. Opcional: «mapa dos capítulos». | 2 | C |
| 46 | index-compact: «`min_level`, `domains`» | Campos: `chapterId`, `readableTitle`, `demand_by_level`, `technologies`; semântica graduada. | 1 | A |
| 50-72 | chapter-applicability: «activos, condicionais e excluídos»; exemplo com `excluded: ["13-…"]` | A forma real é `{riskLevel, semantics, canonical_anchor, chapters[]}` com a exigência por capítulo; nenhum excluído. O exemplo contradiz o comportamento servido — substituir. | 1 | A |
| 101-108 | Exemplo de `sbd://toe/version` com `0.10.2`, `v1.7.0`, `v1.6.0`, `v1.11`, hashes | Sem números: listar os campos (`name`, `version`, `manual`, `kg`, `ontology`, `serving_contract`, `surface_history`) com valores `"…"`. | 2 | B |
| 143 | `prepare_grounded_codegen`: `concerns` «senão inferidos pelo motor de activação» | Em declarativo nada se infere do `task`: sem declaração a resposta é `needs_input` com o vocabulário. | 1 | A |
| 144 | `regulatoryFrameworks` (ex.: `GDPR`, `EXT-DORA`) | `GDPR` não é reconhecido (verificado: `unsupported_scope`). Códigos publicados: `RGPD`, `DORA`, `NIS2`, `CRA`, `AI-ACT`, `ENISA-CSA` (ou `EXT-…`). Usar `RGPD` no exemplo. | 1 | A |
| 146 | «citar IDs do `citation_map`» | «citar ids de `citations`». | 1 | A |
| 150-157 | Bootstrap mínimo de sessão | Acrescentar `sbd://toe/quick-start` (arranque barato) e `sbd://toe/activation-vocabulary` antes da primeira declaração. | 3 | B |
| (nova secção) | — | Os 6 resources em falta (ver 01-intro:84-93), com destaque para `activation-vocabulary` e `notes/{id}`. | 3 | A |

### `07-casos-uso/index.mdx` — 3 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 19 | «seis receitas testadas» | São 7. Sem número: «as receitas». | 2 | B |
| 41-43 | Cartão Codegen: «disciplina de citation_map»; tag `citation_map` | `citations`. | 1 | A |
| 69 | «os seis indexados no KG em 0.10.2» | Sem número: «os cross-checks publicados, indexados no snapshot servido (ver `sbd://toe/version`)». | 2 | B |

### `07-casos-uso/01-auditoria-pr.md` — 1 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 55-61 | Passo 3: `consult_security_requirements` com concerns inferidos à mão | Fluxo continua válido. Proposta: declarar `changed_files` directamente em `select_sbd_toe_requirements` (activa capítulos pela tabela publicada) e fechar com `get_sbd_toe_verification_matrix(requirement_ids)` para a evidência esperada. | 3 | B |

### `07-casos-uso/02-codegen-grounded.md` — 8 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 4, 11, 18 | description/tag/prosa: `citation_map` | `citations`. | 1 | A |
| 39-49 | Exemplo: `data_sensitivity: "credentials"`, `regulatory_frameworks: ["GDPR"]`, `stack: "node-express-typescript"` | Verificado: este exemplo devolve `unsupported_scope` (GDPR não reconhecido). `credentials` não existe (valores: `low`, `personal`, `regulated`, `secrets`); `stack` livre só conta com token do vocabulário — preferir `technologies`. Proposta verificada: ver §5, Lote 1, ponto 1. O overlay regulatório sai do exemplo principal (ver §6). | 1 | A |
| 52-90 | Ramificação por status (4) | Acrescentar `needs_input`. Em `needs_decomposition` por tecto, usar os `requirement_ceiling.batches` (lotes que somam o todo) em vez de «2–4 sub-tarefas derivadas de `partial_activation_trace`». | 1 | A |
| 88 | `npm run checkout:backend` ou *pin* outra KG snapshot | Só existe num clone do repositório. A resposta servida diz: reinstalar/actualizar o pacote publicado e reportar ao operador. | 1 | B |
| 110 | «Manter ordenação relativa dos `evidence_patterns` (já vem capada/ordenada)» | O bloco `evidence_patterns` deixou de existir: cada requisito traz `verify` e `evidence`; o resto via `completeness_report.verification.by_ref`. | 1 | A |
| 142 | Skill: «citation_map é o mundo fechado» | `citations`. | 1 | A |
| 156 | test-plan: «`evidence_patterns[].id` que satisfaz» | Usar `verify`/`evidence` de cada requisito como expectativa; ids de padrão via `verification.by_ref`. | 1 | A |
| (nova secção) | — | Níveis `lista`/`standard`/`full` e o que cada um põe inline; tectos por contagem com lotes; `adjacency`; `size_estimate`; notas por referência. | 3 | A |

### `07-casos-uso/03-threat-modeling.md` — 1 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 69-71 | Aviso de routing «à data desta versão» + «fix em curso» | Obsoleto (ver 05-tools-reference:239-241). Substituir por leitura de `routing_basis`. | 1 | A |

### `07-casos-uso/04-governance-bootstrap.md` — 3 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 27-51 | Output `artifacts[]` com `ART-01-classificacao-aplicacoes-form`, `required_at` | Forma real: `byChapter`, `totalArtefacts`, `artefact_totals`, `coverage`; ids de artefacto `ART-<slug>-<hash>`; não há `required_at`. | 1 | A |
| 53-56, 137 | Filtrar por `chapter-applicability` «eliminar artefactos de capítulos excluídos» | Nenhum capítulo é excluído. Passar `riskLevel` a `plan_sbd_toe_repo_governance` (declara `risk_level_effect`). | 1 | A |
| 149 | Risk level sobe → «adiciona artefactos dos capítulos novos» | Não há capítulos novos por nível: muda a exigência. Proposta: «re-correr — a exigência muda; não apagar nada». | 1 | B |

### `07-casos-uso/05-onboarding-formacao.md` — 1 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 19, 74-92, 142-146 | Fases `requirements`, `implement`, `operate`… | Funcionam por alias; documentar as canónicas (`plan`, `design`, `develop`, `build`, `test`, `deploy`, `operate`, `govern`). | 1 | C |

### `07-casos-uso/06-cross-check-conformidade.md` — 4 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 22 | «onde estão indexados a maior parte dos cross-checks» | Contradiz a linha 26 (os seis indexados). «onde estão indexados os cross-checks publicados». | 1 | A |
| 26 | `0.10.2`, manual `v1.7.0`, KG `v1.6.0` | Sem números (ver 01-intro:29-33). | 2 | B |
| 61, 69, 71, 132, 143 | AI Act só no manual web («obrigatório», «só aqui», «hoje o AI Act»; skill «usa manual web para AI Act») | Contradiz as linhas 26, 37 e 164: o AI Act está indexado. Retirar a excepção do AI Act do fluxo, das etiquetas e da skill. | 1 | A |
| 49-86 (fluxo) | Fluxo só com `search`/`inspect`/`query` | Falta a tool NORMATIVA `get_sbd_toe_playbook` (playbooks publicados por diploma, autoridade declarada, `no_cross_check` para ISO/PCI/SOC2…) e `map_sbd_toe_regulatory_activation`. É o caminho principal deste caso. | 3 | A |

### `07-casos-uso/07-agentic-sdlc.md` — 2 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 34, 67 | `consult_security_requirements(risk_level, ["requirements"])` para obter `REQ-AGN-*` | O concern que activa a categoria AGN é `agents`. | 1 | A |
| 105 | «citation_map (quando `prepare…` é usado)» | `citations`. | 1 | A |

### `08-padroes-avancados.md` — 8 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 17 | Lista das determinísticas | Acrescentar `select_sbd_toe_requirements`. | 3 | B |
| 57 | Template: «THR-* + mitigações» | `MT-*`. | 1 | B |
| 78 | Brief: «phases, artifact_ids, topics e controls[]» | Ver 05-tools-reference:118-120. | 1 | B |
| 84 | `resolve_entities({record_type: "artifact", filters: {chapter: …}})` | `chapter` não é campo de `artifact` (verificado: `unknown_filter_fields: ["chapter"]`, total 0). Usar `get_sbd_toe_chapter_brief(chapterId)` → `artifacts`. | 1 | A |
| 150-168 | Padrão 5 — decomposição | Acima do tecto, o `needs_decomposition` traz lotes executáveis (`categories` + activadores preservados) cuja união é a selecção inteira: seguir os lotes, não re-desenhar à mão. | 1 | B |
| 182 | «Indexados em 0.10.2» | Sem número (ver 01-intro:29-33). | 2 | B |
| 230 | `inspect_sbd_toe_retrieval({query: …})` | Parâmetro `question`. | 1 | A |
| (novo padrão) | — | «Que requisitos se aplicam a esta tarefa»: `select` (declarativo) → `prepare` → `get_sbd_toe_verification_matrix(requirement_ids)`. | 3 | B |

### `09-epistemica-anti-patterns.md` — 3 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 73 | «regulamento que o MCP não indexa (AI Act, CRA, …)» | Contradiz 126: os seis estão indexados. «conteúdo posterior ao snapshot servido». | 1 | A |
| 63, 84, 118-121 | `mitigation_confidence: "heuristic"` | No bundle servido só aparece `derived` (verificado). Manter a regra de forma genérica: «ligação sem `mitigation_confidence: derived` → inferido». | 1 | C |
| 126 | «Em `0.10.2` os seis cross-checks…» | Sem número. | 2 | B |

### `10-troubleshooting-faq.md` — 10 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 27 | `sbd://toe/version` devolve `{name, version, description}` | Devolve também `manual`, `kg`, `ontology`, `serving_contract`, `surface_history`. | 1 | B |
| 32 | `npx -y @shiftleftpt/sbd-toe-mcp --version` | Não há flag `--version`: o comando arranca o servidor. Usar `npm view … version` ou o recurso. | 1 | A |
| 59 | «Estado corrente: `0.10.2` serve o manual `v1.7.0`…» | Sem números (ver 01-intro:29-33). | 2 | B |
| 83, 93 | «~36k chars», «~9k chars» | Sem números (ver 05-tools-reference:89-90). | 2 | B |
| 110 | `inspect_sbd_toe_retrieval({"query": …})` | `question`. | 1 | A |
| 180 | `npm run checkout:backend` | Ver 02-codegen-grounded:88. | 1 | B |
| 231 | «Deve mostrar logs stderr “MCP server listening on stdio”» | Verificado no pacote publicado: não escreve nada no stderr ao arrancar. Validar enviando `initialize` ou com `claude mcp list`. | 1 | A |
| 257 | «custo: capítulos adicionais» | Graduado: muda a exigência, não o conjunto de capítulos. | 1 | B |
| 283 | Issues em `Shiftleftpt/sbd-toe-mcp-poc` | `SbD-ToE/sbd-toe-mcp/issues`. | 1 | A |
| (novas entradas) | — | FAQ para: `needs_input`; `detail: "minimal"`/`"ultrathin"` recusados (e para onde foram); `needs_decomposition` com lotes; `size_estimate.within_envelope: false`. | 3 | A |

### `11-versionamento-roadmap.md` — 8 achado(s)

| linha | hoje | devia / forma agnóstica | classe | prio |
|---|---|---|:-:|:-:|
| 24-28 | Exemplos SemVer com `0.10.0`, `0.10.2 (atual)` | Exemplos genéricos (`0.X.0`, `0.0.X`) sem «actual». | 2 | B |
| 52 | Manual em `Shiftleftpt/SbD-ToE-Manual` | `SbD-ToE/sbd-toe-manual` (o repositório que o pino do bundle declara). | 1 | A |
| 53, 58, 60 | Cobertura e exemplos com `0.10.2`, `v1.7.0`, `v1.6.0` | Sem números; manter a regra (sem mapeamento 1:1; snapshot na publicação). | 2 | B |
| 64-81 | Secção «Release actual» inteira (256 requisitos, 27 categorias, 13 concerns, 21 tools, 8 resources, 3 prompts) | Hoje: 274 / 29 / 24 / 29 / 14 / 3 — e amanhã outra coisa. Substituir a secção por: «O que a versão servida contém está em `sbd://toe/version`; o que cada release mudou está no CHANGELOG e nas GitHub Releases». | 2 | A |
| 89-96 | «Entregue (`0.10.x`)» | Passar para o CHANGELOG; aqui só o roadmap sem versões. | 2 | B |
| 118-139 | «Changelog (resumo público)» por versão | Remover o resumo; manter só os ponteiros (CHANGELOG, Releases, `npm view … time`). | 2 | A |
| 122, 147, 154 | Links em `Shiftleftpt/sbd-toe-mcp-poc` | `SbD-ToE/sbd-toe-mcp`. | 1 | A |
| 156 | Manual em `Shiftleftpt/SbD-ToE-Manual` | `SbD-ToE/sbd-toe-manual`. | 1 | A |

### Verificado e correcto (não mexer)

`@shiftleftpt/sbd-toe-mcp` e o binário `sbd-toe-mcp`; Node ≥ 20.9.0; os blocos de configuração dos clientes; resolução por id exacto em `query_sbd_toe_entities` (`AUT-001` → `match: "exact_id"`); gramática de ids e `citation_note`; campos `_confidence`, `chapter_ids`, `rule_trace` (incluindo `CONCERNS_FILTER_REQUIREMENTS`) e `coverage_gaps` do `consult`; forma das ameaças (`MT-NNN`, `mitigation_confidence`, `mitigation_strength`, `mitigated_by`); `get_guide_by_role` sem `role`/`phase` só devolve contagens; os 13 papéis; `REQ-AGN-002` activo desde L1; códigos de framework em `map_sbd_toe_regulatory_activation`; o cabeçalho da skill gerada (10-troubleshooting:274); os quatro rótulos epistémicos.

## 5. Proposta de lote de correcções à fonte PT (para o Manual Agent)

Três lotes, por esta ordem — cada um fecha-se sozinho. O EN chega pelo pipeline como diff.

### Lote 1 — o que está errado agora (classe 1, prioridade A)

Aplicar os achados classe 1 prioridade A do inventário, em particular:

1. Exemplo de *Codegen grounded* (07-02:39-49) — substituir por este, **verificado na 0.21.0** (`ready_for_codegen`, 36 requisitos, ≈5,8k tokens, dentro do envelope; a `adjacency` avisa que `exposure: "public"` acrescentaria requisitos):
   ```json
   prepare_sbd_toe_codegen_context({
     "task": "Implementar endpoint POST /login com lockout após 5 falhas em 10 minutos",
     "risk_level": "L2",
     "mode": "codegen",
     "detail": "lista",
     "concerns": ["auth", "logging"],
     "technologies": ["jwt"]
   })
   ```
   Acrescentar logo a seguir uma nota didáctica, também verificada: declarar `"exposure": "public"` alarga a selecção para 70 requisitos, acima do tecto da `lista`, e a resposta passa a `needs_decomposition` com dois lotes (48 + 23) que somam o todo. O overlay regulatório não entra no exemplo principal enquanto o achado do §6 não estiver resolvido.
2. `citation_map` → `citations` e `evidence_patterns` → `verify`/`evidence` por requisito (T3).
3. Aplicabilidade graduada (T5): retirar «desbloqueia», `excluded`, `min_level`; substituir o exemplo de `chapter-applicability` pela forma `{riskLevel, semantics, canonical_anchor, chapters[]}`.
4. Nomes de parâmetros: `question` (search, inspect), `chapterId` (brief), `riskLevel` (list_chapters, repo_governance, applicability); `resolve_entities` sem `filters.chapter` para artefactos.
5. Aviso de routing das ameaças (05:239-241, 07-03:69-71) → texto sobre `routing_basis`.
6. AI Act (T6) e repositórios (T1).
7. FAQ: retirar `--version`, o «MCP server listening» e o `checkout:backend`.

### Lote 2 — «sem versões na prosa» (classe 2)

Regra proposta para todo o `020-assets/mcp/`: **nenhum número de versão, data ou contagem da superfície na prosa**. Cada ocorrência vira uma de três formas:

- **Versão servida:** «a versão exacta (servidor, manual, KG, ontologia, contrato) está em `sbd://toe/version`».
- **O que mudou:** «ver o CHANGELOG do servidor e as GitHub Releases de `SbD-ToE/sbd-toe-mcp`».
- **Contagens e listas** (tools, resources, concerns, requisitos, tamanhos): apontar para a fonte servida — `tools/list`, `sbd://toe/activation-vocabulary`, `sbd://toe/agent-guide` (tamanhos medidos na build) ou o `size_estimate` de cada resposta.

No ficheiro 11: a secção «Release actual», o «Entregue (0.10.x)» e o «Changelog (resumo público)» saem; ficam a política SemVer (com exemplos genéricos), a relação com as versões do manual (sem números) e o roadmap. É a peça que mais reduz o impacto do desfasamento de uma versão que o lead aceitou.

Excepções que proponho manter (estáveis e úteis): «15 capítulos 00–14» e «13 papéis canónicos» — classe 2 prioridade C, decisão editorial do Manual Agent.

### Lote 3 — o que falta (classe 3), por visibilidade

1. **Contrato declarativo + `select_sbd_toe_requirements`** em 01 (tabela de modos), 02 (a primeira chamada real), 04 (o que a skill ensina) e 05 (secção própria, primeira da referência).
2. **Forma da resposta do `prepare` na 0.21** em 05 e 07-02: requisito fundido `{id, name, type, description, verify, evidence}`; níveis `lista`/`standard`/`full` e o que cada um põe inline; tectos por contagem acima dos quais vem `needs_decomposition` com lotes que somam o todo; `adjacency`; `size_estimate`; notas por referência (`note_id` → `sbd://toe/notes/{id}`); o `status` `needs_input`.
3. **As 8 tools em falta** em 01 e 05 — prioridade: `select`, `get_sbd_toe_playbook` (entra no caso de cross-check), `explain_sbd_toe_topic`, `get_sbd_toe_chapter_capability`, `get_sbd_toe_macro_processes`, `read_sbd_toe_resource`, `trace_sbd_toe_requirement_sources`, `trace_sbd_toe_graph`.
4. **Os 6 resources em falta** em 01 e 06 — prioridade: `activation-vocabulary`, `quick-start`, `notes/{id}`, `model`, `codegen-instructions/{mode}`, `notes`.
5. **FAQ** para `needs_input`, níveis retirados, lotes de decomposição e `within_envelope: false`.

## 6. Achado de serving fora do âmbito (para o Orchestrator — é meu, não dos docs)

Ao testar o exemplo do caso *Codegen grounded*, apareceu um defeito do servidor, não dos docs. Com `include_regulatory_overlay: true` e `regulatory_frameworks: ["RGPD"]`, o `prepare` devolve **todos os 1 693 mapeamentos do overlay RGPD** no bloco `regulatory_overlay`, sem os restringir às obrigações activadas (6) e sem dieta nem paginação:

| caso (`auth`+`logging`, `jwt`, L2) | `lista` | `full` |
|---|---:|---:|
| sem overlay | 5 808 tk | 10 860 tk |
| com overlay RGPD | **123 056 tk** (overlay: 116 990) | **136 203 tk** |

O payload declara-o (`within_envelope: false`), mas o tecto por contagem não o trava, e viola a regra da casa de que listas são paginadas e *coverage-preserving*. Não corrigi nada: o despacho é só de leitura. Não verifiquei se já acontecia na 0.20.0. Proponho tratá-lo como 0.21.x própria, à ordem do Orchestrator.

## 7. Limites desta auditoria

- Os blocos de configuração dos clientes (caminhos de ficheiros do Cursor, Windsurf, Zed, VS Code) não foram testados em cada cliente — só confirmei que o servidor arranca e responde a `initialize` via `npx`.
- A forma de `map_sbd_toe_review_scope` (07-01:44-53) não foi verificada — não a assinalei.
- Onde o texto dos docs é conceptual e continua verdadeiro (disciplina epistémica, anti-patterns, estrutura dos relatórios), não propus alterações.

