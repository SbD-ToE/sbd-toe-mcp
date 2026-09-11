/**
 * 0.20.0-beta.41 — A MATRIZ BANDA × SUPERFÍCIE COMO PORTÃO.
 *
 * A matriz é o entregável de PROCESSO da 2.ª auditoria: «a classe é fechada onde o achado foi
 * reportado e não é varrida às superfícies irmãs». Como relatório, ela vive em
 * `scripts/band-surface-matrix.mjs` e corre por `npm run gate:band-matrix`. Aqui guarda-se o
 * que não pode regredir:
 *
 *   1. As COLUNAS derivam do `tools/list` vivo — se a derivação encolher, a suite parte em
 *      vez de dar uma matriz curta por boa.
 *   2. As células `FALTA` não podem AUMENTAR sem alguém decidir. A baseline desta corrida é
 *      13 achados, e está nomeada: uma tool nova que entre sem bandas fá-la subir, e é isso
 *      que se quer ver antes de promover — não depois, numa auditoria.
 *   3. As bandas que esta vaga fechou não voltam a `FALTA`.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

/** Achados conhecidos a 2026-09-08 (beta.41). Subir daqui é regressão; descer é progresso. */
/**
 * 0.20.0-beta.42 — as 13 células FALTA da 1.ª corrida foram TODAS resolvidas: 9 eram
 * defeitos do servidor e fecharam-se; 4 eram regras deste instrumento demasiado largas e
 * corrigiram-se aqui, não no servidor. A baseline passa a ZERO — a partir daqui, qualquer
 * célula FALTA é regressão ou superfície nova sem bandas.
 */
const BASELINE_MISSING = 0;

describe("portão beta.42 — nomes citados existem na superfície viva", () => {
  it("todo o nome de tool/prompt citado no guia existe no inventário vivo", async () => {
    /*
     * 0.20.0-beta.42 — a reconciliação do inventário levou-me a acusar o guia de citar uma
     * tool inexistente (`prepare_grounded_codegen`). Era um PROMPT, e o defeito era do meu
     * olho. Em vez de confiar nele outra vez, a verificação passa a existir: o universo é
     * tools ∪ prompts ∪ resources, derivado do servidor, e um nome citado que não exista em
     * lado nenhum parte a suite — é a família da b.36 (varrer o inventário VIVO).
     */
    const { buildAgentGuide } = await import("./agent-guide.js");
    const { RESOURCE_CATALOG, PROMPT_CATALOG } = await import("./server-surface.js");
    const guide = buildAgentGuide();
    // O inventário vivo vem do relatório da matriz — que o deriva do `tools/list` real.
    const raw = execFileSync("node", ["scripts/band-surface-matrix.mjs", "--out", "docs/acceptance-runs"], {
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const { report } = JSON.parse(raw) as { report: string };
    const liveTools: string[] = JSON.parse(readFileSync(report.replace(/\.md$/, ".json"), "utf-8")).tools;
    expect(liveTools.length, "inventário vivo vazio — a sonda partiu").toBeGreaterThan(20);
    const universe = new Set([
      ...liveTools,
      ...PROMPT_CATALOG.map((p) => p.name),
      ...RESOURCE_CATALOG.map((r) => r.uri)
    ]);
    const cited = [
      ...new Set(
        guide.match(/\b(?:get|map|plan|list|search|select|consult|assess|resolve|trace|explain|generate|answer|inspect|prepare|query|read|setup)_[a-z_]+/g) ?? []
      )
    ];
    expect(cited.length, "nenhum nome citado no guia — a extracção partiu").toBeGreaterThan(15);
    const dangling = cited.filter((n) => !universe.has(n));
    expect(dangling, `o guia cita nomes que não existem na superfície viva: ${dangling.join(", ")}`).toEqual([]);
  }, 60000);
});

describe("portão beta.41 — matriz banda × superfície", () => {
  it("a matriz corre, deriva as colunas do inventário vivo, e os achados não aumentam", () => {
    expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
    const raw = execFileSync("node", ["scripts/band-surface-matrix.mjs", "--out", "docs/acceptance-runs"], {
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const summary = JSON.parse(raw) as {
      tools: number;
      counts: Record<string, number>;
      missing: number;
      unprobed?: number;
      report: string;
    };
    expect(summary.tools, "colunas derivadas do tools/list vivo — derivação colapsada").toBeGreaterThan(20);
    expect(summary.counts.tem, "nenhuma célula `tem` — a sonda partiu, não confies nela").toBeGreaterThan(20);
    expect(
      summary.missing,
      `células FALTA subiram de ${BASELINE_MISSING} para ${summary.missing} — uma superfície nova entrou sem bandas, ou uma banda regrediu. Vê ${summary.report}`
    ).toBeLessThanOrEqual(BASELINE_MISSING);

    const report = readFileSync(summary.report, "utf-8");
    // o que esta vaga fechou não volta atrás
    expect(report, "o vocabulário voltou a não chegar ao cliente no caminho de erro").not.toMatch(/error_vocabulary/);
    // e o inventário passa a ser COMPLETO: nenhuma superfície fica por exercitar
    expect(summary.unprobed ?? 0, "voltou a haver superfícies não exercitáveis por argumentos derivados do schema").toBe(0);
    for (const closed of ["map_sbd_toe_applicability` · banda `never_silent", "get_guide_by_role` · banda `never_silent"])
      expect(report, `regressão: ${closed}`).not.toContain(closed);
  }, 180000);
});
