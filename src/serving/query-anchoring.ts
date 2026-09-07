/**
 * 0.20.0-beta.39 — ANCORAGEM DA PERGUNTA no corpus publicado.
 *
 * PORQUE EXISTE. Uma pergunta sobre segurança FÍSICA de datacenters recebeu três excertos
 * de controlo de acesso LÓGICO. O servidor **não recusou e não improvisou: respondeu a
 * outra pergunta sem o dizer.** A recuperação faz o que sabe fazer — casar termos — e o
 * silêncio sobre o que NÃO casou é que engana.
 *
 * O QUE ESTE MÓDULO NÃO FAZ. Não inventa um piso numérico de relevância: um limiar de
 * score seria um número escolhido por nós, e a regra do programa é declarar, não decidir.
 * O que se pode derivar do corpus é objectivo — **que termos da pergunta não ocorrem em
 * lado nenhum do Manual** — e é isso que se serve. `datacenter`, `instalações` e `CCTV`
 * ocorrem zero vezes; `controlo de acesso` ocorre em 143 chunks. É por aí que o consumidor
 * percebe que recebeu a resposta a outra coisa.
 */
import { loadChunkIndex } from "./chunk-index.js";

/**
 * Palavras funcionais do português (e o inglês que aparece nas perguntas). Não são termos
 * de conteúdo e a sua ausência não diz nada — mantê-las inflacionaria o aviso até ao ruído.
 */
const STOPWORDS = new Set([
  "a","à","às","ao","aos","as","o","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","com","sem","sob","sobre","entre","que","qual","quais","quando","como","onde","porque","porquê","e","ou",
  "mas","se","não","sim","tem","têm","ter","há","é","são","foi","ser","estar","está","this","that","the","of","for","and",
  "what","which","how","are","is","to","in","on","at","my","me","meu","minha","nosso","nossa","seu","sua","este","esta",
  "esse","essa","aquele","aquela","isto","isso","mais","menos","muito","pouco","todo","toda","todos","todas","cada","já",
  "quantos","quantas","quanto","quanta","faço","fazes","faz","dizer","diz","sabes","sabe","existe","existem","tenho",
  "requisitos","requisito","manual","sbd","toe","preciso","quero","podes","pode","deve","devem","fazer","usar"
]);

let corpusCache: string | undefined;

/** O corpus publicado em minúsculas, uma vez. Título + secção + texto de cada chunk. */
function corpus(): string {
  if (corpusCache === undefined)
    corpusCache = loadChunkIndex()
      .map((c) => `${c.title} ${c.section_path} ${c.text}`)
      .join("\n")
      .toLowerCase();
  return corpusCache;
}

export function _resetQueryAnchoringCacheForTests(): void {
  corpusCache = undefined;
}

export interface QueryAnchoring {
  note: string;
  content_terms: number;
  anchored: string[];
  /** Termos de conteúdo da pergunta que NÃO ocorrem no corpus publicado. */
  without_corpus_anchor: string[];
  /**
   * Verdadeiro só quando NENHUM termo de conteúdo ocorre no corpus. É deliberadamente
   * estrito: uma pergunta fora de âmbito costuma trazer alguma palavra que existe algures,
   * e por isso a lista `without_corpus_anchor` diz mais do que este booleano.
   */
  nothing_published: boolean;
}

/**
 * Deriva a ancoragem de uma pergunta. Termos com 4+ caracteres, sem palavras funcionais;
 * a ocorrência é substring sobre o corpus (a mesma base que a recuperação lê), o que
 * apanha plurais e flexões sem inventar um lematizador que o programa não tem.
 */
export function anchorQuery(question: string): QueryAnchoring | undefined {
  const terms = [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^\p{L}\p{N}-]+/u)
        .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
    )
  ];
  if (terms.length === 0) return undefined;
  const text = corpus();
  const anchored = terms.filter((t) => text.includes(t));
  const missing = terms.filter((t) => !text.includes(t));
  return {
    note:
      "RECUPERAÇÃO, não decisão de âmbito: os excertos respondem ao que CASOU com a tua pergunta, que " +
      "não é necessariamente o que perguntaste. Os termos sem âncora abaixo não ocorrem em lado nenhum " +
      "do corpus publicado — se o teu assunto está entre eles, o que recebeste é sobre outra coisa.",
    content_terms: terms.length,
    anchored,
    without_corpus_anchor: missing,
    nothing_published: anchored.length === 0
  };
}

/** A banda de nunca-silêncio quando NADA do que perguntaste existe no Manual. */
export const NOTHING_PUBLISHED_NOTE =
  "NADA PUBLICADO SOBRE ISTO: nenhum termo de conteúdo da tua pergunta ocorre no corpus do Manual. " +
  "O que a recuperação devolve (se devolver) é o que mais se aproximou lexicalmente, e não é resposta " +
  "à pergunta que fizeste. O Manual não cobre tudo — e onde não cobre, diz-se.";
