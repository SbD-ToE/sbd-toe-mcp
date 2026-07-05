---
ai_assisted: true
model: Claude Fable 5
date: 2026-07-05
purpose: governance-doc
produced_by: sync
target: executor+tester
epic: v2-token-diet
review_status: pending-human-review
---

# EPIC — v2: token diet do `prepare_sbd_toe_codegen_context` (linha beta `0.20.x`)

**Home:** `sbd-toe-mcp-poc_0.20.0` (branch `0.20-beta`, versão `0.20.0-beta.1`).
**Estável paralelo:** `0.10.x` (`master`, `latest`) — **intocado** (a experiência D-a/D-b congelou o 0.10.1).

## Motivação — medição, não intuição

Eval externo (D-a MCP-off vs D-b MCP-on, block48, 14 tarefas) mediu **custo 5,5×** com o MCP:
turnos 2→12 (6×), output 6,6×, **cache-read 10×** (32K→324K). Decomposição: *payload grande ×
muitos turnos = re-leitura de contexto amplificada*.

Medição local do payload (2026-07-05, `dist` da `0.20.0-beta.1`, task típica auth+validation,
`risk_level: L2`) — **baseline de regressão**:

| Secção | Itens | ≈Tokens | % | Natureza |
|---|---|---|---|---|
| `g2_context.relations` | 106 | 4.370 | 23% | dump inline do grafo, raramente usado pelo codegen |
| `manual_grounding` | 51 | 3.572 | 19% | `manual_commit_sha`/paths repetidos por entrada |
| `g2_context.evidence_patterns` | 25 | 2.846 | 15% | conteúdo útil; cap generoso |
| `citation_map` | 111 | 2.677 | 14% | 111× `{source, source_data}` quase idênticos |
| `activated_scope` | ~100 | 2.145 | 11% | **núcleo — manter** |
| `g2_context` (entidades) | 51 | 2.057 | 11% | **núcleo — manter** |
| `activation_trace` + boilerplate estático + echo | — | ~1.240 | 7% | audit + template constante por modo |
| **TOTAL** | | **≈18.900** | | (task com 3 famílias: ≈24.700) |

Fatores estruturais: (a) o seam `src/serving/response-shaping.ts` (perfis `inline`/`agentic`/
`governance`/`diagnostic`, budgets, truncagem nunca-silenciosa) é usado por 8 tools **mas não por
esta**; (b) `source: "runtime_v1"` repetido item-a-item em todas as listas.

**Fixtures baseline (reproduzir a medição exatamente com isto; tokens ≈ `JSON.stringify(r).length / 4`):**

```json
[
  { "task": "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
    "risk_level": "L2", "mode": "codegen" },
  { "task": "Implement a secure endpoint for uploading documents with logging",
    "risk_level": "L2", "mode": "codegen" }
]
```

(1ª fixture ⇒ 18.903 tokens / 111 ids no `citation_map`; 2ª ⇒ 24.731 tokens / 150 ids.)

## ⟳ ADENDA (2026-07-05) — correção de arquitetura do D-b + achados novos

Trace das sessões D-b reais (agente executor do eval) corrigiu duas premissas:

1. **D-b é UMA sessão, não duas.** Codegen e review acontecem no mesmo contexto (`claude -p` ×1);
   o 2º agente do DualGauge é o árbitro (gpt-5-nano, não usa este MCP). Os ~12 turnos são o loop
   real write-test-edit do agente — **não são compressíveis pelo MCP**. ⇒ o s4 original
   ("review reutiliza contexto entre sessões") cai; substituído pelo s4 revisto abaixo.
2. **Desperdício observado: chamadas MCP repetidas na mesma sessão** (uma sessão chamou
   `prepare_codegen_context` ×3 ≈ 60K tokens acumulados). ⇒ gate novo: 1 chamada por sessão.
3. **O bundle publicado já carrega o "how" que falta ao codegen**: 251/251 requirements têm
   `description` imperativa (média 193 chars; ex.: ACC-001 "Perfis e permissões mapeados; role com
   privilégio reduzido não acede a recursos restritos") e os controls também — **a projeção atual
   descarta-a** (só id+name+category). Incluí-la é serialização de dados publicados (permitido),
   não knowledge-builder logic (proibido). ⇒ alavanca de QUALIDADE além de custo (fecha o gap
   "how" identificado no eval F6).
4. **Consequência nos números:** com turnos ≈ constantes, o ganho vem quase todo do payload.
   Projeção revista: cache-read 324K → ~110–130K; custo/amostra 5,5× → ~2–2,5×.
5. **Protocolo do próximo run (decisão do operador, 2026-07-05):** o run limpo do DualGauge será
   **1 run vanilla sem MCP + 1 run com contexto MCP em single-pass** — *sem* loop de improvement
   e *sem* re-chamadas (exatamente 1 chamada MCP, depois implementa, termina). Isola a variável
   "o contexto MCP muda o resultado de segurança?" sem confundir com o efeito do workflow
   iterativo. O loop iterativo fica para um braço experimental futuro (D-c), se se quiser medir
   o efeito do workflow separadamente. A imposição é feita na instrução do agente D-b (lado do
   bench), não no servidor.

---

## Objetivo

Reduzir o payload típico de **≈19K para ≤6,5K tokens** (−65%; `minimal` ≤2K) para que o loop
grounded (obtém contexto → escreve → testa contra o contexto → corrige) fique barato **sem mexer
no loop em si** — os turnos são o comportamento desejado. Sem perder acesso a nenhuma informação
(detalhe pesado passa a *on-demand*) e sem degradar a qualidade do grounding (citações VAL-xxx
no eval qualitativo); idealmente **melhorá-la**, expondo o `description` publicado (o "how").

**Onde o grafo v2 ajuda (e onde não):** a única secção onde o SPARQL ajuda é `relations` — o
`trace_sbd_toe_graph` já serve travessias on-demand com lenses curadas, tornando o dump inline
redundante. O resto do payload é projeção plana de atributos → mesma conclusão da decisão 0002:
sem refactor SPARQL das tools existentes.

---

## Invariantes (MANTER — violação = gate falha)

1. **Aditivo na linha beta.** Novo parâmetro `detail: "minimal" | "standard" | "full"`, com
   **default = `full` = output byte-idêntico ao atual**. Flip do default só na graduação
   (release estável seguinte, documentado como breaking).
2. **Sem truncagem silenciosa.** Todo o corte reporta `total`/`returned`/`omitted`
   (padrão `boundList` do response-shaping) ou vem com referência para obter o resto.
3. **Grounding determinístico intacto:** nenhum ID inventado; `citation_map`/`citations`
   cobrem exatamente os mesmos IDs em todos os níveis de `detail` (muda a *codificação*,
   não o *conjunto*).
4. **`consumed-bundle.json` idêntico ao estável.** Dieta é serialização, nunca dados.
5. **Qualidade não regride:** eval qualitativo (`scripts/run-qualitative-eval.mjs`) verde
   a par do gate de tamanho.
6. **Sem fuga de IRIs** nas referências para `trace_sbd_toe_graph`.

---

## Orçamento (gates deste epic)

| Gate | Tipo | Orçamento | Baseline |
|---|---|---|---|
| Payload típico `detail=standard` | 🔴 hard | ≤ 6.500 tokens | 18.903 |
| Payload 3-famílias `detail=standard` | 🔴 hard | ≤ 8.500 tokens | 24.731 |
| `detail=full` byte-idêntico ao atual | 🔴 hard | diff vazio | — |
| Conjunto de IDs citáveis por `detail` | 🔴 hard | idêntico em todos os níveis | 111 ids |
| Eval qualitativo | 🔴 hard | sem regressão vs baseline | — |
| Custo/amostra no re-run D-b | 🟡 soft | ≤ 2,5× do D-a (era 5,5×) | $0.60 vs $0.11 |
| Chamadas MCP por sessão D-b | 🟡 soft | 1 (observado: até 3) | 60K tokens acumulados |

---

## Slices

### s0 — Gates de medição *(foundation — fazer PRIMEIRO)*
- **Create:** teste vitest de orçamento de payload por secção (usa `sizeEstimate` do
  response-shaping; fixtures = as 2 tasks baseline acima) + script
  `scripts/measure-codegen-payload.mjs` (versão do script de medição desta análise).
- **Gate:** teste falha se qualquer secção exceder o budget declarado; baseline atual passa
  com budgets `full`.

### s1 — Dieta estrutural (dedup sem remover nada) *(depends_on: s0)*
- **Alter (aditivo):** `src/tools/prepare-codegen-context.ts` —
  1. `citations` invertido: `{runtime_v0: {source_data, ids: [...]}, runtime_v1: …, overlay: …}`
     em `minimal`/`standard` (`citation_map` clássico mantém-se em `full`). *(−2,4K)*
  2. `manual_grounding` agrupado por `(manual_chapter, manual_file, manual_commit_sha)` com
     lista de `v1_entity_ids` por grupo. *(−2,5K)*
  3. Legend de proveniência top-level; remove `source:` por item em `minimal`/`standard`. *(−1–1,5K)*
- **Gate:** golden snapshots por `detail`; conjunto de IDs idêntico entre níveis; `full` byte-idêntico.

### s2 — Relations on-demand (a ponte para o grafo v2) *(depends_on: s1)*
- **Alter (aditivo):** em `minimal`/`standard`, `g2_context.relations` → `relations_ref`:
  `{tool: "trace_sbd_toe_graph", lenses: [{lens, anchor}...], total_relations}` com anchors
  = slice_ids/entity_ids ativados (ids, nunca IRIs). `include_relations: true` restaura inline. *(−4,3K)*
- **Gate:** para cada `relations_ref`, executar as lenses referidas devolve um superset das
  relations que iam inline (coverage-preserving por referência); no-leak.

### s3 — Caps, boilerplate e o "how" publicado *(depends_on: s1)*
- **Alter (aditivo):** `evidence_patterns` cap 25→10 em `standard` (10→5 em `minimal`;
  `completeness_report` já reporta `total/capped`). *(−1,7K)*
  `llm_codegen_instructions` + `security_rationale_template` → recurso MCP
  `sbd://toe/codegen-instructions/{mode}` referenciado por URI; inline só em `full`. *(−0,4K)*
  `activation_trace` só com `debug: true` em `minimal`/`standard`. *(−0,4K)*
- **Alter (aditivo, qualidade):** incluir `description` (bundle publicado, verbatim) nos
  requirements ativados e nos controls `direct` em `minimal`/`standard`. *(+~1–1,5K, dentro
  do budget; fecha o gap "how" do eval F6 — o modelo passa a receber o COMO, não só o id.)*
- **Gate:** budget hard `standard` ≤ 6,5K atingido nas fixtures; recurso MCP resolve e devolve
  o texto exato que ia inline; `description` é byte-igual ao campo do bundle (nunca parafraseada).

### s3b — Perfil `minimal` codegen-lean *(depends_on: s3)*
- **Alter (aditivo):** `detail: "minimal"` para tarefas pequenas: requirements top-N (N=10)
  ordenados por score de ativação **determinístico** (score do concern que ativou a categoria;
  desempate `requirement_id`), com `description`; controls só `direct`; `omitted` explícito +
  referência para obter o resto (mesma tool com `detail: "standard"` ou
  `consult_security_requirements`). Alvo ≤ 2K tokens.
- **Nota de segurança (coverage):** o servidor NÃO decide "quais os 1–2 requisitos que esta
  task precisa" — isso exigiria julgamento semântico que o servidor não tem. O corte é ranking
  determinístico + contagem de omitidos + como obter o resto; a decisão de aprofundar é do cliente.
- **Gate:** `omitted + returned == total` em qualquer input; ranking estável (2× idêntico);
  conjunto de IDs recuperável na íntegra via a referência indicada.

### s4 — Workflow: turnos baratos, não menos turnos *(depends_on: s3; independente de s2)*
*(Revisto pela ADENDA: em uso de PRODUÇÃO o loop "obtém contexto → escreve → testa contra o
contexto → corrige" é legítimo — não se cortam turnos; corta-se o custo de cada turno e de
cada re-consulta. No BENCH, por decisão do operador (ADENDA §5), o D-b corre single-pass —
a imposição é da instrução do bench, não deste slice.)*
- **Alter:** templates de `generate_sbd_toe_skill` — (a) instruir que o payload já em contexto
  é a fonte para o loop (testar/corrigir contra o `citations` recebido, sem re-chamada com a
  mesma task); (b) re-consultas legítimas (refinar `concerns`, aprofundar um requisito) devem
  usar `detail: "minimal"` ou `consult_security_requirements` pontual — nunca repetir o payload
  completo; (c) o passo de review usa `mode: "review"` só se for sessão nova.
- **Alter (aditivo, servidor):** chamada repetida com input idêntico na mesma perspetiva devolve
  o mesmo resultado (já é determinístico) — acrescentar ao output `standard`/`minimal` uma nota
  `repeat_call_hint` a apontar para a reutilização do contexto.
- **Gate:** skill gerado contém as instruções (a)–(c); smoke do skill; re-chamada idêntica em
  `minimal` custa ≤ 2K (vs 20K observados ×3 no trace do eval).

### s5 — Validação de custo (re-run do eval) *(depends_on: s2+s3+s4)*
- **Protocolo (ADENDA §5):** D-a vanilla + D-b **single-pass** (1 chamada MCP, sem loop de
  improvement, sem re-chamadas) — imposto na instrução do agente do bench.
- **Test (gate):** re-run com o beta desta dieta (`detail=standard`): custo ≤ **1,5×** do D-a
  (o alvo aperta porque single-pass elimina o multiplicador de turnos; payload é o único delta),
  exatamente 1 tool_result MCP por sessão nos audit logs, eval qualitativo sem regressão
  (citações VAL-xxx preservadas) — e, hipótese a testar, delta de segurança MELHOR com o
  `description` no payload.
- Se qualidade regredir → sobe caps/inclui secção em falta e re-mede (o mecanismo `detail`
  permite recuar sem reverter código).

### s6 — Release beta *(depends_on: s5)*
- **Create:** CHANGELOG `0.20.0-beta.2`; nota FREEZE-REGISTRY (linha beta já excluída).
- **Gate:** tag `v0.20.0-beta.2` → `@beta`, `latest` intocado; suite completa verde.

### s7 *(opcional, pós-beta)* — Resources MCP para secções pesadas
- `sbd://toe/codegen-context/{id}/relations|grounding` — cliente lê só o que precisa.
  Depende de suporte de resources nos clientes-alvo; decidir com dados do s5.

---

## Fallback

Como tudo é gateado por `detail` com default `full`, qualquer regressão (qualidade, contrato,
cliente que não suporte referências) recua para o comportamento atual **sem reverter código**.
Se o s5 mostrar ganho <2× no custo, reavaliar se o s7 (resources) é o desbloqueio ou se o teto
é o round-trip por turno (irredutível no workflow grounded).

## Inventário

**CRIAR:** teste de orçamento de payload (s0), `scripts/measure-codegen-payload.mjs`, golden
snapshots por `detail`, recurso `sbd://toe/codegen-instructions/{mode}`, CHANGELOG beta.2.
**ALTERAR (aditivo):** `src/tools/prepare-codegen-context.ts`, `src/index.ts` (schema do input:
`detail`, `include_relations`), templates do `generate_sbd_toe_skill`.
**MANTER:** todas as outras tools; `consumed-bundle.json`; contratos com `detail=full`;
determinismo/no-leak; offline/`npx`.
**TESTAR:** budgets por secção, golden por `detail`, superset das lenses (s2), suite completa,
eval qualitativo, re-run D-a/D-b.

## Papéis

sync/guardian (mantém epic + baseline + valida gates entre sessões) · executor (implementa,
sessão separada) · tester (valida gate por slice) · programme-lead (ratifica flip de default
na graduação).
