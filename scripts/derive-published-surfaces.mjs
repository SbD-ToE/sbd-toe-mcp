/**
 * 0.20.0-beta.38 — FONTE ÚNICA da pergunta «que superfícies de dados TÊM de ir no pacote?».
 *
 * PORQUE EXISTE. A beta.37 expôs a vista processual e não enviou os dados: o `files` do
 * package.json era uma lista branca POR FICHEIRO em `indexes/`, `semantic/`, `overlay/` e
 * `ontology/`, e superfície nova nessas pastas não ia. O `check-npm-package` também não
 * apanhou, porque o seu `REQUIRED_PATHS` é outra lista estática. É a terceira vez que a
 * mesma classe morde (b.28 superfícies, b.36 next-verbatim, agora empacotamento):
 * **a lista corrigida fecha a instância; só a DERIVAÇÃO fecha a classe.**
 *
 * Deriva de três fontes, e a união é o que o pacote tem de conter:
 *   · MATERIALIZADAS — as entradas de `bundle-files.json`. O que pinamos, enviamos.
 *   · CARREGADAS     — caminhos `data/...` em literais do código de produção.
 *   · ENCAMINHADAS   — nomes de ficheiro citados no código, comentários incluídos. Sem
 *                      isto o `bundle_policy_links.jsonl` escapa: quem o materializa é o
 *                      CONSUMIDOR, e o servidor só lhe diz o nome.
 *
 * Consumida por `scripts/check-npm-package.mjs` (o gate do CI, que corre antes do publish)
 * e por `src/serving/package-surface-invariant.test.ts` (o mesmo contrato, na suite).
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Literais que PARECEM superfícies e não são. Cada um traz o motivo: sem motivo, não entra
 * — é a diferença entre declarar um falso positivo e esconder um defeito.
 */
export const DECLARED_NON_SURFACES = {
  "data/publish/runtime/x.json":
    "string de exemplo do teste da higiene de empacotamento (src/release/package-release.test.ts), não um ficheiro do substrato",
};

const posix = (p) => p.split("\\").join("/");

/** Ficheiros reais sob um directório do repo, em caminhos relativos POSIX. */
export function filesUnder(root, dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out.push(posix(relative(root, full)));
    }
  };
  walk(join(root, dir));
  return out;
}

/** .ts de PRODUÇÃO (testes fora: não são enviados nem lidos pelo consumidor). */
function productionSources(root) {
  return filesUnder(root, "src").filter((p) => p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts"));
}

/** As entradas de `bundle-files.json`, com os `dir` expandidos em ficheiros reais. */
function materialized(root) {
  const bundle = JSON.parse(readFileSync(join(root, "bundle-files.json"), "utf-8"));
  const out = [];
  for (const e of bundle.entries) {
    const p = join(root, e.path);
    if (!existsSync(p)) continue; // entrada `optional` que este pin não traz — legítimo
    if (e.kind === "dir" || statSync(p).isDirectory()) out.push(...filesUnder(root, e.path));
    else out.push(posix(e.path));
  }
  return [...new Set(out)];
}

export function derivePublishedSurfaces(root) {
  const dataFiles = [
    ...filesUnder(root, "data/publish"),
    ...filesUnder(root, "data/entities"),
    ...filesUnder(root, "data/reports"),
  ];
  const byBasename = new Map();
  for (const f of dataFiles) {
    const b = f.split("/").pop();
    byBasename.set(b, [...(byBasename.get(b) ?? []), f]);
  }
  const loaded = new Set();
  const referred = new Set();
  const skipped = new Set();
  for (const src of productionSources(root)) {
    const text = readFileSync(join(root, src), "utf-8");
    for (const m of text.matchAll(/["'`](data\/[A-Za-z0-9_./-]+\.(?:json|jsonl|yaml))["'`]/g)) {
      const p = m[1];
      if (p in DECLARED_NON_SURFACES) continue;
      if (existsSync(join(root, p))) loaded.add(p);
      else skipped.add(p); // caminho que este pin não traz — declarado, nunca silencioso
    }
    for (const m of text.matchAll(/\b([a-z0-9][a-z0-9_-]*\.(?:jsonl|json|yaml))\b/g))
      for (const p of byBasename.get(m[1]) ?? []) if (!(p in DECLARED_NON_SURFACES)) referred.add(p);
  }
  const mat = materialized(root);
  return {
    materialized: mat,
    loaded: [...loaded].sort(),
    referred: [...referred].sort(),
    skipped: [...skipped].sort(),
    required: [...new Set([...mat, ...loaded, ...referred])].sort(),
  };
}

/**
 * Guarda contra derivação colapsada: se um regex partir, isto grita em vez de deixar
 * passar um conjunto vazio (lição da beta.36 — a sonda muda antes do servidor).
 */
export function assertDerivationHealthy(d) {
  const problems = [];
  if (d.loaded.length < 20) problems.push(`só ${d.loaded.length} caminhos carregados derivados — a derivação partiu`);
  if (d.materialized.length < 20) problems.push(`só ${d.materialized.length} superfícies materializadas — a derivação partiu`);
  if (d.skipped.length > 4) problems.push(`caminhos nomeados sem ficheiro em excesso: ${d.skipped.join(", ")}`);
  for (const [p, why] of Object.entries(DECLARED_NON_SURFACES)) {
    if (!why || why.length < 20) problems.push(`falso positivo sem motivo declarado: ${p}`);
    if (d.loaded.includes(p) || d.referred.includes(p)) problems.push(`falso positivo declarado e mesmo assim derivado: ${p}`);
  }
  return problems;
}
