/**
 * payload-ceilings — 0.21 §5 + DECISÃO DO LEAD (a) 2026-09-25 (adenda ao despacho
 * 2026-09-25-orchestrator-pontifex-despacho-s1-fusao.md; decisão local
 * agentic/decisions/0003-s5-eixo-promessa-e-tectos-re-derivados.md, adenda).
 *
 * TECTOS LIGADOS: lista 52 · standard 55 · full sem tecto — «tectos honestos sobre os
 * envelopes herdados»: os 83/88 ratificados a 2026-09-11 assentavam num custo
 * projectado (81 tk/req) que não se reproduziu (133 medidos); esta é a mesma decisão
 * com o número certo. Envelopes 8.450/9.200 inalterados — são do consumidor.
 *
 * O envelope de tokens NÃO é propriedade do nosso conteúdo — é propriedade do
 * CONSUMIDOR (quanto pode custar uma volta ao agente que gera código ao lado).
 * Por isso o envelope HERDA-SE: `lista` herda os 8.450 do pedido barato
 * (ratificado 2026-08-31, 3 sims do lead), `standard` mantém os 9.200. O
 * `ultrathin` levou consigo os seus 4.840 — esse número era o preço de não ter
 * descrição, e a descrição deixou de ser negociável.
 *
 * O que se re-deriva é o TECTO (N), com a mesma fórmula do 0.19.4:
 *   N = floor((envelope − base) / custo_por_requisito)
 * sobre a projecção medida da forma nova (scripts/measure/s5-form-projection.mjs):
 *   lista    8.450 − 1.713, 81,0 tk/req → 83
 *   standard 9.200 − 2.259, 78,7 tk/req → 88
 *   full     SEM tecto — a promessa é completude (não promete caber, promete
 *            não faltar) e a medição proíbe-lhe uma recta (residuais até
 *            +2.753 tk: o manual_grounding não escala com os requisitos). O
 *            `full` DECLARA o preço em `size_estimate` em vez de o recusar.
 *
 * Os tectos 83/88 são os RATIFICADOS (não se re-derivam outra vez — despacho
 * 2026-09-25). A base e o declive abaixo são a MEDIÇÃO DA FORMA SERVIDA (re-medida
 * pelo mesmo script quando cada fase aterra), porque uma constante que descreva
 * uma forma que o servidor não tem é a mentira que esta casa não comete; o teste
 * payload-ceilings.test.ts diz, em cada fase, se tecto×custo+base ainda cabe.
 *
 * Mesma filosofia do needs_decomposition: acima do tecto o servidor não engole
 * nem degrada — diz o limite e ensina a dividir (ver prepare-codegen-context).
 */
export const PAYLOAD_PROMISE_TK: Readonly<Record<string, number>> = {
  lista: 8450, //    herdado do minimal (gate hard ratificado, 3 sims do lead, 2026-08-31)
  standard: 9200 //  ratificado e harmonizado
};
/**
 * Declive e base MEDIDOS na forma servida — §1 + §3 + §2 (2026-09-25, regressão
 * 27→89 sobre os mesmos casos do §5; scripts/measure/s5-form-projection.mjs). A §3
 * baixou a base dos dieted ~25 tk e o full ~30%; a §2 pôs a adjacência DENTRO da
 * base (resumo ~170 tk em lista; detalhe ~440–610 tk em standard/full). O declive
 * (~133 tk/req) não muda — é o requisito fundido que o faz.
 *
 * ACHADO (para o lead): a projecção do §5 media 81,0 tk/req porque fazia o join
 * verify/evidence a partir do bloco evidence_patterns CAPADO a 25 — só 25
 * requisitos levavam verify/evidence na projecção; a partir de 25 o custo por
 * requisito estava subestimado. Na forma servida cada requisito fundido custa
 * ~88 tk (id+name+type+description ≈ 45, verify+evidence ≈ 43) e o declive
 * marginal, com controlos/entidades/citações, é ~132 tk/req. Os tectos
 * ratificados (83/88) ficam ligados como ordenado; o ajuste é DECLARADO em
 * CEILING_FIT e, em cada payload, em size_estimate.within_envelope.
 */
export const COST_PER_REQ_TK: Readonly<Record<string, number>> = {
  lista: 133,
  standard: 130.2 // o detalhe da adjacência ENCOLHE à medida que mais se declara (608 → 437 tk): declive ligeiramente menor
};
export const BASE_TK: Readonly<Record<string, number>> = {
  lista: 1476,
  standard: 1987
};

/**
 * 0.21 §2 — a DERIVAÇÃO: os tectos que a fórmula dá sobre a forma servida completa e os
 * envelopes herdados. Foi PROPOSTA (não ligada) até 2026-09-25; o lead decidiu (a) e
 * REQUIREMENT_CEILING_BY_DETAIL passou a ser exactamente isto. Fica como derivação
 * viva: se a medição mudar, a divergência com o ligado é o sinal de que há decisão a pedir.
 */
export const PROPOSED_CEILING_BY_DETAIL: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(PAYLOAD_PROMISE_TK).map(([detail, envelope]) => [
    detail,
    Math.floor((envelope - (BASE_TK[detail] ?? 0)) / (COST_PER_REQ_TK[detail] ?? 1))
  ])
);
/**
 * Tectos LIGADOS — decisão do lead (a), 2026-09-25: a fórmula sobre as constantes medidas
 * da forma servida completa (§1+§3+§2): floor((8450−1476)/133)=52, floor((9200−1987)/130,2)=55.
 * Igual a PROPOSED_CEILING_BY_DETAIL por construção (o teste guarda-o): quando a medição
 * mudar, os dois divergem e o teste diz que há decisão a pedir.
 */
export const REQUIREMENT_CEILING_BY_DETAIL: Readonly<Record<string, number>> = {
  lista: 52,
  standard: 55
};
/** Custo projectado de um prepare para `n` requisitos seleccionados, por detail. */
export function projectedCostTk(detail: string, n: number): number | null {
  const base = BASE_TK[detail];
  const cost = COST_PER_REQ_TK[detail];
  return base === undefined || cost === undefined ? null : Math.round(base + cost * n);
}

/**
 * O AJUSTE DECLARADO: para cada nível com tecto, o custo projectado NO tecto ligado
 * contra o envelope herdado, e o tecto que a medição derivaria pela mesma fórmula.
 * Desde a decisão (a) `fits` é true e `measured_ceiling_for_envelope` == `ceiling`;
 * se um dia divergirem, é a verdade servida enquanto o lead não decide de novo.
 */
export interface CeilingFit {
  ceiling: number;
  envelope_tk: number;
  projected_tk_at_ceiling: number;
  fits: boolean;
  measured_ceiling_for_envelope: number;
}
export const CEILING_FIT: Readonly<Record<string, CeilingFit>> = Object.fromEntries(
  Object.entries(REQUIREMENT_CEILING_BY_DETAIL).map(([detail, ceiling]) => {
    const envelope = PAYLOAD_PROMISE_TK[detail] ?? 0;
    const projected = projectedCostTk(detail, ceiling) ?? 0;
    return [
      detail,
      {
        ceiling,
        envelope_tk: envelope,
        projected_tk_at_ceiling: projected,
        fits: projected <= envelope,
        measured_ceiling_for_envelope: Math.floor((envelope - (BASE_TK[detail] ?? 0)) / (COST_PER_REQ_TK[detail] ?? 1))
      }
    ];
  })
);
