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
 *
 * 0.22.0: o oráculo em vigor passa a `citable-ids-0.22.0.json` (append-only; ver abaixo).
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
/**
 * 0.22.0 — o oráculo em vigor é `citable-ids-0.22.0.json`: o de 0.20.0 com o caso «API pública/L3 +
 * activadores» RE-BASELINADO pela decisão 0006 (135 → 278 ids, +143, −0, mesmos 89 requisitos), ratificado
 * pelo programme lead a 2026-09-28 contra o KG v2.0.0. Append-only: o de 0.20.0 fica, e a linhagem entre os
 * dois prova-se abaixo (só o caso ratificado muda, e só cresce).
 * Mecanismo mantido: um caso só entra em REBASELINE_PENDING_RATIFICATION enquanto espera o lead.
 */
const REBASELINE_PENDING_RATIFICATION: Record<string, string> = {};

type Oracle = {
  generated_from: string;
  rebaselined?: { version: string; ratified_by: string; ratified_on: string; cases: Record<string, { removed: number }> };
  cases: Record<string, GoldenCase>;
};
const golden = JSON.parse(readFileSync(new URL("./__snapshots__/citable-ids-0.22.0.json", import.meta.url), "utf-8")) as Oracle;
const golden020 = JSON.parse(readFileSync(new URL("./__snapshots__/citable-ids-0.20.0.json", import.meta.url), "utf-8")) as Oracle;

describe("linhagem do oráculo — 0.22.0 sobre 0.20.0 (append-only, re-baselinagem ratificada)", () => {
  it("mesmos casos; só os casos ratificados mudam, e só crescem (−0); os restantes são idênticos", () => {
    expect(Object.keys(golden.cases).sort()).toEqual(Object.keys(golden020.cases).sort());
    expect(golden.rebaselined?.ratified_by).toBe("programme lead");
    const ratified = new Set(Object.keys(golden.rebaselined?.cases ?? {}));
    expect([...ratified]).toEqual(["API pública/L3 + activadores"]);
    for (const [name, c] of Object.entries(golden.cases)) {
      const before = golden020.cases[name]!;
      const now = new Set(c.citable_ids ?? []);
      if (ratified.has(name)) {
        expect((before.citable_ids ?? []).filter((id) => !now.has(id)), `${name}: nada removido`).toEqual([]);
        expect(now.size, name).toBeGreaterThan((before.citable_ids ?? []).length);
        expect(c.requirements, name).toBe(before.requirements);
      } else {
        expect([...now].sort(), name).toEqual([...(before.citable_ids ?? [])].sort());
      }
    }
  });
});

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

describe("invariante 3 — conjunto de ids citáveis idêntico ao oráculo em vigor (0.22.0 = 0.20.0 + re-baselinagem ratificada)", () => {
  expect(golden.generated_from).toBe("cb36422");
  const cases = Object.entries(golden.cases).filter(([, c]) => c.status === "ready_for_codegen");
  expect(cases.length).toBeGreaterThanOrEqual(9);

  it.each(cases)("%s", (_name, c) => {
    const expected = [...c.citable_ids!].sort();
    let readyLevels = 0;
    for (const detail of ["lista", "standard", "full"] as const) {
      const r = handlePrepareCodegenContext({ ...c.input, detail });
      if (detail !== "full" && r.status === "needs_decomposition") {
        // 0.21.2 (decisão 0004): o payload MEDIDO passa o envelope — o bloqueio é declarado e o
        // full — sem envelope — continua a ser o oráculo do conjunto.
        const rc = (r as { requirement_ceiling?: { basis: string; projected_tk: number; promise_tk: number; selected: number } }).requirement_ceiling;
        expect(rc?.selected).toBe(c.requirements);
        expect(rc!.basis).toBe("measured_payload");
        expect(rc!.projected_tk).toBeGreaterThan(rc!.promise_tk);
        continue;
      }
      expect(r.status, detail).toBe("ready_for_codegen");
      readyLevels += 1;
      const ids = [...new Set(citableIds(r))].sort();
      if (REBASELINE_PENDING_RATIFICATION[_name] !== undefined) {
        const extras = ids.filter((id) => !expected.includes(id));
        expect(expected.filter((id) => !ids.includes(id)), `detail=${detail}: nada do oráculo se perde`).toEqual([]);
        const full = handlePrepareCodegenContext({ ...c.input, detail: "full", debug: true }) as unknown as {
          activation_trace: Array<{ source: string; produced: string }>;
          g2_context: Record<string, Array<{ entity_id: string; slice_family?: string; slice_id?: string }>>;
          activated_scope: { slices: Array<{ slice_id: string; objective_family: string }> };
        };
        const chainFamilies = new Set(full.activation_trace.filter((t) => t.source === "context_slice_chain").map((t) => t.produced));
        const chainSlices = new Set(full.activated_scope.slices.filter((sl) => chainFamilies.has(sl.objective_family)).map((sl) => sl.slice_id));
        const chainEntityIds = new Set(
          ["control_objectives", "mechanisms", "practices", "artifacts"].flatMap((k) =>
            (full.g2_context[k] ?? []).filter((e) => e.slice_id !== undefined && chainSlices.has(e.slice_id)).map((e) => e.entity_id)
          )
        );
        expect(extras.length, `detail=${detail}: o conjunto cresce`).toBeGreaterThan(0);
        expect(extras.filter((id) => !chainEntityIds.has(id) && !chainSlices.has(id)), `detail=${detail}: só fatias da cadeia e as suas entidades`).toEqual([]);
      } else {
        expect(ids, `detail=${detail}`).toEqual(expected);
      }
      expect((r as { activated_scope: { requirements: unknown[] } }).activated_scope.requirements.length).toBe(c.requirements);
    }
    expect(readyLevels).toBeGreaterThanOrEqual(1); // o full nunca bloqueia por tecto
  });
});
