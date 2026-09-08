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
const BASELINE_MISSING = 13;

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
    for (const closed of ["map_sbd_toe_applicability` · banda `never_silent", "get_guide_by_role` · banda `never_silent"])
      expect(report, `regressão: ${closed}`).not.toContain(closed);
  }, 180000);
});
