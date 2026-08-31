# P1 — Desenho da operação de selecção MP1 (proposta; nada implementado)

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** programme lead (portão **G-mp1a**) · Orchestrator (visibilidade)
**Dispatcher:** `2026-08-31-orchestrator-to-pontifex-ciclo-mp1-operacao-seleccao.md` · **Evidência:** Eixo H (`docs/acceptance-runs/2026-08-31-axis-h-selection-v0.10.4.md`, 1/3/6, cobertura média `prepare` 41 %) · **Semântica de referência:** `requirement_selection_model` da ontologia v2.2 (publicado no bundle) — `selecção = baseline(cap. 02, type base, por nível) ∪ específicos(capítulos activados pelo contexto) ⊕ overlay`, com narrowing por tarefa.

## 1. Onde vive a operação

| Opção | Descrição | Contra |
|---|---|---|
| O1 | Evoluir só `prepare` | `consult` fica sem a semântica; o caso do lead ("que requisitos se aplicam a esta tarefa?") continua a exigir codegen |
| **O2 ★** | **Motor único `src/serving/selection.ts` + tool nova `select_sbd_toe_requirements`; `prepare` e (opcionalmente) `consult` consomem o motor** | +1 tool na superfície |
| O3 | `consult` ganha parâmetro `task` | Sobrecarrega um contrato estável e consultivo com semântica de tarefa; retro-compat frágil |

**Recomendo O2.** A selecção é a operação MP1 do Manual — tem identidade própria na ontologia; merece um primitivo consultivo (L3, linha OSS, sem impacto na fronteira comercial). Um só motor fecha D2/D3/D4 num sítio; `prepare` passa a ser "selecção + contexto de codegen" (D1 resolve-se aí), `consult` mantém o contrato de hoje intocado.

## 2. Algoritmo (determinístico, declarado no trace)

**Passo 1 — Elegibilidade** (lida do `requirement_selection_model` publicado, não hardcodada):
baseline = cap. 02 `type: base` ao nível; específicos = capítulos activados pelo **contexto** (`changed_files` → capítulos via o path-map já existente do `review_scope`; `technologies`/stack → capítulos via o modelo do `map_applicability`); overlay `extend` quando pedido (operador `replace` fica para o ADR 0014 — fora de âmbito, como no dispatcher).

**Passo 2 — Narrowing pela tarefa** sobre o elegível, com **duas bandas de saída, ambas listadas** (never-silent):
- `selected[]` — requisito cuja **categoria** tem sinal declarado: termo/verbo-objecto da tarefa, compound term, concern explícito, `changed_files`, stack, `exposure`, `data_sensitivity` (D3: estes dois deixam de ser decorativos — `personal|regulated` activa ENC + ERR-007 + LOG-005 + VAL por regra declarada; `agents` entra no motor com heurísticas mandate/kill-switch/tool-call/autonomia, paridade com a beta). Cada requisito carrega `selection_trace {layer: baseline|domain|overlay, source, trigger, score, reason}` — extensão do `activation_trace` actual (fontes novas: `task_object`, `data_sensitivity`, `exposure`, `context_chapter`).
- `narrowed_out[]` — elegível **sem** sinal, com razão ("categoria X elegível na baseline L2; sem sinal na tarefa") — o excesso de hoje passa a exclusão auditável; nada desaparece em silêncio.

D4 fica resolvido por construção: o léxico de concerns é **um** sinal entre sete; a composição da semântica de referência é o motor. A tabela verbo-objecto (upload→validation/api; formulário→validation; sessão/JWT→session; mensageria→integrity; …) é versionada no serving e cada match aparece no trace — determinística, sem modelo.

**Nota de honestidade:** GC-01 está contaminado (nota do oráculo). O narrowing calibra-se pela semântica declarada e mede-se contra o oráculo — não se ajusta "até dar 10/10"; se um caso falhar por expectativa, é `oracle?` para o lead; por catálogo, `manual` para o Author (P3).

## 3. Novo scope gate (D1)

O gate deixa de contar requisitos activados (o limiar actual `estimatedRequirements > 50` morre — uma tarefa L2 legítima activa >50 **por desenho**). Passa a guardar:
1. **Âmbito da tarefa** — mantêm-se `VAGUE_PATTERNS` → `needs_decomposition` e "0 sinais" → `needs_clarification` (GC-09 continua PASS); o limiar de famílias de slice (>3) mantém-se como sinal de decomposição.
2. **Payload** — orçamento por modo com `size_estimate` + paginação/dieta declarada, nunca recusa por contagem: recomendo **portar a dieta `detail` da beta** para a estável (índice + handles no `g2_context`/detalhe sob demanda; alternativa mais barata: `coverage`+`nextOffset` no bloco pesado). Tectos da estável: medir em P2 e propor para ratificação (a beta mantém os ratificados 8.800/8.100).

## 4. `consult` sem concerns (GC-03: 133 em excesso)

(a) manter como está; (b) devolver índice por defeito (breaking); **(c) ★ manter o dump por retro-compat + `mode: "index"` opt-in aditivo** (categorias + contagens + handles), e sinalizar (b) como candidato a 0.11/major do contrato de superfície. O novo `select` já cobre o caso com tarefa; o GC-03-via-consult passa a medir o modo índice.

## 5. Impacto no contrato e nos orçamentos

- **Superfície MCP:** O2 = tool nova + campos novos → pela política local (precedente 0.10.0: tools novas = **minor**), o número honesto é **0.11.0**, não 0.10.5; o dispatcher fala em 0.10.5 — tensão assinalada, decisão do lead no G-mp1a. (Se o lead preferir 0.10.5, O1 sem tool nova é o desenho compatível com patch — segunda escolha.)
- **Consumer contract do KG:** **zero impacto** — o motor consome o que v1.14 já publica (`requirement_selection_model`, `type`, `source_bundle`, catalogue_rules). Se P2 descobrir necessidade de dados novos: parar e reportar (regra do dispatcher).
- **Orçamentos:** `select` nasce paginado (G1) com `size_estimate`; `prepare` herda a dieta; medições e tectos da estável propostos no P2 com o `eval:acceptance` (gate E não pode regredir).

## 6. Mapa defeito → mecanismo · critério de saída

D1 → §3 · D2 → §2 (bandas + trace) · D3 → §2 sinais `data_sensitivity`/`exposure`/`agents` · D4 → §2 (léxico = um sinal). Alvo do ciclo: **Eixo H 10/10** nas duas linhas com oráculo v1 intocado; TC-H via `select` e `prepare`; fora de âmbito: lacunas de catálogo (Author), `replace`/`extend` (ADR 0014), KG/ontologia.
