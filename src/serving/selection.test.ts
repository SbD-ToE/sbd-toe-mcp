/**
 * 0.20.0-beta.21 («declarativo primeiro»): estes casos medem o MOTOR INFERENCIAL
 * (termos da tarefa, aliases, R2, avisos de dominância/vazio). Esse motor deixou de
 * ser o default e passou a ter nome — `mode: "discover"` —, mantido nesta linha como
 * instrumento de investigação (oráculo histórico + estudo de paráfrase). Os testes
 * declaram-no explicitamente: continuam a guardar o instrumento, já não fixam a
 * semântica por omissão. O contrato declarativo tem a sua própria suite
 * (selection.declarative.test.ts).
 */
import { describe, it, expect } from "vitest";
import { runSelection } from "./selection.js";

describe("MP1 selection engine (runSelection) — reference semantics over the pinned bundle", () => {
  it("composes baseline ∪ context chapters and narrows by task signals — GC-03 shape (docker/k8s)", () => {
    const r = runSelection({ mode: "discover",
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
    const r = runSelection({ mode: "discover", risk_level: "L3", task: "Formulário de registo com dados pessoais", data_sensitivity: "personal" });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("ENC-001");
    expect(ids).toContain("VAL-001");
    expect(ids).toContain("LOG-005");
    expect(r.activation.trace.some((t) => t.source === "data_sensitivity")).toBe(true);
  });

  it("D3: exposure public activates auth/logging/api/validation/architecture (ARC via its domain chapter)", () => {
    const r = runSelection({ mode: "discover", risk_level: "L3", task: "Expor API pública de consulta com chaves de cliente e rate limiting", exposure: "public" });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("ARC-002");
    expect(ids).toContain("LOG-001");
    expect(ids).toContain("VAL-001");
    expect(r.activation.trace.some((t) => t.source === "exposure")).toBe(true);
  });

  it("agents: the agentic wave is selected by the published vocabulary (REQ-AGN ×4 + wave items), declared", () => {
    const r = runSelection({ mode: "discover", risk_level: "L3", task: "Worker agêntico com mandate, kill-switch e audit por tool-call" });
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
    const r = runSelection({ mode: "discover", risk_level: "L2", task: "Adicionar validação de payload ao endpoint PATCH" });
    const baselineSelected = r.selected.filter((s) => s.type === "base").length;
    const narrowed = r.narrowed_out.reduce((n, g) => n + g.count, 0);
    // eligible = baseline (no context chapters in this task) — the two bands partition it.
    expect(baselineSelected + narrowed).toBe(r.eligible_count - r.selected.filter((s) => s.type !== "base").length);
  });
});


describe("P3 rules (decisões pós-P2, 2026-08-31)", () => {
  it("R1: agents activa o conjunto principal não-humano como regra nomeada no trace", () => {
    const r = runSelection({ mode: "discover",
      risk_level: "L3",
      task: "Worker agêntico que abre PRs e faz deploys, com mandate, kill-switch e audit por tool-call",
    });
    const ids = r.selected.map((s) => s.requirement_id);
    for (const id of ["ACC-002", "AUT-006", "ENC-006", "DEP-011", "DEP-013", "DEP-014"]) {
      expect(ids, id).toContain(id);
    }
    const acc = r.selected.find((s) => s.requirement_id === "ACC-002");
    expect(acc?.selection_trace.some((t) => t.trigger.startsWith("R1:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("SES-"))).toBe(false);
  });

  it("R2: sem sinais de sessão na tarefa, SES sai para narrowed_out com razão declarada", () => {
    const r = runSelection({ mode: "discover",
      risk_level: "L3",
      task: "Expor API pública de consulta com chaves de cliente e rate limiting",
      exposure: "public",
    });
    expect(r.selected.some((s) => s.category === "SES")).toBe(false);
    const ses = r.narrowed_out.find((g) => g.category === "SES");
    expect(ses).toBeDefined();
    expect(ses?.reason).toContain("R2:");
  });

  it("R2: com sinais de sessão (login/JWT), SES fica seleccionado", () => {
    const r = runSelection({ mode: "discover", risk_level: "L1", task: "SPA com login e sessão JWT; app interna de baixo risco", exposure: "internal" });
    expect(r.selected.some((s) => s.requirement_id === "SES-001")).toBe(true);
    expect(r.narrowed_out.some((g) => g.category === "SES")).toBe(false);
  });

  it("sinal em falta GC-03: deploy containerizado activa a categoria DST (DST-006)", () => {
    const r = runSelection({ mode: "discover",
      risk_level: "L2",
      task: "Empacotar o serviço em Docker e preparar deploy em K8s com admission control",
      changed_files: ["Dockerfile", "deploy/k8s/service.yaml"],
    });
    expect(r.selected.some((s) => s.requirement_id === "DST-006")).toBe(true);
  });

  it("sinais em falta GC-10: mTLS → secrets (CFG-006) e mensageria → logging (LOG-001)", () => {
    const r = runSelection({ mode: "discover",
      risk_level: "L2",
      task: "Ligar o serviço A ao B por fila de mensagens com mTLS e assinatura de mensagens",
    });
    const ids = r.selected.map((s) => s.requirement_id);
    expect(ids).toContain("CFG-006");
    expect(ids).toContain("LOG-001");
  });
});


describe("0.19.1 — precedência e invariantes (ronda 4)", () => {
  it("V4: auth DECLARADO preserva SES; nunca activated∧narrowed na mesma resposta", () => {
    const r = runSelection({ mode: "discover", risk_level: "L2", task: "Alterar o email da conta do utilizador", concerns: ["auth"] });
    expect(r.selected.some((s) => s.category === "SES")).toBe(true);
    const selCats = new Set(r.selected.map((s) => s.category));
    for (const g of r.narrowed_out) expect(selCats.has(g.category), g.category).toBe(false);
  });
  it("replay-guard: auth LEXICAL continua a arrumar SES (R2 vivo)", () => {
    const r = runSelection({ mode: "discover", risk_level: "L3", task: "Expor API pública de consulta com chaves de cliente e rate limiting", exposure: "public" });
    expect(r.selected.some((s) => s.category === "SES")).toBe(false);
    expect(r.narrowed_out.some((g) => g.category === "SES")).toBe(true);
  });
  it("V2: selecção vazia dispara empty_selection_warning com candidatos; share-warning cede", () => {
    const r = runSelection({ mode: "discover", risk_level: "L2", task: "Cumprir as políticas internas de segurança da informação no módulo de clientes" });
    expect(r.selected.length).toBe(0);
    expect(r.empty_selection_warning?.candidate_concerns.length).toBeGreaterThan(0);
    expect(r.lexical_dominance_warning).toBeNull();
  });
});
