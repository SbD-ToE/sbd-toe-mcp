/**
 * 0.20.0-beta.39 — O `next` TEM DE LER AS BANDAS DA RESPOSTA QUE O TRANSPORTA.
 *
 * PORQUE EXISTE. `get_guide_by_role(role="fornecedores-terceiros")` devolvia a banda
 * `unsupported_role` com o aviso «não geres um subagente com base neste vazio» e, **na
 * mesma resposta**, um `next` a oferecer `generate_sbd_toe_skill(role=…, format=subagent)`.
 * A banda foi corrigida na b.30; o `next` é gerado por outro caminho e nunca a leu. **Num
 * cliente agêntico é o `next` que é seguido, não a nota.**
 *
 * É dívida ESTRUTURAL, não uma instância: cada banda de silêncio nova — e a b.39 acrescenta
 * três — herdaria o mesmo defeito. Por isso a reconciliação corre no ÚNICO ponto por onde
 * todas as respostas passam (`sendResponse`), e não em cada tool: uma tool nova entra
 * sozinha, como no varrimento de inventário vivo da b.36.
 *
 * COMO DECIDE, sem lista à mão. Uma banda de declaração NEGATIVA nomeia o valor que não
 * suporta (`unsupported_role.value`, `unknown_*.requested`, `unmodelled_signals.values`…).
 * Se um `next` menciona esse valor nos seus parâmetros, contradiz a banda da própria
 * resposta. Deriva-se da forma da resposta, não de um catálogo de casos.
 *
 * NUNCA EM SILÊNCIO. A sugestão contraditória sai do `next` — é lá que um agente vai
 * buscar o passo seguinte — e o motivo fica declarado em `next_withheld`, com a banda que
 * a bloqueou. Retirar sem dizer trocaria um defeito por outro.
 */

/** Chaves cujo prefixo marca uma declaração NEGATIVA (o que a resposta NÃO suporta/sabe). */
const NEGATIVE_BAND_KEY = /^(unsupported|unknown|unmodelled|unresolved|no_|not_|missing_)/i;
/** Valores de `status` que marcam a resposta inteira como declaração negativa. */
const NEGATIVE_STATUS = /^(unsupported|unknown|unresolved|not_|no_)/i;
/** Campos onde uma banda negativa nomeia o valor em causa. */
const VALUE_FIELDS = ["value", "values", "requested", "unsupported", "unknown"] as const;

export interface WithheldAffordance {
  tool: string;
  with?: string;
  intent?: string;
  contradicts_band: string;
  declared_value: string;
}

function collectNegativeValues(node: unknown, path: string, out: Map<string, string>, depth = 0): void {
  if (depth > 4 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectNegativeValues(item, path, out, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const status = obj["status"];
  const statusIsNegative = typeof status === "string" && NEGATIVE_STATUS.test(status);
  for (const [key, value] of Object.entries(obj)) {
    if (key === "next" || key === "next_withheld") continue;
    const bandName = path ? `${path}.${key}` : key;
    const keyIsNegative = NEGATIVE_BAND_KEY.test(key);
    if ((keyIsNegative || statusIsNegative) && value !== null && typeof value === "object") {
      for (const field of VALUE_FIELDS) {
        const v = (value as Record<string, unknown>)[field];
        if (typeof v === "string" && v.length > 2) out.set(v, bandName);
        if (Array.isArray(v)) for (const x of v) if (typeof x === "string" && x.length > 2) out.set(x, bandName);
      }
    }
    if (keyIsNegative && typeof value === "string" && value.length > 2 && !/\s/.test(value)) out.set(value, bandName);
    if (statusIsNegative)
      for (const field of VALUE_FIELDS) {
        const v = obj[field];
        if (typeof v === "string" && v.length > 2) out.set(v, `status=${status}`);
      }
    collectNegativeValues(value, bandName, out, depth + 1);
  }
}

/** Percorre o payload e devolve todos os arrays `next` com o objecto que os contém. */
function eachNext(node: unknown, visit: (owner: Record<string, unknown>) => void, depth = 0): void {
  if (depth > 4 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) eachNext(item, visit, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj["next"])) visit(obj);
  for (const value of Object.values(obj)) eachNext(value, visit, depth + 1);
}

/**
 * Retira do `next` as sugestões contraditadas por uma banda negativa da MESMA resposta e
 * declara a retirada. Devolve `true` se mexeu em alguma coisa.
 */
export function reconcileNextWithBands(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object") return false;
  const negatives = new Map<string, string>();
  collectNegativeValues(payload, "", negatives);
  if (negatives.size === 0) return false;

  let changed = false;
  eachNext(payload, (owner) => {
    const next = owner["next"] as Array<Record<string, unknown>>;
    const kept: Array<Record<string, unknown>> = [];
    const withheld: WithheldAffordance[] = [];
    for (const aff of next) {
      const withText = typeof aff["with"] === "string" ? (aff["with"] as string) : "";
      const hit = [...negatives.entries()].find(([value]) => withText.includes(value));
      if (hit === undefined) {
        kept.push(aff);
        continue;
      }
      withheld.push({
        tool: String(aff["tool"] ?? ""),
        ...(withText ? { with: withText } : {}),
        ...(typeof aff["intent"] === "string" ? { intent: aff["intent"] as string } : {}),
        contradicts_band: hit[1],
        declared_value: hit[0]
      });
    }
    if (withheld.length === 0) return;
    owner["next"] = kept;
    owner["next_withheld"] = {
      note:
        "Estas sugestões foram RETIRADAS do `next` porque contradizem uma banda desta mesma resposta — " +
        "a resposta declara que não suporta o valor que a sugestão usaria. Ficam aqui declaradas, com a " +
        "banda que as bloqueou: um agente segue o `next`, e seguir uma sugestão desmentida pela própria " +
        "resposta produziria trabalho sobre um vazio.",
      count: withheld.length,
      values: withheld
    };
    changed = true;
  });
  return changed;
}
