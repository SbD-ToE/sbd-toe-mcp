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

# Backlog de ablação — braço experimental D-c (pós-s5)

**Contexto:** a ADENDA §5 do [EPIC](EPIC.md) fixou o protocolo do run limpo
(s5 = D-a vanilla + D-b single-pass). O braço iterativo/experimental ficou
reservado para um D-c futuro. Este documento regista as experiências pedidas
pelo operador (2026-07-05, sessão guardian do epic) para esse braço — **depois**
do run limpo do s5, nunca em vez dele.

## E1 — Ablação do "how": `id+nome` vs `id+nome+descrição`

**Pergunta:** quanto vale o campo `description` (a alavanca de qualidade do s3)
na segurança do código gerado?

- Braço A: payload `detail=standard` com requirements só `{requirement_id, name}`.
- Braço B: payload `detail=standard` atual (`{requirement_id, name, description}`,
  description verbatim do bundle).
- Métrica: delta de segurança do DualGauge + fidelidade de citações VAL-xxx,
  mesmo protocolo single-pass do s5.
- Nota: o braço A exige um flag experimental no bench/servidor (não faz parte
  do contrato `detail`; não criar nível novo sem decisão do operador).

## E2 — Língua: PT vs EN nas descriptions

**Pergunta:** a língua do conteúdo publicado afeta custo e/ou qualidade?
Três eixos independentes:

1. **Compreensão/geração** — transferência PT→código (esperado: efeito menor;
   vigiar terminologia em comentários/identifiers gerados).
2. **Custo de tokens** — BPE penaliza PT (~15–25% típico vs EN). Medir com
   tokenizer real (não chars/4) sobre as 251 descriptions do bundle antes de
   decidir se vale o pedido upstream.
3. **Juiz do bench** — fixar a língua da instrução do DualGauge para isolar
   enviesamento do árbitro (gpt-5-nano) relativamente à língua do rationale.

**Restrição dura:** este repo NUNCA traduz/parafraseia conteúdo publicado
(seria knowledge-builder logic — proibido; ver PROGRAMME-PRESERVATION-PROTOCOL
e a regra "verbatim" do epic). Uma `description_en` só existe como campo
publicado do bundle upstream.

## Pacote de pedidos ao KG upstream (juntar num só pedido)

| Pedido | Origem | Estado |
|---|---|---|
| Campo `brief` por requirement (cadeia id → brief → prosa) | decisão do operador no s3b revisto | a formular |
| Corrigir arestas órfãs `ACM-SLG-005`/`ACM-SLG-006` (relations.jsonl referencia ids ausentes de mechanisms.json, bundle v1.5.0) | achado do s2, verificado pelo guardian | a reportar |
| `description_en` (bundle bilingue) | E2 | condicional aos resultados do E2/custo medido |

## Ordem

1. s5 (run limpo) — decide se o payload atual chega.
2. E1/E2 no D-c — só se o s5 deixar a pergunta aberta ou o operador quiser
   quantificar as alavancas individualmente.
3. Pedido upstream consolidado com os dados dos pontos anteriores.
