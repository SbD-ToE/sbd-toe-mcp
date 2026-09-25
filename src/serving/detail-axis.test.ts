/**
 * 0.21 §7 — UM EIXO, TRÊS TOOLS. `detail` em prepare, select e get_threat_landscape é o mesmo
 * eixo (inline vs por referência) com os mesmos nomes: lista / standard / full. O nome retirado
 * (`minimal`, e `ultrathin` no prepare) não fica a mentir: devolve -32602 a dizer para onde foi.
 */
import { describe, expect, it } from "vitest";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

const rpcCode = (fn: () => unknown): { code?: number; message?: string } => {
  try { fn(); return {}; } catch (e) { const err = e as { rpcError?: { code: number; message: string } }; return err.rpcError ?? {}; }
};

describe("0.21 §7 — o eixo lista/standard/full é o mesmo nas três tools", () => {
  it("'minimal' é recusado nas três com -32602 e a mesma indicação (→ lista); 'ultrathin' idem", () => {
    for (const retired of ["minimal", "ultrathin"]) {
      const s = rpcCode(() => handleSelectRequirements({ risk_level: "L2", concerns: ["auth"], detail: retired }));
      const t = rpcCode(() => handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"], detail: retired }));
      const p = rpcCode(() => handlePrepareCodegenContext({ task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"], detail: retired } as never));
      for (const r of [s, t, p]) {
        expect(r.code).toBe(-32602);
        expect(r.message).toMatch(/lista/);
      }
    }
  });

  it("select: `lista` é o antigo minimal (legenda por referência; type/source_chapter deriváveis fora), `standard` mantém-nos, `full` traz o trace inline; mesmo conjunto de ids", () => {
    const full = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"], limit: 500 });
    const standard = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"], limit: 500, detail: "standard" });
    const lista = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"], limit: 500, detail: "lista" });
    const rows = (r: unknown): Array<Record<string, unknown>> => {
      const sel = (r as { selection?: { selected?: unknown[] } | unknown[]; selected?: unknown[] });
      const list = Array.isArray(sel.selection) ? sel.selection : (sel.selection as { selected?: unknown[] } | undefined)?.selected ?? sel.selected ?? [];
      return list as Array<Record<string, unknown>>;
    };
    const ids = (r: unknown) => rows(r).map((x) => String(x["requirement_id"])).sort();
    expect(ids(lista)).toEqual(ids(full));
    expect(ids(standard)).toEqual(ids(full));
    expect(ids(full).length).toBeGreaterThan(0);
    const l0 = rows(lista)[0]!;
    const s0 = rows(standard)[0]!;
    expect(l0).not.toHaveProperty("type"); expect(l0).not.toHaveProperty("source_chapter"); expect(l0).toHaveProperty("trace");
    expect(s0).toHaveProperty("type"); expect(s0).toHaveProperty("source_chapter");
    expect((lista as { selection_trace_legend?: unknown[] }).selection_trace_legend!.length).toBeGreaterThan(0);
    expect((lista as { detail: string }).detail).toBe("lista");
  });

  it("threat: `lista` ≡ `standard` (legenda de controlos por referência) — declarado no schema, provado aqui; `full` inline; mesmo conjunto de ameaças", () => {
    const full = handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"] }) as { threats: Array<{ threat_id?: string; id?: string }> };
    const standard = handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"], detail: "standard" }) as { threats: unknown[]; associated_control_legend?: unknown };
    const lista = handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"], detail: "lista" }) as { threats: unknown[]; associated_control_legend?: unknown };
    expect(lista.associated_control_legend).toBeDefined();
    expect(JSON.stringify(lista)).toBe(JSON.stringify(standard));
    expect(lista.threats.length).toBe(full.threats.length);
  });
});
