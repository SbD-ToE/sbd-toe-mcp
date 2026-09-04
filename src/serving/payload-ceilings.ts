/**
 * payload-ceilings — 0.19.4 («a promessa do minimal», decisão do lead: opção 2).
 *
 * O payload do prepare escala ~linearmente com a selecção (medição 2026-09-04,
 * item 7 da adenda r6 + regressão de 4 pontos por detail): sem travão, a promessa
 * de tokens de cada nível dieted quebrava em silêncio (caso do avaliador: 88 reqs
 * @ minimal ≈ 9,1k tk > promessa 8.450). Tecto por-id DERIVADO da medição:
 * N = floor((promessa − base) / custo_por_req). `full` NÃO tem tecto: a sua
 * promessa é COMPLETUDE (inline byte-identical), não uma classe de tokens — e é
 * o nível do oráculo (Axis H).
 *
 * Mesma filosofia do needs_decomposition: acima do tecto o servidor não engole
 * nem degrada — diz o limite e ensina a dividir (ver prepare-codegen-context).
 */
export const PAYLOAD_PROMISE_TK: Readonly<Record<string, number>> = {
  ultrathin: 4840, // gate hard s3c
  minimal: 8450, //   gate hard ratificado (3 sims do lead, 2026-08-31)
  standard: 9200, //  gate hard ratificado e harmonizado
};
/** Declive medido (tk por requisito seleccionado), regressão 16→88 reqs. */
export const COST_PER_REQ_TK: Readonly<Record<string, number>> = {
  ultrathin: 29,
  minimal: 68,
  standard: 68,
};
/** Base medida (tk com selecção→0, extrapolada da mesma regressão). */
export const BASE_TK: Readonly<Record<string, number>> = {
  ultrathin: 2304,
  minimal: 3114,
  standard: 3632,
};
/** floor((promessa − base)/custo): (4840−2304)/29=86, (8450−3114)/68=78, (9200−3632)/68=81. */
export const REQUIREMENT_CEILING_BY_DETAIL: Readonly<Record<string, number>> = {
  ultrathin: 86,
  minimal: 78,
  standard: 81,
};
/** Custo projectado de um prepare para `n` requisitos seleccionados, por detail. */
export function projectedCostTk(detail: string, n: number): number | null {
  const base = BASE_TK[detail];
  const cost = COST_PER_REQ_TK[detail];
  return base === undefined || cost === undefined ? null : base + cost * n;
}
