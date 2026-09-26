---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-26"
---

# Factos para os docs do MCP — os 8 pontos em aberto do Manual Agent e 5 verificações (só leitura)

**Pedido:** Orchestrator, 2026-09-26. **Âmbito:** só leitura. Nada foi editado no Manual nem no servidor.
**Verificado contra:** a 0.21.1 (`f4b5564`, construída à parte) e o branch da 0.21.2 (`9a70529`), sobre o mesmo bundle pinado,
por `tools/list`, `resources/list`, `resources/read` e chamadas reais. Os docs são os de
`SbD-ToE-Manual/manuals_src/docs/sbd-toe/020-assets/mcp/` no commit `4e04c6c2`.

**Como ler:**
- **[estável]** é contrato da superfície: pode ir para a prosa sem data.
- **[detalhe]** é dado do bundle ou pormenor de implementação. Se entrar na prosa, deve aparecer como exemplo, nunca como promessa.
- **Δ 0.21.2** marca o que muda com a próxima release. As frases propostas já estão escritas para depois dela, porque é quando os docs vão ser lidos.
- Nenhuma frase proposta traz número de versão.

**Linhas.** Quatro referências do pedido não batem com a fonte PT actual. Corrijo-as assim:

| referência do pedido | linha real hoje |
|---|---|
| 05:87 | 05:111 |
| 07-04:120 | 07-04:100 |
| 01:159 | 01:182 |
| 06:125 | 06:85 |

A frase de 05:239-241 não está no doc: está na descrição servida de `get_threat_landscape`, cuja secção é 05:235-262. Ver o ponto 8.

---

## 1. O que cada nível de `detail` põe inline

**05:317 e 07-02:106** [estável], proposta:
> Os três níveis servem o mesmo conjunto de ids citáveis e o mesmo requisito completo. Cada requisito vem como um objecto único com `id`, `name`, `type`, `description`, `verify` e `evidence`, e a descrição nunca é cortada em nenhum nível. Muda o que vem *inline* e o que vem por referência:
> - **`lista`** traz inline os requisitos, os controlos e as entidades do grafo agrupadas por *slice*, o bloco `citations`, as instruções de geração e o *template* de `security_rationale`. Por referência vêm o `manual_grounding` (contagens por grupo e `entries_ref` para `full`), as relações (`relations_summary`, com a contabilidade exacta) e o *trace* de activação (só com `debug: true`). A `adjacency` vem em resumo, com `detail_ref`.
> - **`standard`** é o mesmo que `lista`, mais o detalhe da `adjacency` inline, com todos os sinais.
> - **`full`** é o nível por omissão. Traz o mesmo que `standard`, mais o `manual_grounding` verbatim, o `activation_trace` e uma `relations_ref` executável em `trace_sbd_toe_graph`. Com `include_relations: true`, as relações vêm inline.

**05:317, segunda metade, Δ 0.21.2** [estável], proposta:
> `lista` e `standard` prometem caber num envelope de tokens (≈8 450 e ≈9 200), medido sobre o *payload* que o cliente recebe. Acima dele, a resposta é `needs_decomposition` com lotes medidos que, juntos, cobrem a seleção inteira. `full` não tem envelope e declara o preço em `size_estimate`.
- **0.21.1** usa tectos por contagem, com 52 requisitos em `lista` e 55 em `standard`. Com a 0.21.2 essa regra desaparece.
- A frase actual em 05:317 («tecto por contagem de requisitos») só é verdade na 0.21.1.
- **Pelo mesmo motivo, mudam também:** 05:311, 07-02:52, 07-02:88, 08:177 e 10:158, que dizem «tecto» ou «acima do tecto». A formulação que serve as duas versões é «acima do que o nível promete caber».

**Exemplo medido** [detalhe]: auth+logging, L2, jwt. Em `lista` mede 5 808 tk, em `standard` 6 247 tk e em `full` 10 860 tk.

## 2. Propósito e modo das tools em aberto

A resposta de três tools nomeia a leitura que fez, num campo `reading.id` [estável]. As outras duas e `read_sbd_toe_resource` não trazem modo.

- **01:66 e 05:68-70, `explain_sbd_toe_topic`** [estável]:
  > Leitura CONSULT: «o que é que o manual diz sobre X», sem tarefa e sem projecto. Pergunta-se por conceito (`concern`) ou por estrutura (`category` ou `chapter`). A resposta percorre os requisitos (com `applies_at`), a orientação (práticas), a prova, as ameaças, os anti-padrões («o que NÃO fazer») e o lugar no ciclo de vida, distinguindo requisito de orientação e marcando a proveniência. `risk_level` é opcional e só anota: não filtra, e a resposta é a mesma sem ele. É paginada sobre os requisitos.
- **01:83 e 05:377-379, `get_sbd_toe_chapter_capability`** [estável]:
  > Leitura IMPL: para implementar o capítulo N, que capacidade é precisa, como se sabe que existe e como se mede. Devolve os KPIs que o manual define para o capítulo, com `thresholds_by_level` (L1/L2/L3) como dados, e os artefactos que a capacidade deve produzir. Alcança-se por `chapter`, `metric_id` ou `dimension`. `risk_level` acrescenta `target_at_level`, e sem `chapter` devolve todos os KPIs publicados. Fecha o ciclo com `assess_sbd_toe_implementation`. Não é a leitura GUIDE: essa é `select_sbd_toe_requirements`.
- **01:81 e 05:428, `get_sbd_toe_macro_processes`** [estável]:
  > Leitura PROGRAMA: por onde começar e em que sequência. Sem argumentos, devolve a ordem de adopção publicada, derivada só das arestas de dependência, os cinco macro-processos e os pré-requisitos. Com `mp_id` (ex.: `MP-01`), devolve um macro-processo em detalhe: pergunta, continuidade, invariante, dono, participantes, percurso de capítulos, indicadores, pontos de controlo, evidência esperada e proporcionalidade L1–L3. Declara os seus limites: não há entidade «programa», a travessia MP↔fase do SDLC é uma lacuna publicada, e `traverses_bundles` é um percurso, não uma relação de pertença.
  - [detalhe] A contagem «cinco» e os ids `MP-01..05` são dados do bundle.
- **01:92 e 05:444, `trace_sbd_toe_graph`** [estável]:
  > Travessia multi-salto, curada, sobre o grafo de relações da AppSec Core (slices, objectivos de controlo, mecanismos, práticas), para perguntas de rastreabilidade que as tools de alto nível não expõem. Escolhe-se uma lente com `lens`:
  > - `slice_implementation`: slice → objectivos → mecanismos e práticas;
  > - `objective_realization`: objectivo → mecanismos e práticas;
  > - `mechanism_provenance`: mecanismo ou prática → objectivos → slices.
  >
  > `anchor` restringe a travessia a uma entidade. A travessia é determinística e paginada (`page`, `pageSize` até 200, `total` e `cursor`), e nunca trunca em silêncio. É o destino das `relations_ref` do prepare.
- **01:91 e 05:444, `trace_sbd_toe_requirement_sources`** [estável]:
  > Diz de onde vem cada requisito. As fontes directas (`source_anchors`, o marcador «Fontes» do próprio manual) vêm separadas da cadeia compensada REQ→CTRL→ACO→fontes, que tem tipo e confiança por salto. Essa cadeia leva o rótulo `coverage_compensated`: é cobertura por correspondência entre modelos, não autoria, e `related` não cobre. Aceita 1 a 50 `requirement_ids` e é paginada. `include_chains: false` devolve só contagens e referência. Requisitos sem fonte declarada e ids desconhecidos são declarados.
- **01:90 e 05:436, `read_sbd_toe_resource`** [estável]:
  > Espelho de `resources/read` para clientes sem suporte a *resources* MCP, como o Claude Desktop. Devolve qualquer resource por URI, incluindo os que têm *template*, com o valor já na URI (ex.: `sbd://toe/notes/prepare.repeat_call_hint`). `slot` devolve um só slot de um recurso JSON com slots (`codegen-instructions`). `char_offset` e `char_limit` paginam o texto. Uma URI desconhecida devolve um erro declarado com a lista válida.
  - **Modo:** nenhum. É infraestrutura de leitura, e na tabela de 01 fica bem com «—».

## 3. `get_sbd_toe_playbook` (parâmetros) e `select_sbd_toe_requirements` (forma da resposta)

**05:424-426, `get_sbd_toe_playbook`** [estável]:
> Todos os parâmetros são opcionais:
> - Sem argumentos, devolve o índice.
> - `framework`, por código (`DORA`, `NIS2`, `CRA`, `RGPD`, `AI-ACT`, `ENISA-CSA`) ou id (`EXT-DORA`…), devolve os playbooks desse diploma.
> - `playbook_id`, um id vindo do índice (ex.: `OVR-DORA-playbook`), devolve as secções paginadas.
> - `kind` filtra o índice por tipo: `normative_cross_check`, `implementation_playbook`, `convergence_note`, `illustrative_example` ou `illustrative_index`.
> - `offset` e `limit` (por omissão 10) paginam as secções.
>
> Os exemplos ilustrativos vêm numa banda separada, e um diploma sem cross-check publicado devolve `no_cross_check`. O índice traz `delimitation`, `scope`, `normative_playbooks`, `illustrative_examples`, `covered_frameworks`, `roadmap_declared_by_manual` e `coverage`.
- [detalhe] O total de 450 secções publicadas é um dado do bundle.

**05:26-37, forma da resposta de `select_sbd_toe_requirements`** [estável nos blocos de topo, detalhe dentro deles]:
> A resposta traz:
> - `selection`, com `selected[]`, `narrowed_out` e `excluded_by_level`. Cada entrada de `selected[]` traz `requirement_id`, `name`, `category`, `type`, `source_chapter` e `selection_trace[]`, com a camada, a fonte, o gatilho e o `basis` (`declared` ou `lexical`).
> - `context`, com os capítulos e as categorias activados.
> - `out_of_scope_chapters`, com o que nenhuma declaração activou, por capítulo e contagem, e o caminho para o trazer.
> - `task`, registado como `recorded_context`, com `affects_selection: false`.
> - `basis_summary`, `coverage` (total, página, `nextOffset`, e as contagens de `narrowed_out` e `excluded_by_level`), `denominators` (os denominadores nomeados) e `cross_surface_check` (a concordância com `consult_security_requirements` na parte comparável).
> - `overlay`, `activation_trace`, `provenance` e `next`.
>
> `selected` é paginado por ordem de id, não por relevância: para chegar a uma categoria, declara-se o concern que a activa, ou pede-se por estrutura (`categories`). Sem declaração, a resposta é `needs_input`.
>
> O `select` tem o mesmo eixo `detail` que o prepare:
> - `full`, o nível por omissão, traz o `selection_trace` completo em cada item.
> - `standard` move as justificações distintas para `selection_trace_legend`, e cada item referencia-as em `trace`.
> - `lista` é o mesmo que `standard`, sem os campos deriváveis `type` e `source_chapter`.
- **Δ 0.21.2** [detalhe]: a linha de `next` que aponta para o prepare passa a anunciar o custo como estimativa, pela média por categoria, e já não fala de tecto. Não bloqueia nada.

## 4. Conteúdo e MIME dos resources

**06:32** [estável]: a frase actual está certa. A tabela de MIME abaixo é a que `resources/list` publica e serve para completar 01:104-113 e 06.

| resource | MIME |
|---|---|
| `sbd://toe/model` | `application/json` |
| `sbd://toe/notes` · `sbd://toe/notes/{id}` | `application/json` |
| `sbd://toe/codegen-instructions/{mode}` | `application/json` |
| `sbd://toe/quick-start` | `application/json` |
| `sbd://toe/activation-vocabulary` | `application/json` |
| `sbd://toe/index-compact` | `application/json` |
| `sbd://toe/chapter-applicability/{riskLevel}` | `application/json` |
| `sbd://toe/version` | `application/json` |
| `sbd://toe/ontology` | `application/yaml` |
| `sbd://toe/agent-guide` · `sbd://toe/grounded-codegen-guide` | `text/markdown` |
| `sbd://toe/skill/{role}` · `sbd://toe/subagent/{role}` | `text/markdown` |

- **01:112 e 06:114, `sbd://toe/model`** [estável]:
  > O mapa do conhecimento servido, não a lista de tools. Traz as entidades com as contagens reais, as relações com as cardinalidades reais, e os capítulos e as categorias com a forma de os alcançar. Mostra as três formas de pedir: por conceito (o atalho `concerns`), por estrutura (`chapters`/`categories`, sempre possível) e por navegação (o grafo), com quando usar cada uma. Tudo é derivado do bundle servido; nada enumerável é escrito à mão. Ler quando o atalho de `concerns` não tiver a pergunta. Blocos: `how_to_ask`, `entities`, `relations`, `chapters`, `categories` e `see_also`.
- **01:110-111 e 06:109-112, `sbd://toe/notes`** [estável]:
  > O registo das notas por referência. As respostas do prepare trazem um `note_id` em vez de repetirem a prosa, mais um cabeçalho `notes`. `sbd://toe/notes` devolve o índice `{ids, notes}`, com todos os ids e textos. `sbd://toe/notes/{id}` devolve `{id, text}`. Um id desconhecido devolve um erro declarado com os ids válidos.
- **01:113 e 06:114, `sbd://toe/codegen-instructions/{mode}`** [estável]:
  > A cópia de referência, por modo (`codegen`, `review`, `test-plan`), do texto estático do prepare. Contém os slots de `llm_codegen_instructions`, com as regras de montagem, e o esqueleto de `security_rationale_template`. Montados pelas regras embutidas, dão o mesmo texto que o prepare põe inline. Contém ainda a legenda `detail_encoding`, que explica como ler um *payload* `lista`/`standard`. As instruções e o *template* vêm inline em todos os níveis: este resource é a referência, não uma dependência. Com `read_sbd_toe_resource`, `slot` devolve um só slot.

## 5. O que substituiu `minimal` e `ultrathin`, e como dizê-lo

**10:194-198** [estável], proposta:
> Os dois níveis foram retirados, cada um por uma razão:
> - `minimal` passou a chamar-se `lista`. Herdou o mesmo envelope de tokens e passou a trazer inline, por requisito, a descrição, `verify` e `evidence`.
> - `ultrathin` foi retirado de vez. Existia para cortar a descrição publicada, e a descrição deixou de ser negociável: não sai de nenhum nível.
>
> Quem vem de docs antigos usa `lista` em qualquer dos dois casos. O erro devolvido pelo servidor diz isto mesmo, e diz para onde cada um foi.
- **10:198** diz «está na descrição servida». Pode ficar, ou ser trocado pela frase do ponto 1.
- [detalhe] O texto do erro traz um número de versão. É do servidor, não precisa de ir para o doc.
- **Mesmo eixo noutras tools** [estável]: `get_threat_landscape` e `select` também aceitam `lista`/`standard`/`full`, e também recusam `minimal` com o mesmo aviso.

## 6. `chapters[]` do chapter-applicability, a saída de `plan_sbd_toe_repo_governance` e os valores de `exposure`

**06:62, um objecto de `chapters[]`** [estável na forma; os valores são detalhe]:
> Cada capítulo traz `chapter_id`, `title` e `applicable`, que é sempre `true`: nenhum capítulo é excluído. Traz também:
> - `demand`: as contagens `obrigatorio`, `recomendado`, `opcional` e `specific` nesse nível;
> - `dominant`: o perfil dominante do capítulo;
> - `roles` e `user_stories`: contagens;
> - `source`: de onde vem a linha. Um capítulo fundacional sem *assignments* no bundle declara um *fallback*.
>
> O objecto de topo traz `riskLevel`, `semantics`, `canonical_anchor` e `chapters`.
- Exemplo real [detalhe]:
  `{"chapter_id":"00-fundamentos","title":"Fundamentos SbD-ToE","applicable":true,"demand":{"obrigatorio":0,"recomendado":0,"opcional":0,"specific":0},"dominant":"foundational","roles":0,"user_stories":0,"source":"declared fallback: …"}`
- [detalhe] São 15 capítulos.

**05:269 e 07-04:28-35, saída de `plan_sbd_toe_repo_governance`** [estável]:
> A resposta traz:
> - `riskLevel` e `risk_level_effect`, que é `{filters, basis, note, asserts}` e diz quanto o nível filtra, e porquê;
> - `totalArtefacts`, o número de linhas capítulo↔artefacto;
> - `artefact_totals`, com `distinct_count` (artefactos distintos) e `chapter_relation_count` (linhas). Nunca se somam linhas para contar artefactos;
> - `byChapter[]`, em que cada entrada é `{chapterId, artefacts[]}` e cada artefacto é `{artefactId, chapterId, riskLevels[]}`, com ids na forma `ART-<slug>-<hash>`;
> - `coverage`, que pagina sobre os capítulos, mais `size_estimate`, `note` e `next`.
>
> A relação capítulo↔artefacto é uma projecção: não diz quem possui o artefacto nem obriga a produzi-lo.

**05:81, 05:299, 04:80 e 02:79, valores de `exposure`** [estável nos quatro valores; as activações são detalhe]:
> `exposure` aceita quatro valores:
> - `local`: é válido e inerte, não activa nada. Declarado sozinho, dá `needs_input`, nunca uma seleção vazia em silêncio.
> - `internal` e `authenticated`: activam `auth` e `logging`.
> - `public`: activa `auth`, `logging`, `api`, `validation` e `architecture`.
>
> A fonte é `sbd://toe/activation-vocabulary`.

## 7. Os lotes 48 + 23 = 71 para uma seleção de 70: sobrepõem-se?

**Sim.** Verifiquei o exemplo de 07-02:36-52 (auth+logging, L2, jwt e `exposure: public`, em `lista`). Na 0.21.1, os lotes são de 48 e 23 requisitos, somam 71, e a união dá exactamente os 70. A diferença é SES-008, que vem nos dois lotes. `technologies` é preservado literalmente em cada lote, e `jwt` traz SES-008 por regra nomeada, fora das categorias do lote. «Cuja união é a seleção inteira» é verdade. «Divide em» sugeriria uma partição, e é falso.

**07-02:52** [estável na regra; os números são detalhe], proposta:
> Declarar também `"exposure": "public"` alarga a seleção para 70 requisitos, mais do que o nível `lista` promete caber. A resposta passa a `needs_decomposition`, com lotes executáveis cuja união é a seleção inteira. Os lotes podem partilhar requisitos: o que as `technologies` preservadas trazem por si (aqui, SES-008 por `jwt`) vem em todos. Por isso a soma das contagens pode passar do total.

- **Δ 0.21.2:** os lotes deste exemplo mudam para 54 + 17 em `lista` (63 + 8 em `standard`), com SES-008 ainda nos dois. Recomendo não pôr os tamanhos dos lotes na prosa.
- **Pelo mesmo motivo, precisam de nota:** 05:311, 07-02:88, 08:177 e 10:158, onde a mesma afirmação aparece com «cuja união».

## 8. «A página 1 é a parte relevante»

A frase não está nos docs. É o fim da descrição servida de `get_threat_landscape` («page 1 IS the relevant part»), cuja secção é 05:235-262. Proposta para essa secção [estável]:
> As ameaças vêm ordenadas por pertença ao âmbito declarado. Primeiro vêm os capítulos de domínio dos concerns declarados. Os capítulos 01 e 02, com as meta-ameaças de processo, vêm no fim. Dentro de cada grupo, a ordem é por `mitigation_confidence`, capítulo e id. Por isso, a primeira página é a parte relevante, e as seguintes acrescentam o geral. `limit` é 25 por omissão; `coverage` e `size_estimate` vêm sempre.

**05:~241, o aviso «Limitação de *routing* conhecida»** fica desactualizado com esta ordem. Proposta [estável na regra; a lista é detalhe]:
> Os 24 concerns são aceites, mas só 11 têm capítulo de ameaças próprio: `architecture`, `build`, `deployment`, `distribution`, `iac`, `logging`, `monitoring`, `release`, `supply_chain`, `testing` e `threat_modeling`. Para os outros, as ameaças chegam pelos capítulos que definem os controlos activados, e `routing_basis` diz qual. Um concern que não tem rota vai para `unsupported_concerns`.
- A frase «Fix em curso no servidor» deve sair.

---

## Verificações pedidas

- **05:111, «hoje `count: 0`»** [detalhe]: verdade. `coverage_gaps.requirements_without_control_link.count` é 0 em L1, L2 e L3 sobre o bundle pinado. Proposta sem «hoje»:
  > O campo vem sempre. Com o conhecimento servido actual, `count` é 0 nos três níveis. Se aparecer um requisito sem ligação a controlos, é listado aqui como lacuna declarada, não como ausência de obrigação.
  - **Nota para o MCP, não para o doc:** a `note` servida diz «0 of 123 active requirements have no … (link layer … not refreshed)». Com 0, a nota contradiz-se. Fica registado como defeito do servidor.
- **07-03:18, «`derived` vs `heuristic`»** [detalhe]: nas 699 linhas de ameaça de L1 a L3 (todas as páginas), `mitigation_confidence` é sempre `derived`. `heuristic` não aparece. Proposta:
  > …com a confiança de cada ligação marcada em `mitigation_confidence`. Hoje, todas as ligações servidas são `derived`, estruturais. Se aparecer outro valor, a ligação é inferida e rotula-se como tal.
  - Coerente com 05:260 e 09:118, que já o dizem.
- **07-04:100, «se subir, alguns artefactos extra ficam a faltar»** [detalhe]: é meio verdade. Os 45 artefactos distintos são os mesmos em L1, L2 e L3. O que muda é a atribuição a capítulos. Em L1, o capítulo 03 (*threat modeling*) não lista artefactos. De L2 para cima lista 29, todos já presentes noutros capítulos em L1. De L2 para L3 nada muda. Contagens: 440 linhas em L1, 469 em L2 e em L3. Proposta:
  > Documentar o *risk level* assumido em cada artefacto. Ao subir de L1 para L2, o capítulo 03 passa a listar os seus artefactos, e a lista por capítulo cresce, mas não aparecem artefactos novos. `risk_level_effect` declara que o nível filtra pouco, por desenho.
- **01:182, lista de casos de uso** [estável]: omite o Agentic SDLC, e `07-casos-uso/07-agentic-sdlc.md` existe. Acrescentar «… *cross-check* normativo, **Agentic SDLC**.»
- **06:85, estados do guia de codegen** [estável]: o doc espelha fielmente o `sbd://toe/grounded-codegen-guide`, que lista só quatro estados. O guia servido está desactualizado, e o doc não está errado face ao servidor. Proposta para o doc:
  > ramificação por *status*: `ready_for_codegen`, `needs_clarification`, `needs_decomposition`, `needs_input` e `unsupported_scope`
  - `needs_input` existe e está nas descrições das tools e em 05:309.

---

## Defeitos do lado do MCP encontrados nesta verificação (não são texto para o Manual)

1. **`sbd://toe/grounded-codegen-guide`** (`prompts/sbd-toe-grounded-codegen.md`):
   - Omite `needs_input`.
   - Para `needs_decomposition` ainda manda «propor 2–4 sub-tarefas a partir de `partial_activation_trace`», e não executar `requirement_ceiling.batches`.
   - Continua assim no branch da 0.21.2. **Correcção ao meu relatório da 0.21.2:** eu disse que o guia do agente estava alinhado, mas só alinhei o texto do prompt de *setup*. Este guia não mudou.
2. **Descrição de `sbd://toe/codegen-instructions/{mode}`:** fala em «detail=standard/minimal». O `line_note` do conteúdo diz «Nesta linha 0.20».
3. **`coverage_gaps` do consult:** a `note` fala em «not refreshed» com `count: 0`.
4. **README:115:** «Task is bite-size (… ≤3 slice families)» descreve o gate antigo.

Proponho corrigir os quatro no branch da 0.21.2 antes do PR do re-pino. É texto servido, não comportamento. Decisão do lead.
