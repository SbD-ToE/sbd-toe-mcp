/**
 * behaviour-notes — as frases que descrevem COMPORTAMENTO, num sítio só.
 *
 * 0.20.0-beta.31. A beta.25 gerou o agent-guide; as notas das RESPOSTAS ficaram como «o
 * último texto escrito à mão do sistema» — e é onde estavam as contradições. Prova: o
 * `meta.note` do mapa de ameaças descrevia a ordenação da beta.26 («por
 * mitigation_confidence… não presumas que as primeiras são as mais relevantes») DUAS
 * versões depois de a beta.29 ter posto a página 1 a ser precisamente a mais relevante —
 * dando o conselho OPOSTO ao correcto, enquanto a descrição da tool dizia a verdade.
 *
 * A regra desta linha aplicada às bordas: **o que descreve comportamento tem de vir da
 * mesma fonte que o comportamento**. A descrição da tool e a nota da resposta passam a ler
 * daqui, e `behaviour-notes.test.ts` guarda que não divergem — a mesma família da guarda do
 * guia derivado e da invariante next-verbatim.
 */

/** Ordenação das ameaças (beta.29: por PERTENÇA ao âmbito declarado). */
export const THREAT_ORDERING =
  "ORDER by MEMBERSHIP of the declared scope (domain chapters first, chapters 01/02 last; then mitigation_confidence, chapter, id) — page 1 IS the relevant part."; // 0.21 §6-d: uma língua, e curta o bastante para viver verbatim numa descrição ≤600

/** Paginação da selecção (por id, nunca relevância). */
export const SELECT_PAGINATION =
  "`selected` is paginated by ID ORDER (ACC first, VAL last), NOT by relevance: to reach one category, declare the concern that activates it or ask by structure (`categories=[…]`) instead of paging to it.";

/** Todas as frases de comportamento publicadas, para a guarda as varrer. */
export const BEHAVIOUR_NOTES: ReadonlyArray<{ id: string; text: string; tool: string }> = [
  { id: "threat_ordering", text: THREAT_ORDERING, tool: "get_threat_landscape" },
  { id: "select_pagination", text: SELECT_PAGINATION, tool: "select_sbd_toe_requirements" },
];
