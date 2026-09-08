/**
 * 0.20.0-beta.40 — O ÍNDICE CENTRAL DAS AUSÊNCIAS TIPADAS (ontologia v2.6, contrato v1.19 §1.26).
 *
 * PORQUÊ. Desde a b.23 que as superfícies prometem nunca-silêncio: onde não há nada, dizem-no.
 * Mas diziam sempre a mesma coisa — «não está publicado» — e calavam-se sobre o PORQUÊ. A
 * decisão do lead fecha essa diferença: **«a lacuna é erro ou omissão e tem que ser definido.
 * Out-of-scope é decisão.»** Um consumidor que recebe um vazio precisa de saber se está a
 * olhar para uma DÍVIDA (que alguém deve e há-de fechar) ou para uma FRONTEIRA (que não fecha
 * nunca, porque foi decidida). São reacções opostas.
 *
 * REGRA DE OURO: o `absence_type` VEM DO ÍNDICE, nunca é inferido pela superfície. Uma
 * superfície que adivinhasse o tipo faria exactamente o que o modelo existe para impedir —
 * uma lacuna incómoda a virar fronteira por conveniência. Onde o índice não tem entrada, a
 * banda diz que não tem (`unindexed`), e isso é informação, não um valor por omissão.
 *
 * Fonte: `declared_absences.items` da ontologia publicada, mais o `epistemic_model.absence_model`
 * que define os quatro valores. Ambos servidos verbatim.
 */
import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { resolveAppPath } from "../config.js";

const ONTOLOGY_PATH = "data/publish/ontology/sbdtoe-ontology.yaml";

export type AbsenceType = "gap" | "out_of_scope" | "deferred" | "elsewhere";

export interface DeclaredAbsence {
  absence_id: string;
  statement: string;
  absence_type: AbsenceType;
  /** 0.20.0-beta.45 (v2.8) — `closed` quando o índice registou o fecho. */
  status?: string;
  closed_on?: string;
  closed_evidence?: string;
  closed_registered_by?: string;
  debt_of?: string;
  owner?: string;
  closes_in?: string;
  trigger?: string;
  decided_by?: string;
  decided_on?: string;
  evidence?: string;
  note?: string;
}

export interface AbsenceModel {
  criterion?: string;
  closure_rule?: string;
  values?: Record<string, string>;
  debt_of?: string[];
  note?: string;
}

interface Cache {
  items: DeclaredAbsence[];
  model: AbsenceModel | undefined;
}
let cache: Cache | undefined;

export function _resetDeclaredAbsencesCacheForTests(): void {
  cache = undefined;
}

function load(): Cache {
  if (cache !== undefined) return cache;
  const path = resolveAppPath(ONTOLOGY_PATH);
  if (!existsSync(path)) {
    cache = { items: [], model: undefined };
    return cache;
  }
  const doc = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const raw = (doc["declared_absences"] as { items?: unknown } | undefined)?.items;
  const model = (doc["epistemic_model"] as { absence_model?: AbsenceModel } | undefined)?.absence_model;
  const items = Array.isArray(raw)
    ? (raw as DeclaredAbsence[]).filter((a) => typeof a?.absence_id === "string" && typeof a?.absence_type === "string")
    : [];
  cache = { items, model };
  return cache;
}

export function declaredAbsences(): DeclaredAbsence[] {
  return load().items;
}

export function absenceModel(): AbsenceModel | undefined {
  return load().model;
}

/** Uma ausência pelo id. Devolve `undefined` quando o índice não a conhece — nunca um default. */
export function absenceById(id: string): DeclaredAbsence | undefined {
  return load().items.find((a) => a.absence_id === id);
}

/**
 * A banda que uma superfície serve quando encontra um vazio. `absence_id` liga-a ao índice;
 * sem ligação, a banda DIZ que a ausência não está tipada — que é o que um consumidor precisa
 * de saber para não tomar uma dívida por fronteira nem o contrário.
 */
export interface AbsenceBand {
  absence_type: AbsenceType | "unindexed";
  /**
   * 0.20.0-beta.45 — o ESTADO, ao lado da espécie. Uma ausência FECHADA continua a ter
   * espécie (foi um `gap`), mas já não é dívida em aberto — e servi-la como se fosse era o
   * que esta banda fazia até aqui: lia o `absence_type` e ignorava o `status`. Um consumidor
   * que agisse sobre isso ia trabalhar sobre uma dívida já paga.
   */
  status: "open" | "closed";
  is_debt: boolean;
  is_boundary: boolean;
  closed_on?: string;
  closed_evidence?: string;
  closed_registered_by?: string;
  absence_id?: string;
  statement?: string;
  debt_of?: string;
  owner?: string;
  closes_in?: string;
  trigger?: string;
  decided_by?: string;
  decided_on?: string;
  what_it_means: string;
  note: string;
  /**
   * 0.20.0-beta.41 — o rótulo LOCAL que esta tipagem substituiu. Vários blocos da fonte
   * trazem um estado próprio anterior ao índice (`status: "unpublished_gap"`, por exemplo) e
   * a própria fonte declara-o superseded. Servir os dois fazia a resposta dizer LACUNA e
   * FRONTEIRA ao mesmo tempo — o único sítio onde uma ausência era as duas coisas. Passa a
   * haver UMA declaração: o tipo do índice, com o rótulo antigo visível como história.
   */
  supersedes_local_label?: { label: string; note: string };
}

const MEANING: Record<AbsenceType, string> = {
  gap: "DÍVIDA — erro ou omissão, com dono e destino. Fecha. Não a tomes por fronteira do Manual.",
  out_of_scope:
    "FRONTEIRA deliberada — decidida pelo programme lead, e NÃO fecha. Não esperes por ela, e não a derives por outro caminho.",
  deferred:
    "DÍVIDA com gatilho — decidida para depois, com o gatilho de activação declarado. Fecha quando o gatilho disparar.",
  elsewhere: "EXISTE NOUTRA SUPERFÍCIE — segue o pointer. Se o pointer não resolver, degrada para dívida da superfície apontada."
};

/**
 * Encontra no índice a ausência que NOMEIA todos estes termos no seu `statement`.
 *
 * Porque assim e não por uma tabela à mão: uma tabela «superfície → absence_id» seria mais
 * uma lista estática, e a b.38 já mostrou o que essas fazem — não vêem o caso novo. Aqui a
 * ligação vem das PALAVRAS DO PRÓPRIO ÍNDICE: a superfície passa o que observou (o papel
 * vazio, o framework sem cross-check), e se o índice nomear esse valor, a ligação existe.
 * Uma ausência nova que nomeie um valor servido é apanhada sem ninguém mexer no código.
 *
 * Ambiguidade NÃO se resolve por heurística: mais do que uma correspondência devolve
 * `undefined`, e a banda sai `unindexed` — dizer «não sei qual» é melhor do que escolher.
 */
export function absenceNaming(...terms: string[]): DeclaredAbsence | undefined {
  const needles = terms.map((t) => t.toLowerCase().trim()).filter((t) => t.length >= 6);
  if (needles.length === 0) return undefined;
  const hits = load().items.filter((a) => {
    const hay = `${a.statement} ${a.note ?? ""} ${a.evidence ?? ""}`.toLowerCase();
    return needles.every((n) => hay.includes(n));
  });
  return hits.length === 1 ? hits[0] : undefined;
}

/**
 * Constrói a banda a partir do índice. `absenceId` é o id que a superfície declara conhecer;
 * quando não há id (ou o índice não o tem), a banda é `unindexed` e di-lo.
 */
export function absenceBand(
  absenceId: string | undefined,
  context: string,
  supersededLocalLabel?: string
): AbsenceBand {
  const superseded =
    supersededLocalLabel !== undefined && supersededLocalLabel.length > 0
      ? {
          supersedes_local_label: {
            label: supersededLocalLabel,
            note:
              "rótulo LOCAL do bloco de origem, **superseded** pela tipagem do índice central (a própria " +
              "fonte o declara). Fica visível como história — a declaração que vale é o `absence_type` acima. " +
              "Uma ausência não pode ser lacuna e fronteira ao mesmo tempo."
          }
        }
      : {};
  const a = absenceId !== undefined ? absenceById(absenceId) : undefined;
  if (a === undefined)
    return {
      ...superseded,
      absence_type: "unindexed",
      status: "open",
      is_debt: false,
      is_boundary: false,
      what_it_means:
        "NÃO TIPADA — esta ausência não tem entrada no índice central `declared_absences`, e o servidor " +
        "não infere o tipo: adivinhá-lo seria deixar uma lacuna virar fronteira por conveniência. " +
        "Não sabes ainda se é dívida ou decisão.",
      note: context
    };
  /*
   * FECHADA: a espécie mantém-se (foi um `gap`), mas deixa de ser dívida em aberto. O
   * `closed_evidence` e o `closed_registered_by` vêm junto porque fechar é REGISTO com prova
   * verificável e com quem verificou — é a `closure_rule` da v2.8, que generaliza a regra da
   * b.40 («o registo é do índice, nunca da superfície») ao fecho.
   */
  const closed = a.status === "closed";
  return {
    ...superseded,
    absence_type: a.absence_type,
    status: closed ? "closed" : "open",
    is_debt: !closed && (a.absence_type === "gap" || a.absence_type === "deferred"),
    is_boundary: a.absence_type === "out_of_scope",
    ...(a.closed_on !== undefined ? { closed_on: a.closed_on } : {}),
    ...(a.closed_evidence !== undefined ? { closed_evidence: a.closed_evidence } : {}),
    ...(a.closed_registered_by !== undefined ? { closed_registered_by: a.closed_registered_by } : {}),
    absence_id: a.absence_id,
    statement: a.statement,
    ...(a.debt_of !== undefined ? { debt_of: a.debt_of } : {}),
    ...(a.owner !== undefined ? { owner: a.owner } : {}),
    ...(a.closes_in !== undefined ? { closes_in: a.closes_in } : {}),
    ...(a.trigger !== undefined ? { trigger: a.trigger } : {}),
    ...(a.decided_by !== undefined ? { decided_by: a.decided_by } : {}),
    ...(a.decided_on !== undefined ? { decided_on: a.decided_on } : {}),
    what_it_means: closed
      ? `FECHADA em ${a.closed_on ?? "data não registada"} — foi \`${a.absence_type}\` e já não é. ` +
        "Não ajas sobre ela como dívida em aberto; a evidência do fecho vem em `closed_evidence`."
      : MEANING[a.absence_type],
    note: context
  };
}
