import { describe, it, expect } from "vitest";
import { handleSelectRequirements } from "./select-requirements.js";

describe("select_sbd_toe_requirements (MP1 tool)", () => {
  it("rejects an invalid risk_level with rpcError -32602", () => {
    let err: unknown;
    try { handleSelectRequirements({ risk_level: "L9" }); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("paginates selected[] coverage-preservingly (G1)", () => {
    const full = handleSelectRequirements({ risk_level: "L2", task: "Upload de ficheiros com autenticação e RBAC", exposure: "authenticated" });
    const seen: string[] = [];
    let offset = 0;
    for (;;) {
      const page = handleSelectRequirements({ risk_level: "L2", task: "Upload de ficheiros com autenticação e RBAC", exposure: "authenticated", offset, limit: 10 });
      seen.push(...page.selection.selected.map((s) => s.requirement_id));
      if (!page.coverage.hasMore) break;
      offset = page.coverage.nextOffset as number;
    }
    expect(seen).toEqual(full.selection.selected.map((s) => s.requirement_id));
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("overlay operator extend resolves obligations for a requested framework (AI Act)", () => {
    const r = handleSelectRequirements({ risk_level: "L3", task: "Formulário de registo com dados pessoais", data_sensitivity: "regulated", include_regulatory_overlay: true, regulatory_frameworks: ["EXT-AI-ACT"] });
    expect(r.overlay.status).toBe("resolved");
    expect(r.overlay.operator).toBe("extend");
    expect(r.overlay.obligations.length).toBeGreaterThan(0);
    expect(r.overlay.obligations.every((o) => o.framework_id === "EXT-AI-ACT")).toBe(true);
  });

  it("narrowed_out is complete and grouped with reasons; provenance declared", () => {
    const r = handleSelectRequirements({ risk_level: "L2", changed_files: ["infra/main.tf"] });
    expect(r.coverage.narrowed_out_requirements).toBe(r.selection.narrowed_out.reduce((n, g) => n + g.count, 0));
    expect(r.selection.narrowed_out.length).toBeGreaterThan(0);
    expect(r.provenance.produced_by).toBe("mp1_selection_engine");
    const ids = r.selection.selected.map((s) => s.requirement_id);
    expect(ids.some((id) => id.startsWith("IAC-"))).toBe(true);
  });
});
