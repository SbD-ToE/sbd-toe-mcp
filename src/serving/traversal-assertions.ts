/**
 * 0.20.0-beta.43 — AS ASSERÇÕES DE TRAVESSIA, servidas ao CONSUMIDOR.
 *
 * PORQUÊ. A ontologia v2.7 publica, para cada travessia derivada, o que ela afirma e — o que
 * interessa — **o que NÃO afirma**. A regra tem quatro partes e a terceira é a que dá sentido
 * a esta vaga: *«(iii) o que NÃO afirma (asserções negativas obrigatórias)»*.
 *
 * **Uma asserção negativa que fica no envelope não protege ninguém.** Foi exactamente o que
 * faltou na b.40: a vista de capacidade separou definidores de citadores — correcto — e
 * chamou `own` ao lado definidor. O verbo publicado é `produced_or_operated_by`, e a fonte
 * diz explicitamente que **não afirma posse**. A palavra «posse» entrou no vocabulário
 * servido por não haver nada que a impedisse; agora há, e não volta.
 *
 * Servido VERBATIM da ontologia: verbo, fonte autorada e a lista do que não se afirma. Se a
 * ontologia deixar de publicar uma travessia que uma superfície serve, a banda di-lo em vez
 * de a inventar — a promessa nunca-silêncio aplicada à própria maquinaria de declaração.
 */
import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { resolveAppPath } from "../config.js";

const ONTOLOGY_PATH = "data/publish/ontology/sbdtoe-ontology.yaml";

export interface TraversalAssertion {
  /** O VERBO que a travessia afirma. */
  verb: string;
  /** A fonte autorada de que deriva. */
  source: string;
  /** O que a travessia NÃO afirma — a peça que tem de chegar ao consumidor. */
  does_not_assert: string;
  note?: string;
}

interface Cache {
  assertions: Record<string, TraversalAssertion>;
  rule: string | undefined;
}
let cache: Cache | undefined;

export function _resetTraversalAssertionsCacheForTests(): void {
  cache = undefined;
}

function load(): Cache {
  if (cache !== undefined) return cache;
  const path = resolveAppPath(ONTOLOGY_PATH);
  if (!existsSync(path)) {
    cache = { assertions: {}, rule: undefined };
    return cache;
  }
  const doc = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const sp = doc["segmentation_principle"] as Record<string, unknown> | undefined;
  const raw = (sp?.["traversal_assertions"] ?? {}) as Record<string, unknown>;
  const assertions: Record<string, TraversalAssertion> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (value === null || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    if (typeof v["verb"] !== "string" || typeof v["does_not_assert"] !== "string") continue;
    assertions[id] = {
      verb: v["verb"],
      source: typeof v["source"] === "string" ? v["source"] : "",
      does_not_assert: v["does_not_assert"],
      ...(typeof v["note"] === "string" ? { note: v["note"] } : {})
    };
  }
  const rule = (sp?.["traversal_assertion_rule"] as { statement?: unknown } | undefined)?.statement;
  cache = { assertions, rule: typeof rule === "string" ? rule : undefined };
  return cache;
}

export function traversalAssertionIds(): string[] {
  return Object.keys(load().assertions).sort();
}

export interface AssertionBand {
  verb: string;
  source: string;
  does_not_assert: string;
  note?: string;
  published: boolean;
  rule?: string;
}

/**
 * A banda que acompanha uma travessia servida. `published: false` quando a ontologia deste
 * pino não a publica — o consumidor fica a saber que a travessia é servida SEM asserção
 * declarada, em vez de a receber como se fosse garantida.
 */
export function assertionFor(id: string): AssertionBand {
  const { assertions, rule } = load();
  const a = assertions[id];
  if (a === undefined)
    return {
      verb: "não publicado",
      source: "",
      does_not_assert:
        "a ontologia deste pino NÃO publica asserção para esta travessia — o servidor não a inventa. " +
        "Lê o que se segue como junção derivada sem contrato declarado.",
      published: false
    };
  return { ...a, published: true, ...(rule !== undefined ? { rule } : {}) };
}

/**
 * 0.20.0-beta.43 (v2.7) — PAPÉIS REFERENCIADOS-NÃO-CANÓNICOS.
 *
 * O Manual nomeia papéis que NÃO estão no vocabulário canónico — RH/PeopleOps é protagonista
 * de uma user story autorada do cap. 13 e não é um dos 13. Servi-lo como 14.º canónico seria
 * inventar vocabulário; não o servir de todo seria dizer que não existe. Serve-se como o que
 * é: referenciado, com as ÂNCORAS que o provam, e explicitamente fora da contagem canónica.
 */
export interface ReferencedRole {
  referenced_role_id: string;
  label: string;
  canonical: boolean;
  anchors: string[];
  absence_ref?: string;
}

export function referencedRoles(): ReferencedRole[] {
  const path = resolveAppPath(ONTOLOGY_PATH);
  if (!existsSync(path)) return [];
  const doc = parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const raw = (doc["referenced_roles"] as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(raw)) return [];
  return (raw as ReferencedRole[]).filter((r) => typeof r?.referenced_role_id === "string" && r.canonical === false);
}

/** O papel referenciado que corresponde a um valor pedido, se houver. */
export function referencedRoleFor(value: string): ReferencedRole | undefined {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const n = norm(value);
  return referencedRoles().find((r) => norm(r.referenced_role_id) === n || norm(r.label) === n);
}

/**
 * 0.20.0-beta.43 — O MANIFESTO DO PINO PROMETE, O PINO NÃO ENVIA.
 *
 * O `deterministic_manifest.json` deste pino declara entidades com nome, contagem e ficheiro.
 * Se um desses ficheiros não vier no bundle, a superfície que o serviria **não pode existir**
 * — e o consumidor tem de o saber por quem lhe responde, não por dedução. É a promessa
 * nunca-silêncio aplicada ao PRÓPRIO PINO: a b.38 fechou-a no nosso pacote, e a mesma classe
 * vale para o substrato que consumimos.
 *
 * O servidor NÃO vai buscar o ficheiro fora do artefacto pinado, mesmo que ele exista na
 * árvore de origem: a proveniência é verificada por digest contra o artefacto, e servir de
 * fora dele seria servir o que ninguém verificou.
 */
export interface ManifestGap {
  entity_type: string;
  name: string;
  file: string;
  declared_count: number;
}

export function manifestGaps(): ManifestGap[] {
  const manifestPath = resolveAppPath("data/publish/runtime/deterministic_manifest.json");
  if (!existsSync(manifestPath)) return [];
  const doc = JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<string, unknown>;
  const lists = Object.values(doc).filter((v): v is Record<string, unknown>[] => Array.isArray(v));
  const out: ManifestGap[] = [];
  for (const list of lists)
    for (const entry of list) {
      if (entry === null || typeof entry !== "object") continue;
      const file = entry["file"];
      const name = entry["name"];
      if (typeof file !== "string" || typeof name !== "string") continue;
      if (existsSync(resolveAppPath(`data/publish/runtime/${file}`))) continue;
      out.push({
        entity_type: typeof entry["entity_type"] === "string" ? entry["entity_type"] : name,
        name,
        file,
        declared_count: typeof entry["count"] === "number" ? entry["count"] : -1
      });
    }
  return out;
}

/** A banda para uma entidade que o manifesto declara e o pino não traz. */
export function manifestGapBand(name: string): Record<string, unknown> | undefined {
  const gap = manifestGaps().find((g) => g.name === name);
  if (gap === undefined) return undefined;
  return {
    entity_type: gap.entity_type,
    declared_in_manifest: gap.declared_count,
    file: gap.file,
    shipped: false,
    note:
      `O manifesto deste pino declara **${gap.declared_count} registos de \`${gap.entity_type}\`** no ficheiro ` +
      `\`${gap.file}\`, e **o bundle não traz esse ficheiro**. A superfície que os serviria não existe aqui — ` +
      "não porque o conteúdo não exista, mas porque não foi empacotado. O servidor **não vai buscá-lo fora do " +
      "artefacto pinado**: a proveniência é verificada por digest, e servir de fora seria servir o que ninguém " +
      "verificou. Achado de EMPACOTAMENTO a montante, reportado ao programa."
  };
}
