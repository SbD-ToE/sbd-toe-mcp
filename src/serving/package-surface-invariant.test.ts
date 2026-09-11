/**
 * 0.20.0-beta.38 — INVARIANTE DE EMPACOTAMENTO: o que o servidor serve, o pacote envia.
 *
 * PORQUE EXISTE. A beta.37 expôs a vista processual e **não enviou os dados**: a suite
 * passou 801/801 porque testa o REPO, e o utilizador recebe o TARBALL. Três listas
 * estáticas falharam ao mesmo tempo — o `files` do package.json, o `REQUIRED_PATHS` do
 * `check-npm-package` e o `BANNED_PATHS` que ainda proibia um ficheiro para o qual o
 * servidor já encaminhava. **A lista corrigida fecha a instância; só a derivação fecha a
 * classe.**
 *
 * A derivação vive em `scripts/derive-published-surfaces.mjs` e é FONTE ÚNICA: o gate do
 * CI (`npm run check:npm-package`, que corre antes do publish) e esta suite fazem a mesma
 * pergunta ao mesmo código. Este ficheiro dá o retorno local e guarda a saúde da sonda.
 *
 * Assere contra o TARBALL REAL (`npm pack --dry-run`), nunca contra o `files` lido à mão.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePublishedSurfaces,
  assertDerivationHealthy,
  filesUnder,
  DECLARED_NON_SURFACES,
} from "../../scripts/derive-published-surfaces.mjs";

const root = process.cwd();
let tarball: Set<string>;
const derived = derivePublishedSurfaces(root);

beforeAll(() => {
  // --ignore-scripts salta o prepack (a suite já corre sobre um dist construído);
  // a lista de ficheiros é a que o `npm publish` enviaria.
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const parsed = JSON.parse(raw) as { files: { path: string }[] }[];
  tarball = new Set(parsed[0].files.map((f) => f.path));
  expect(tarball.size, "a listagem do tarball veio vazia — a sonda partiu, não confies nela").toBeGreaterThan(50);
}, 120000);

describe("invariante beta.38 — o pacote envia o que o servidor serve", () => {
  it("a derivação não colapsou, e o falso positivo declarado continua demonstrável", () => {
    expect(assertDerivationHealthy(derived), "derivação inutilizável — corrige a SONDA, não o pacote").toEqual([]);
    /**
     * Uma derivação ingénua sobre TODO o `src` apanha o `x.json`; a nossa lê só código de
     * produção e por isso ele nunca lá chega. A exclusão só é honesta enquanto for
     * DEMONSTRÁVEL: exige-se que o literal continue a existir algures no `src` e a ficar
     * fora do conjunto derivado. Se um dia migrar para produção, é a
     * `DECLARED_NON_SURFACES` que o segura — e este teste prova que o segurou.
     */
    for (const [p, why] of Object.entries(DECLARED_NON_SURFACES)) {
      const anywhere = filesUnder(root, "src").some(
        (f: string) => f.endsWith(".ts") && readFileSync(join(root, f), "utf-8").includes(p)
      );
      expect(anywhere, `a fixture mudou: \`${p}\` desapareceu do src e a exclusão deixou de ser demonstrável`).toBe(true);
      expect(derived.required, `${p} devia estar excluído (${why})`).not.toContain(p);
    }
    // Controlo positivo: as quatro superfícies do defeito da beta.37 têm de ser DERIVADAS.
    for (const s of [
      "data/publish/semantic/macro_processes.jsonl",
      "data/publish/semantic/mp_edges.jsonl",
      "data/publish/indexes/cross_layer_referrals.jsonl",
      "data/publish/indexes/bundle_policy_links.jsonl",
    ])
      expect(derived.required, `${s} não foi derivada — a derivação não cobre a classe do defeito da beta.37`).toContain(s);
    // e a que só se alcança pelo ENCAMINHAMENTO tem de vir por essa via, não por acaso
    expect(
      derived.referred,
      "bundle_policy_links.jsonl tem de ser derivado como ENCAMINHADO — quem o materializa é o consumidor"
    ).toContain("data/publish/indexes/bundle_policy_links.jsonl");
    expect(derived.loaded).not.toContain("data/publish/indexes/bundle_policy_links.jsonl");
  });

  it("tudo o que o servidor MATERIALIZA do pin vai no tarball", () => {
    const missing = derived.materialized.filter((p: string) => !tarball.has(p));
    expect(missing, `superfícies pinadas e NÃO enviadas:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("tudo o que o `src` CARREGA vai no tarball", () => {
    const missing = derived.loaded.filter((p: string) => !tarball.has(p));
    expect(missing, `superfícies carregadas pelo servidor e NÃO enviadas:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("tudo o que o servidor ENCAMINHA (mesmo sem o carregar) vai no tarball", () => {
    const missing = derived.referred.filter((p: string) => !tarball.has(p));
    expect(missing, `superfícies para que o servidor encaminha e NÃO enviadas:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("tudo o que o `src` nomeia está no pin — nada se lê fora do substrato declarado", () => {
    const pinned = new Set(derived.materialized);
    const outside = derived.loaded.filter((p: string) => !pinned.has(p));
    expect(outside, `lido pelo servidor e FORA de bundle-files.json:\n  ${outside.join("\n  ")}`).toEqual([]);
  });
});
