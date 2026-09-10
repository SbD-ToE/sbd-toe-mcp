/**
 * 0.20.0-beta.48 (KG v1.12.0) — AS LIGAÇÕES AUTORADAS DOS ANTIPADRÕES.
 *
 * O Manual v1.14.0 anota, bloco a bloco, o que cada antipadrão VIOLA e o que MATERIALIZA —
 * 26 + 24 = **50 ligações autoradas, com zero ids por resolver**. Até aqui a superfície de
 * CONSULT só tinha a camada PONTUADA (7 arestas derivadas por scoring) e a banda dizia, com
 * razão, que o servidor «não afirma este tópico, não tem ligação publicada que o diga».
 * Agora tem — mas é uma camada DISTINTA, não uma substituição.
 *
 * O QUE NÃO SE FAZ AQUI, e é o ponto: **5 dos 30 blocos casam com as 26 entidades publicadas
 * e 25 não.** O descasamento está declarado bloco a bloco na fonte (`matches_current_catalog`)
 * e **não se alinha nem se esconde** — é o achado, e a reconciliação dos conjuntos é decisão
 * de modelo que está no Archon (Q-AP1/2/3). Servir os 25 como se tivessem entidade seria
 * inventar o casamento que a triagem existe para decidir.
 *
 * E 9 blocos declaram AUSÊNCIA AUTORADA — «sem requisito ligável no catálogo actual». São
 * recusas deliberadas de ligar fraco, por instrução do lead: servem-se como ausência
 * **autorada**, nunca como falha de extracção.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolveAppPath } from "../config.js";

const PATH = "data/publish/semantic/antipattern_authored_links.jsonl";

export interface AuthoredLinkBlock {
  record_type: string;
  subject: string;
  subject_slug: string;
  anchor: string;
  clause: string;
  violates: string[];
  materializes: string[];
  matches_current_catalog: boolean;
  matched_antipattern_id: string | null;
  authored_absence: Record<string, boolean>;
  source_mode: string;
}

interface Cache {
  header: Record<string, unknown> | undefined;
  blocks: AuthoredLinkBlock[];
}
let cache: Cache | undefined;

export function _resetAuthoredLinksCacheForTests(): void {
  cache = undefined;
}

function load(): Cache {
  if (cache !== undefined) return cache;
  const path = resolveAppPath(PATH);
  if (!existsSync(path)) {
    cache = { header: undefined, blocks: [] };
    return cache;
  }
  const rows = readFileSync(path, "utf-8")
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .map((l: string) => JSON.parse(l) as Record<string, unknown>);
  const blocks = rows.filter((r: Record<string, unknown>) => r["record_type"] === "relaciona_block") as unknown as AuthoredLinkBlock[];
  const header = rows.find((r: Record<string, unknown>) => r["record_type"] !== "relaciona_block");
  cache = { header, blocks };
  return cache;
}

export function authoredLinkBlocks(): AuthoredLinkBlock[] {
  return load().blocks;
}

/**
 * A banda para um âmbito de capítulos. Devolve `undefined` quando o pino não traz a camada —
 * a ausência do ficheiro não é a ausência de ligações.
 */
export function authoredLinksBand(chapters: readonly string[]): Record<string, unknown> | undefined {
  const { blocks, header } = load();
  if (blocks.length === 0) return undefined;
  const inScope =
    chapters.length === 0
      ? blocks
      : blocks.filter((b) => chapters.some((c) => b.anchor.startsWith(c)));
  const links = inScope.reduce((n, b) => n + (b.violates?.length ?? 0) + (b.materializes?.length ?? 0), 0);
  const unmatched = inScope.filter((b) => !b.matches_current_catalog);
  const absences = inScope.filter((b) => Object.values(b.authored_absence ?? {}).some(Boolean));
  const counts = (header?.["counts"] ?? {}) as Record<string, number>;
  return {
    layer: "authored",
    source_mode: "authored",
    note:
      "Ligações que o MANUAL anota (marcador «Relaciona.»): o que cada antipadrão **viola** e o que " +
      "**materializa**, com âncora ficheiro:linha. Camada DISTINTA da pontuada, que se mantém ao lado — " +
      "esta afirma AUTORIA, aquela afirma correspondência derivada por scoring. Não se somam.",
    blocks: inScope.length,
    links,
    ...(header?.["epistemic"] !== undefined ? { source_declares: header["epistemic"] } : {}),
    catalog_match: {
      matched: inScope.length - unmatched.length,
      unmatched: unmatched.length,
      published_totals: {
        blocks: counts["blocks"],
        matched_current_catalog: counts["matched_current_catalog"],
        unmatched_current_catalog: counts["unmatched_current_catalog"]
      },
      note:
        "**O descasamento é o achado, não um defeito a esconder.** Os blocos que não casam com as " +
        "entidades de antipadrão publicadas ficam SEM entidade: as 26 actuais nascem de menções " +
        "pontuadas, e as unidades que o Manual anota são outras. **O servidor não alinha os conjuntos** " +
        "— qual deles É a entidade AntiPattern é decisão de modelo, em triagem. Lê estas ligações pela " +
        "sua âncora, não como propriedades das entidades publicadas."
    },
    ...(absences.length > 0
      ? {
          authored_absences: {
            count: absences.length,
            note:
              "Blocos em que o autor declara explicitamente **não haver requisito/ameaça ligável no " +
              "catálogo actual**. É recusa DELIBERADA de ligar fraco, não falha de extracção — e foi " +
              "de uma destas declarações de escassez que nasceu o `CIC-011`.",
            values: absences.map((b) => ({ subject: b.subject, anchor: b.anchor, authored_absence: b.authored_absence }))
          }
        }
      : {}),
    values: inScope.slice(0, 20).map((b) => ({
      subject: b.subject,
      anchor: b.anchor,
      clause: b.clause,
      violates: b.violates ?? [],
      materializes: b.materializes ?? [],
      has_published_entity: b.matches_current_catalog === true,
      ...(b.matched_antipattern_id !== null ? { antipattern_id: b.matched_antipattern_id } : {})
    })),
    ...(inScope.length > 20 ? { truncated: { returned: 20, total: inScope.length } } : {})
  };
}
