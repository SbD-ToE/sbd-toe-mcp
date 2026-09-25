/**
 * 0.21 §1 — INVARIANTE 3 CONTRA O ORÁCULO DA 0.20.0.
 *
 * O Eixo H byte-idêntico não se aplica a esta linha (a forma muda de propósito).
 * A prova substituta, exigida pelo despacho 2026-09-11 e reafirmada a 2026-09-25:
 * para o mesmo input, o CONJUNTO DE IDS CITÁVEIS tem de ser idêntico ao da 0.20.0.
 * O oráculo (`__snapshots__/citable-ids-0.20.0.json`) foi gerado ANTES da §1 a
 * partir do dist/ da forma antiga (ramo 0.21 @ cb36422, pino KG v1.12.0) — nove
 * casos, incluindo os cinco da medição do §5, as duas fixtures do EPIC e os modos
 * review/test-plan. Muda a forma; o conjunto não.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { handlePrepareCodegenContext, type PrepareCodegenContextInput } from "./prepare-codegen-context.js";

interface GoldenCase {
  input: PrepareCodegenContextInput & { selection_mode?: "discover" };
  status: string;
  requirements?: number;
  citable_ids?: string[];
}
const golden = JSON.parse(readFileSync(new URL("./__snapshots__/citable-ids-0.20.0.json", import.meta.url), "utf-8")) as {
  generated_from: string;
  cases: Record<string, GoldenCase>;
};

/** Ids citáveis de qualquer nível: citation_map (full) ou ids_from sobre o próprio payload (dieted). */
function citableIds(payload: unknown): string[] {
  const p = payload as {
    citation_map?: Record<string, unknown>;
    citations?: Record<string, { ids_from?: string[]; ids?: string[] }>;
  };
  if (p.citation_map) return Object.keys(p.citation_map);
  const root = payload as Record<string, Record<string, unknown>>;
  const at = (path: string): string[] => {
    const keys = /^keys\(g2_context\.([a-z_]+)\[slice\]\)$/.exec(path);
    if (keys) return Object.values((root.g2_context?.[keys[1]!] ?? {}) as Record<string, Record<string, unknown>>).flatMap((e) => Object.keys(e));
    const list = /^([a-z0-9_]+)\.([a-z0-9_]+)\[\]\.([a-z0-9_]+)$/.exec(path);
    if (!list) throw new Error(`ids_from desconhecido: ${path}`);
    return ((root[list[1]!]?.[list[2]!] ?? []) as Array<Record<string, string>>).map((item) => item[list[3]!]!);
  };
  return Object.values(p.citations ?? {}).flatMap((g) => g.ids ?? (g.ids_from ?? []).flatMap(at));
}

describe("invariante 3 — conjunto de ids citáveis idêntico ao oráculo da 0.20.0", () => {
  expect(golden.generated_from).toBe("cb36422");
  const cases = Object.entries(golden.cases).filter(([, c]) => c.status === "ready_for_codegen");
  expect(cases.length).toBeGreaterThanOrEqual(9);

  it.each(cases)("%s", (_name, c) => {
    const expected = [...c.citable_ids!].sort();
    let readyLevels = 0;
    for (const detail of ["lista", "standard", "full"] as const) {
      const r = handlePrepareCodegenContext({ ...c.input, detail });
      if (detail !== "full" && r.status === "needs_decomposition") {
        // tecto por-id ratificado (lista 83 / standard 88): o bloqueio é DECLARADO e o
        // full — sem tecto — continua a ser o oráculo do conjunto.
        const rc = (r as { requirement_ceiling?: { limit: number; selected: number } }).requirement_ceiling;
        expect(rc?.selected).toBe(c.requirements);
        expect(rc!.selected).toBeGreaterThan(rc!.limit);
        continue;
      }
      expect(r.status, detail).toBe("ready_for_codegen");
      readyLevels += 1;
      const ids = [...new Set(citableIds(r))].sort();
      expect(ids, `detail=${detail}`).toEqual(expected);
      expect((r as { activated_scope: { requirements: unknown[] } }).activated_scope.requirements.length).toBe(c.requirements);
    }
    expect(readyLevels).toBeGreaterThanOrEqual(1); // o full nunca bloqueia por tecto
  });
});
