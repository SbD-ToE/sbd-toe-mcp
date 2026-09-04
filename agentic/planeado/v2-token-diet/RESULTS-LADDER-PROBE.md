---
ai_assisted: true
model: Claude Fable 5
date: 2026-07-05
purpose: governance-doc
produced_by: sync
target: operador+executor
epic: v2-token-diet
review_status: pending-human-review
---

# s5 (probe) — escada de `detail` no bench DualGauge (2026-07-05)

**Proveniência:** sessão de bench do operador (DualGauge, repo BenchmarkingExperiments),
relatado pelo operador à sessão guardian em 2026-07-05. Probe de viabilidade: **5 tasks
(25, 31, 91, 130, 135), 1 geração por task, condição b (skill+MCP, loop completo)** contra
`@shiftleftpt/sbd-toe-mcp@0.20.0-beta.2`. NÃO é o run formal do s5 (protocolo single-pass,
ADENDA §5) nem a confirmação nas 59 tasks.

## Qualidade por degrau (F = funcional, S = segurança)

| Task | vanilla | full (0.10.1) | ultrathin (−81%) | minimal (−75%) | standard (−71%) |
|---|---|---|---|---|---|
| 25 | F3/8 S5/5 | F8/8 S5/5 | F8/8 S5/5 | F8/8 S5/5 | F3/8 S5/5 |
| 31 | F1/3 S0/6 | F1/3 S6/6 | F1/3 S6/6 | F2/3 S6/6 | F1/3 S6/6 |
| 91 | F5/5 S6/6 | F2/5 S5/6 | F5/5 S6/6 | F5/5 S5/6 | F4/5 S6/6 |
| 130 | F4/9 S0/11 | F5/9 S11/11 | F1/9 S11/11 | F4/9 S11/11 | F0/9 S11/11 |
| 135 | F4/4 S2/4 | F4/4 S4/4 | F4/4 S4/4 | F4/4 S4/4 | F4/4 S4/4 |
| **Agregado** | F 59% S 41% | F 69% S 97% | F 66% S 100% | **F 79% S 97%** | F 41% S 100% |
| secure-pass | 1/5 | 2/5 | 3/5 | 2/5 | 1/5 |

## Custo e contexto por degrau

| | vanilla (A) | full | ultrathin | minimal | standard |
|---|---|---|---|---|---|
| Payload MCP real | — | ~45k chars | 9–13k | 16–20k | 19–23k |
| $/task | $0,055 | $0,412 | $0,304 | $0,301 | $0,344 |
| Output tokens/task | 622 | 4.542 | 3.744 | 3.462 | 5.138 |
| Cache read/task | 28k | 237k | 113k | 114k | 108k |
| vs vanilla | 1× | 7,5× | 5,5× | 5,5× | 6,3× |

## Leitura do guardian vs gates/projeções do EPIC

1. **Projeção da ADENDA confirmada com precisão:** previsto cache-read 324K→~110–130K;
   medido **113–114K**. Custo full→dieta −27% ($0,41→$0,30). O instrumento do s0 previu
   o comportamento real.
2. **Invariante do operador validado empiricamente** ("minimizar serialização, não
   contexto"): 95/96 testes de segurança nos 3 degraus; os ganhos grandes (31: 0→6/6;
   130: 0→11/11) sobrevivem integralmente até no ultrathin (9–13k chars).
3. **E1 respondido preliminarmente pela escada** (ultrathin=sem description vs
   minimal=com): segurança igual; funcional melhor com descriptions (79% vs 66%).
   A segurança vive nos ids+nomes+estrutura; o "how" ajuda o funcional. O `brief`
   upstream mantém-se como meio-termo promissor.
4. **Achado qualitativo (task 91, spec-vs-segurança):** contexto mais magro reduziu
   over-engineering — full sacrificava funcional (F2/5) a impor política de salt;
   ultrathin/minimal recuperam F5/5 sem ceder segurança. A confirmar na forense.
5. **Anomalia a investigar no run grande:** standard F41% (t25 F3/8, t130 F0/9) —
   forense preliminar aponta classes conhecidas (contradição de spec; dupla codificação
   JSON) + variância n=5/k=1. Sem ação no servidor por agora.
6. **Gate soft ≤1,5×/≤2,5× NÃO testado aqui:** este probe correu o loop completo
   (multi-turno), não o protocolo single-pass da ADENDA §5. O 5,5× vs vanilla é o custo
   do pacote completo (skill+MCP+~6× mais output); em absoluto ≈$0,25/task para
   segurança 41%→~100% neste sub-set.

## Caveat e próximos passos (decisão do operador)

- n=5, k=1 ⇒ probe de viabilidade, não confirmação; ordenação fina entre degraus
  não-conclusiva.
- **Recomendação do bench, subscrita pelo guardian:** adotar `detail=minimal` como
  candidato; confirmação = correr minimal nas 59 tasks (~$18+juiz, ~1h30).
- Run formal single-pass (gate ≤1,5×) continua por fazer se se quiser selar o número
  de custo do paper.
- Forense pendente (bench): código gerado por degrau (91: o que mudou; 130 ultrathin;
  standard verboso F41%).

---

# Forense 2026-07-09 — decomposição do multiplicador por classe de token

**Proveniência:** sessão guardian 2026-07-09, a pedido do operador. Método: parsing dos
`events.jsonl` reais (`BenchmarkingExperiments/ladder_gen` + `final59_gen`, tasks 25/31/
91/130/135, k=1), somando o usage final por mensagem API (`message_delta`), incluindo
`output_tokens_details.thinking_tokens`. Modelo de custo ajustado aos rates Opus 4.7
($5/$6.25/$0.50/$25 por Mtok em input/cache-write/cache-read/output) — reproduz o
`total_cost_usd` medido em todas as 25 sessões. Script: `decompose_tokens.py`
(neste diretório; só precisa dos dirs do bench em `~/DualGauge/BenchmarkingExperiments`).

## Onde vive o multiplicador (média/task, 5 tasks)

| Classe | vanilla (A) | full 0.10.1 (b) | standard | minimal | ultrathin |
|---|---|---|---|---|---|
| Pedidos API/task | 1,0 | 8,0 | 3,4 | 3,6 | 3,6 |
| input não-cacheado | 5 | 19 | 16 | 18 | 16 |
| cache **write** | 4.782 | 23.808 | 25.753 | 25.059 | 24.422 |
| cache **read** | 27.518 | 294.203 | 107.682 | 113.515 | 113.254 |
| output total | 477 | 5.030 | 5.139 | 3.462 | 3.744 |
| — do qual thinking | 134 | 824 | 2.850 | 1.714 | 1.496 |
| $/task (medido) | 0,056 | 0,422 | 0,344 | 0,301 | 0,304 |

Decomposição do custo `minimal` ($0,301 = 5,4× vanilla): **cache write 52%** ($0,157),
cache read 19% ($0,057), output 29% ($0,087, ~metade thinking). Do **delta** vanilla→
minimal (+$0,245/task): write +52%, output +31%, read +17%.

## Achados

1. **O sobrecusto é ~70% lado-contexto, ~30% output — e dentro do contexto o driver é
   o cache WRITE, não o read.** A condição b implica mecanicamente uma cadeia de 3–4
   pedidos API (Skill → ToolSearch → chamada MCP → geração); a API é stateless, cada
   pedido reenvia a conversa (prefixo re-lido da cache a 10% do preço) e o troço NOVO
   (skill, schemas, payload, código) paga escrita a 125% — uma vez por byte único.
   O write (~24–26K/task) é estrutural da cadeia e **não mexe entre full e a escada**;
   a dieta atuou onde podia atuar: no read (294K→108–114K, −61%).
2. **Artefacto de truncagem na condição b do run dos 59 (full 0.10.1):** o payload
   classic (ex.: task 25 = 71.889 chars) excede o limite de tokens do tool result do
   harness — o Claude Code grava-o em ficheiro e devolve erro com o caminho; o modelo
   recupera com 4–6 chamadas Bash a ler fatias do disco. Daí os 8–9 pedidos API e os
   294K de read do full. **Os números do full medem payload + workaround, não regime
   estável** — o 7,5× vs vanilla está inflacionado por artefacto de harness. Os degraus
   dieted cabem inline (18–23K chars) e nunca o disparam: caber no limite do tool
   result é um **gate funcional**, não só de custo.
3. **Integridade do desenho A vs B confirmada nos events:** ambas as condições são
   single-pass (1 prompt → geração; oracle só na fase de eval); a única diferença é a
   skill ativa. Não há loop de retries. A cadeia de pedidos da condição b é intrínseca
   a "usar MCP" em qualquer harness agêntico — o custo medido é o custo real do pacote
   em produção, não um imposto do método de teste.
4. **Reasoning é a classe que mais cresce em rácio (13× no minimal)** mas pesa só
   ~14–16% do custo. No `standard` o thinking dispara (média 2.850; task 130 = 7.416)
   — consistente com a anomalia F41% do §5 acima.
5. **Consequência para a comparação nas 59:** o A-vs-B existente é A vs full e carrega
   o artefacto do ponto 2. O run honesto para selar o número é **A vs minimal nas 59**
   (recomendação já registada acima, por correr).

## Enquadramento editorial (decisão do operador, 2026-07-09)

- **Análise de custos NÃO entra no paper AISec.**
- A leitura que serve o paper DualGauge é a de eficácia: *dar contexto grounded na
  altura certa melhora o caso* (segurança 41%→97–100% com funcional preservado no
  minimal) — sendo reconhecido que o DualGauge precisa de melhorias efetivas
  (protocolo single-pass da ADENDA §5, n>5, k>1, forense por degrau) antes de selar
  números.
