/**
 * 0.20.0-beta.47 (R3) — DETERMINISMO DO SERVING, NO PORTÃO.
 *
 * «Identical input returns this exact payload (deterministic)» é a promessa que sustenta a
 * auditabilidade do produto: um resultado citável tem de ser reproduzível por outra pessoa,
 * noutra máquina, noutro dia. O Codex testa o determinismo do BUILD; o do SERVING passou
 * quatro auditorias por verificar. Passa a correr no portão, não uma vez.
 *
 * O runner arranca DOIS PROCESSOS independentes sobre o mesmo bundle pinado e compara os
 * payloads byte a byte. Aqui guarda-se o que não pode regredir: zero divergências, e o
 * inventário coberto por inteiro — uma superfície que deixe de ser comparável esconde
 * exactamente o que o teste existe para ver.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

describe("portão beta.47 — determinismo do serving entre processos", () => {
  it("a mesma chamada em dois processos distintos devolve o MESMO payload, byte a byte", () => {
    expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
    const raw = execFileSync("node", ["scripts/serving-determinism.mjs", "--out", "docs/acceptance-runs"], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const s = JSON.parse(raw) as {
      tools: number;
      identical: number;
      after_neutral: number;
      diverge: number;
      skipped: number;
      report: string;
    };
    expect(s.tools, "inventário vivo vazio — a sonda partiu").toBeGreaterThan(20);
    expect(
      s.diverge,
      `${s.diverge} superfície(s) devolvem payloads diferentes em processos distintos — a promessa de determinismo quebrou. Vê ${s.report}`
    ).toBe(0);
    /*
     * Uma superfície "não comparável" é um buraco no teste, não um resultado. Na 1.ª corrida
     * as três superfícies de RECUPERAÇÃO — as de maior risco — foram chamadas sem `question`,
     * devolveram 36 bytes de erro e contaram como byte-idênticas. O guarda existe para que
     * esse falso positivo não volte a passar por resultado.
     */
    expect(
      s.skipped,
      `${s.skipped} superfície(s) não foram comparadas — o teste tem um buraco onde devia ter cobertura. Vê ${s.report}`
    ).toBe(0);
    expect(s.identical + s.after_neutral, "nenhuma superfície comparada — a sonda partiu").toBe(s.tools);
  }, 300000);
});
