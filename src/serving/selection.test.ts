import { describe, it, expect } from "vitest";
import { runSelection } from "./selection.js";

describe("MP1 selection engine (runSelection) — reference semantics over the pinned bundle", () => {
  it("composes baseline ∪ context chapters and narrows by task signals — GC-03 shape (docker/k8s)", () => {
    const r = runSelection({
      risk_level: "L2",
      task: "Empacotar o serviço em Docker e preparar deploy em K8s com admission control",
      changed_files: ["Dockerfile", "deploy/k8s/service.yaml"]
    });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("CNT-001");
    expect(ids).toContain("DPL-002");
    expect(r.activated_chapters.map((c) => c.chapter)).toContain("09-containers-imagens");
    // App-code baseline categories without a task signal go to narrowed_out — listed, never silent.
    const narrowedCats = r.narrowed_out.map((g) => g.category);
    expect(narrowedCats).toContain("AUT");
    expect(ids.some((id) => id.startsWith("AUT-"))).toBe(false);
    for (const g of r.narrowed_out) {
      expect(g.count).toBe(g.requirement_ids.length);
      expect(g.reason).toMatch(/sem sinal/);
    }
    // Every selected item carries a declared trace.
    for (const s of r.selected) expect(s.selection_trace.length).toBeGreaterThan(0);
  });

  it("D3: data_sensitivity personal activates encryption/validation/logging by declared rule", () => {
    const r = runSelection({ risk_level: "L3", task: "Formulário de registo com dados pessoais", data_sensitivity: "personal" });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("ENC-001");
    expect(ids).toContain("VAL-001");
    expect(ids).toContain("LOG-005");
    expect(r.activation.trace.some((t) => t.source === "data_sensitivity")).toBe(true);
  });

  it("D3: exposure public activates auth/logging/api/validation/architecture (ARC via its domain chapter)", () => {
    const r = runSelection({ risk_level: "L3", task: "Expor API pública de consulta com chaves de cliente e rate limiting", exposure: "public" });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("ARC-002");
    expect(ids).toContain("LOG-001");
    expect(ids).toContain("VAL-001");
    expect(r.activation.trace.some((t) => t.source === "exposure")).toBe(true);
  });

  it("agents: the agentic wave is selected by the published vocabulary (REQ-AGN ×4 + wave items), declared", () => {
    const r = runSelection({ risk_level: "L3", task: "Worker agêntico com mandate, kill-switch e audit por tool-call" });
    const ids = r.selected.map((s) => s.requirement_id);
    for (const id of ["REQ-AGN-001", "REQ-AGN-002", "REQ-AGN-003", "REQ-AGN-004"]) expect(ids).toContain(id);
    const wave = r.selected.filter((s) => s.selection_trace.some((t) => t.layer === "agents_wave"));
    expect(wave.length).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic — two runs are byte-identical", () => {
    const input = { risk_level: "L2" as const, task: "Upload de ficheiros com autenticação e RBAC", exposure: "authenticated", data_sensitivity: "personal" };
    expect(JSON.stringify(runSelection(input))).toBe(JSON.stringify(runSelection(input)));
  });

  it("never-silent: selected + narrowed_out cover the eligible baseline exactly", () => {
    const r = runSelection({ risk_level: "L2", task: "Adicionar validação de payload ao endpoint PATCH" });
    const baselineSelected = r.selected.filter((s) => s.type === "base").length;
    const narrowed = r.narrowed_out.reduce((n, g) => n + g.count, 0);
    // eligible = baseline (no context chapters in this task) — the two bands partition it.
    expect(baselineSelected + narrowed).toBe(r.eligible_count - r.selected.filter((s) => s.type !== "base").length);
  });
});
