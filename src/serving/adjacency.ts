/**
 * 0.21 — ADJACÊNCIA DECLARADA.
 *
 * O servidor prometia «as adjacências do grafo» e servia `g2_context.relations`, que não são
 * adjacência: **zero das 49 arestas apontam para fora do âmbito activado** — ligam nós que o
 * chamador já recebeu. A adjacência a sério é outra pergunta, e é a única que um modelo a gerar
 * código não consegue fazer sozinho:
 *
 *   «declaraste `auth`, mas este endpoint toca dados pessoais: há mais 37 requisitos que se
 *    aplicariam, e não os pediste.»
 *
 * COMO SE CALCULA, e porque NÃO é inferência. Não se lê a prosa, não se adivinha o que o chamador
 * quis dizer. Para cada valor do vocabulário fechado que o chamador NÃO declarou, corre-se a
 * mesma selecção determinística com esse valor acrescentado e conta-se quantos ids entram que não
 * estavam lá. É aritmética sobre o conjunto activado — o contrato declarativo fica intacto.
 *
 * PORQUE VAI EM TODOS OS MODOS, o mais magro incluído. Não é nível de detalhe, é CORRECÇÃO: quem
 * pede o modo barato é quem mais provavelmente sub-declarou, e um modo barato que cale
 * «faltou-te privacidade» é pior do que não existir. A dieta muda COMO se diz; não muda o que é
 * verdade.
 *
 * PORQUE VEM COM TECTO E COM DENOMINADOR. Medido na base `auth`/L2: **37 de 41** valores do
 * vocabulário mudariam o conjunto. Uma lista de 37 é ruído, e ruído mina a declaração. Serve-se o
 * topo por impacto — e o número total ao lado, sempre, porque truncar em silêncio é o defeito que
 * esta casa não comete.
 */
import { runSelection, type SelectionContextInput } from "./selection.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";

export type AdjacencyKind = "concern" | "exposure" | "data_sensitivity" | "technology";

export interface AdjacencySignal {
  /** Valor do vocabulário fechado que o chamador não declarou. */
  signal: string;
  kind: AdjacencyKind;
  /** Quantos requisitos ENTRARIAM se este sinal fosse declarado. Nunca zero (esses não entram). */
  would_add: number;
}

export interface DeclaredAdjacency {
  /**
   * Os sinais de maior impacto, nomeados. O nome do campo é a frase: são os que NÃO declaraste e
   * que mudariam o conjunto.
   */
  undeclared_that_would_change_the_set: AdjacencySignal[];
  /** Valores do vocabulário sondados (todos os que o chamador não declarou). */
  scanned: number;
  /** Quantos desses mudariam o conjunto. O DENOMINADOR — nunca se trunca em silêncio. */
  would_change_the_set: number;
  /** Quantos vão nomeados acima. Menor que o de cima ⇒ o resto obtém-se pelo `detail_ref`. */
  shown: number;
  /** Como obter os ids concretos, sem adivinhar a chamada. */
  detail_ref: string;
  /**
   * 0.21 — a prosa que explica o bloco NÃO vive no payload: é a mesma em todas as chamadas e
   * pagá-la a cada volta é o defeito que esta linha existe para corrigir. Vive na descrição da
   * tool e no recurso de notas.
   */
  reading: string;
}

/** Tecto do resumo. Cinco chega para o modelo agir; o denominador diz-lhe que há mais. */
export const ADJACENCY_TOP_N = 5;

const KIND_ORDER: Record<AdjacencyKind, number> = {
  data_sensitivity: 0,
  exposure: 1,
  concern: 2,
  technology: 3
};

/**
 * O conjunto de ids de uma selecção. Só `selected` conta: as bandas de exclusão são o que NÃO
 * entrou, e a pergunta aqui é o que entraria.
 */
function selectedIds(input: SelectionContextInput): Set<string> {
  const r = runSelection(input);
  return new Set((r.selected ?? []).map((x) => x.requirement_id));
}

/**
 * Cache por assinatura da declaração. O cálculo corre ~41 selecções (medido: ~310 ms) e o mesmo
 * `prepare` pode pedi-lo mais do que uma vez na mesma resposta. Determinístico por construção:
 * a chave é a declaração inteira, normalizada e ordenada.
 */
const cache = new Map<string, DeclaredAdjacency>();

function signatureOf(base: SelectionContextInput): string {
  return JSON.stringify({
    risk_level: base.risk_level ?? "L2",
    concerns: [...(base.concerns ?? [])].sort(),
    exposure: base.exposure ?? null,
    data_sensitivity: base.data_sensitivity ?? null,
    technologies: [...(base.technologies ?? [])].sort(),
    changed_files: [...(base.changed_files ?? [])].sort()
  });
}

/**
 * Constrói o bloco de adjacência para uma declaração. `base` é a declaração TAL COMO o chamador a
 * fez — o cálculo nunca a altera, só a estende hipoteticamente, um sinal de cada vez.
 */
export function buildDeclaredAdjacency(base: SelectionContextInput): DeclaredAdjacency {
  const key = signatureOf(base);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const vocab = buildActivationVocabulary();
  const declaredConcerns = new Set(base.concerns ?? []);
  const declaredTech = new Set(base.technologies ?? []);
  const baseIds = selectedIds(base);

  const probes: { signal: string; kind: AdjacencyKind; with: SelectionContextInput }[] = [];
  for (const c of vocab.concerns.values) {
    const value = String(c.value);
    if (declaredConcerns.has(value)) continue;
    probes.push({ signal: value, kind: "concern", with: { ...base, concerns: [...declaredConcerns, value] } });
  }
  if (base.exposure === undefined)
    for (const e of vocab.exposure.values)
      probes.push({ signal: String(e.value), kind: "exposure", with: { ...base, exposure: String(e.value) } });
  if (base.data_sensitivity === undefined)
    for (const d of vocab.data_sensitivity.values)
      probes.push({ signal: String(d.value), kind: "data_sensitivity", with: { ...base, data_sensitivity: String(d.value) } });
  for (const t of vocab.technologies.values) {
    const value = String(t.value);
    if (declaredTech.has(value)) continue;
    probes.push({ signal: value, kind: "technology", with: { ...base, technologies: [...declaredTech, value] } });
  }

  const hits: AdjacencySignal[] = [];
  for (const p of probes) {
    let added = 0;
    for (const id of selectedIds(p.with)) if (!baseIds.has(id)) added += 1;
    if (added > 0) hits.push({ signal: p.signal, kind: p.kind, would_add: added });
  }
  hits.sort(
    (a, b) =>
      b.would_add - a.would_add || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.signal.localeCompare(b.signal, "en")
  );

  const top = hits.slice(0, ADJACENCY_TOP_N);
  const out: DeclaredAdjacency = {
    undeclared_that_would_change_the_set: top,
    scanned: probes.length,
    would_change_the_set: hits.length,
    shown: top.length,
    detail_ref:
      `select_sbd_toe_requirements(<a tua declaração> + o sinal) → os ids que entram, com trace. ` +
      `Nomeados ${top.length} de ${hits.length}.`,
    reading: "Aritmética sobre o vocabulário, não leitura da tarefa: diz o que CADA sinal acrescentaria, não qual se aplica."
  };
  cache.set(key, out);
  return out;
}
