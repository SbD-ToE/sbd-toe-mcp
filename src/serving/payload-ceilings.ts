/**
 * payload-ceilings — os ENVELOPES de lista/standard, e só eles (0.21.2, decisão 0004
 * agentic/decisions/0004-tectos-por-custo-medido.md; lead 2026-09-26).
 *
 * História: 0.19.4 tectos por contagem derivados de uma recta (N = (envelope − base) /
 * custo_por_req); 0.21 §5 re-derivou-os (83/88) e a decisão (a) de 2026-09-25 ligou 52/55.
 * A medição da 0.21.1 mostrou que o custo por requisito varia nove vezes (67–597 tk) e que
 * há custo que não depende da contagem (overlay, capítulos) — nenhuma recta o descreve.
 *
 * Desde a 0.21.2 o ENVELOPE é a regra: em lista/standard, uma resposta pronta cabe no
 * envelope medido sobre o payload que o cliente recebe (a mesma régua do size_estimate);
 * acima, needs_decomposition com lotes medidos que somam o todo; a única excepção é o lote
 * irredutível (uma categoria), servido pronto e declarado. Retiraram-se
 * REQUIREMENT_CEILING_BY_DETAIL, COST_PER_REQ_TK, BASE_TK, CEILING_FIT e
 * PROPOSED_CEILING_BY_DETAIL — descreviam uma regra que deixou de existir.
 *
 * O envelope NÃO é propriedade do nosso conteúdo — é do CONSUMIDOR (quanto pode custar uma
 * volta ao agente que gera código ao lado). `lista` herda os 8.450 do pedido barato
 * (ratificado 2026-08-31), `standard` mantém os 9.200. `full` não tem envelope: promete
 * não faltar e declara o preço.
 */
export const PAYLOAD_PROMISE_TK: Readonly<Record<string, number>> = {
  lista: 8450, //    herdado do minimal (gate hard ratificado, 3 sims do lead, 2026-08-31)
  standard: 9200 //  ratificado e harmonizado
};
