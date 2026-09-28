/**
 * 0.21 §6, primeira coisa — CONDIÇÃO DA DECISÃO (a) DO LEAD (2026-09-25): a decomposição
 * PRESERVA OS ACTIVADORES e os lotes SOMAM O TODO.
 *
 * Achado T2 da avaliação externa: os lotes por concern deixavam cair exposure/data_sensitivity/
 * technologies e o conjunto mudava. Agora cada lote é uma declaração ESTRUTURAL (`categories` — a
 * partição exacta das categorias que a declaração activou), com technologies/changed_files
 * preservados literalmente e exposure/data_sensitivity preservados pelo seu EFEITO (as categorias
 * que produziram entram na partição; re-declará-los somaria as suas categorias a todos os lotes e
 * nenhum caberia). A prova exigida: m_recall da UNIÃO dos lotes = 1 contra a selecção inteira, nos
 * dois casos nomeados pelo lead — e aqui os lotes EXECUTAM-SE de verdade, não se confia na contagem.
 *
 * 0.21.2 (decisão 0004, lead 2026-09-26): a regra passou a ser de CUSTO. Os lotes empacotam-se por
 * payload MEDIDO: cada lote declara `measured_tk`, e esse número é o size_estimate que a chamada
 * do lote devolve. Um lote irredutível (uma categoria que sozinha não cabe) sai pronto e declarado;
 * chamar um lote NUNCA devolve outra decomposição.
 */
import { describe, expect, it } from "vitest";
import { handlePrepareCodegenContext, type PrepareCodegenContextInput } from "./prepare-codegen-context.js";
import { PAYLOAD_PROMISE_TK } from "../serving/payload-ceilings.js";
import { getOntologyData } from "./ontology-loader.js";

const CASES: Array<[string, PrepareCodegenContextInput]> = [
  ["caso real dos 83 — auth+integrity+deployment / L3", { task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "integrity", "deployment"] }],
  ["caso da avaliação — auth+api+validation, public, personal / L3", { task: "Expor API pública com autenticação e validação", risk_level: "L3", concerns: ["auth", "api", "validation"], exposure: "public", data_sensitivity: "personal" }],
  ["caso da avaliação com technologies — + jwt", { task: "Expor API pública com autenticação e validação", risk_level: "L3", concerns: ["auth", "api", "validation"], exposure: "public", data_sensitivity: "personal", technologies: ["jwt"] }]
];

type Blocked = {
  status: string;
  suggestions?: string[];
  requirement_ceiling?: {
    basis: string;
    selected: number;
    projected_tk: number;
    promise_tk: number;
    batches: Array<{ with: { categories: string[]; technologies?: string[]; changed_files?: string[]; regulatory_frameworks?: string[] }; requirements: number; measured_tk: number; irreducible: boolean; derived_from: { concerns: string[]; exposure?: string; data_sensitivity?: string } }>;
    union: { requirements: number; recall: number };
  };
};

describe("0.21 §6 — decomposição que soma o todo (condição da decisão (a))", () => {
  it.each(CASES)("%s: lista bloqueia declarado; cada lote cabe, executa e a UNIÃO dos lotes cobre a selecção inteira (m_recall = 1)", (_n, input) => {
    for (const detail of ["lista", "standard"] as const) {
      const blocked = handlePrepareCodegenContext({ ...input, detail }) as Blocked;
      expect(blocked.status).toBe("needs_decomposition");
      const rc = blocked.requirement_ceiling!;
      expect(rc.basis).toBe("measured_payload");
      expect(rc.promise_tk).toBe(PAYLOAD_PROMISE_TK[detail]);
      expect(rc.projected_tk).toBeGreaterThan(rc.promise_tk);
      expect(rc).not.toHaveProperty("limit");
      expect(rc).not.toHaveProperty("cost_per_req_tk");
      expect(rc.batches.length).toBeGreaterThan(1);
      // o servidor declara a união e o recall — e o teste não confia: executa
      expect(rc.union.recall).toBe(1);
      const full = handlePrepareCodegenContext({ ...input, detail: "full" }) as { status: string; activated_scope: { requirements: Array<{ id: string }> } };
      expect(full.status).toBe("ready_for_codegen");
      const fullIds = new Set(full.activated_scope.requirements.map((r) => r.id));
      expect(fullIds.size).toBe(rc.selected);
      const union = new Set<string>();
      for (const batch of rc.batches) {
        if (!batch.irreducible) expect(batch.measured_tk).toBeLessThanOrEqual(rc.promise_tk);
        expect(batch.with.categories.length).toBeGreaterThan(0);
        // technologies/changed_files PRESERVADOS literalmente em cada lote
        if (input.technologies?.length) expect(batch.with.technologies).toEqual(input.technologies);
        else expect(batch.with).not.toHaveProperty("technologies");
        // a receita executa-se tal e qual: task + risk_level + detail + with
        const r = handlePrepareCodegenContext({ task: input.task, risk_level: input.risk_level, detail, ...batch.with }) as { status: string; activated_scope: { requirements: Array<{ id: string }> }; size_estimate: { approx_tokens: number; within_envelope: boolean; irreducible_note_id?: string } };
        expect(r.status, `lote ${JSON.stringify(batch.with)}`).toBe("ready_for_codegen"); // sem ciclo
        expect(r.activated_scope.requirements.length).toBe(batch.requirements); // a contagem declarada é a REAL
        expect(r.size_estimate.approx_tokens).toBe(batch.measured_tk); // o custo declarado é o REAL
        expect(r.size_estimate.within_envelope || r.size_estimate.irreducible_note_id !== undefined).toBe(true);
        for (const q of r.activated_scope.requirements) union.add(q.id);
      }
      const covered = [...fullIds].filter((id) => union.has(id)).length;
      expect(covered / fullIds.size, `m_recall da união (${detail})`).toBe(1);
      expect(union.size).toBe(rc.union.requirements);
      // os activadores largos estão na partição pelo seu efeito — declarado em derived_from
      if (input.exposure) expect(rc.batches.some((b) => b.derived_from.exposure === input.exposure)).toBe(true);
      if (input.data_sensitivity) expect(rc.batches.some((b) => b.derived_from.data_sensitivity === input.data_sensitivity)).toBe(true);
      // e a sugestão ensina a receita com as categorias, nunca «activadores largos fora»
      expect(blocked.suggestions?.[0]).toMatch(/SOMAM O TODO/);
      expect(blocked.suggestions?.[0]).toMatch(/categories=\[/);
      expect(blocked.suggestions?.[0]).not.toMatch(/ficam FORA/);
    }
  });

  it("forma B no prepare: `categories` declaradas seleccionam exactamente essas categorias ao nível; valor desconhecido não é engolido (needs_input declarado)", () => {
    const r = handlePrepareCodegenContext({ task: "Implementar autenticação de utilizadores e sessões", risk_level: "L3", categories: ["AUT", "SES"], detail: "lista" }) as { status: string; activated_scope: { requirements: Array<{ id: string }> } };
    expect(r.status).toBe("ready_for_codegen");
    for (const q of r.activated_scope.requirements) expect(q.id).toMatch(/^(AUT|SES)-/);
    const bad = handlePrepareCodegenContext({ task: "Implementar autenticação de utilizadores e sessões", risk_level: "L3", categories: ["NOPE"], detail: "lista" }) as { status: string };
    expect(bad.status).not.toBe("ready_for_codegen");
  });

  it("irredutível (decisão do lead 2026-09-26): GOV + overlay CRA em L3 — uma categoria que sozinha não cabe sai PRONTA e declarada, nunca outra decomposição", () => {
    for (const detail of ["lista", "standard"] as const) {
      const r = handlePrepareCodegenContext({ task: "Governação de segurança", risk_level: "L3", categories: ["GOV"], regulatory_frameworks: ["CRA"], detail }) as { status: string; size_estimate: { approx_tokens: number; envelope_tk: number; within_envelope: boolean; note_id?: string; irreducible_note_id?: string } };
      expect(r.status).toBe("ready_for_codegen");
      expect(r.size_estimate.within_envelope).toBe(false);
      expect(r.size_estimate.approx_tokens).toBeGreaterThan(r.size_estimate.envelope_tk);
      expect(r.size_estimate.note_id).toBe("prepare.size_estimate.envelope_exceeded");
      expect(r.size_estimate.irreducible_note_id).toBe("prepare.size_estimate.irreducible");
    }
  });

  it("sem ciclo, sobre o catálogo inteiro: cada categoria sozinha em L3 (lista e standard) sai sempre pronta — dentro do envelope ou irredutível declarada", () => {
    const categories = [...new Set(getOntologyData().requirements.map((r) => r.category))].sort();
    expect(categories.length).toBeGreaterThan(10);
    for (const detail of ["lista", "standard"] as const) {
      for (const category of categories) {
        const r = handlePrepareCodegenContext({ task: "x", risk_level: "L3", categories: [category], detail }) as { status: string; size_estimate?: { within_envelope: boolean; irreducible_note_id?: string } };
        expect(r.status, `${category}@${detail}`).not.toBe("needs_decomposition");
        if (r.status === "ready_for_codegen") expect(r.size_estimate!.within_envelope || r.size_estimate!.irreducible_note_id !== undefined, `${category}@${detail}`).toBe(true);
      }
    }
  });

  it("overlay preservado literalmente em cada lote (decisão 0004 §3): RGPD em L3 com três concerns", () => {
    const input: PrepareCodegenContextInput = { task: "API com dados pessoais", risk_level: "L3", concerns: ["auth", "integrity", "deployment"], regulatory_frameworks: ["RGPD"] };
    const blocked = handlePrepareCodegenContext({ ...input, detail: "lista" }) as Blocked;
    expect(blocked.status).toBe("needs_decomposition");
    for (const batch of blocked.requirement_ceiling!.batches) {
      expect(batch.with.regulatory_frameworks).toEqual(["RGPD"]);
      const r = handlePrepareCodegenContext({ task: input.task, risk_level: input.risk_level, detail: "lista", ...batch.with }) as { status: string; size_estimate: { approx_tokens: number } };
      expect(r.status).toBe("ready_for_codegen");
      expect(r.size_estimate.approx_tokens).toBe(batch.measured_tk);
    }
  });

  it("opt-ins explícitos (include_relations, debug) não disparam decomposição: decide a forma canónica do nível, e o pedido sai com o preço declarado", () => {
    const input: PrepareCodegenContextInput = { task: "x", risk_level: "L3", concerns: ["auth", "logging", "validation"], detail: "standard" };
    const canonical = handlePrepareCodegenContext(input) as { status: string; size_estimate: { within_envelope: boolean } };
    expect(canonical.status).toBe("ready_for_codegen");
    expect(canonical.size_estimate.within_envelope).toBe(true);
    const withRelations = handlePrepareCodegenContext({ ...input, include_relations: true }) as { status: string; size_estimate: { within_envelope: boolean; approx_tokens: number } };
    expect(withRelations.status).toBe("ready_for_codegen");
    const debug = handlePrepareCodegenContext({ ...input, debug: true }) as { status: string };
    expect(debug.status).toBe("ready_for_codegen");
  });

  it("full não tem envelope: nunca decompõe e declara o preço", () => {
    const r = handlePrepareCodegenContext({ task: "x", risk_level: "L3", concerns: ["auth", "integrity", "deployment"], detail: "full" }) as { status: string; size_estimate: Record<string, unknown> };
    expect(r.status).toBe("ready_for_codegen");
    expect(r.size_estimate).not.toHaveProperty("envelope_tk");
    expect(r.size_estimate).not.toHaveProperty("within_envelope");
  });

  it("o modo viaja no lote quando não é codegen (review): a receita reproduz o payload medido, no mesmo modo", () => {
    const input: PrepareCodegenContextInput = { task: "Rever a segurança da plataforma", risk_level: "L3", mode: "review", concerns: ["auth", "integrity", "deployment"] };
    const blocked = handlePrepareCodegenContext({ ...input, detail: "lista" }) as Blocked;
    expect(blocked.status).toBe("needs_decomposition");
    for (const batch of blocked.requirement_ceiling!.batches) {
      expect((batch.with as { mode?: string }).mode).toBe("review");
      const r = handlePrepareCodegenContext({ task: input.task, risk_level: input.risk_level, detail: "lista", ...batch.with } as never) as { status: string; mode: string; size_estimate: { approx_tokens: number } };
      expect(r.status).toBe("ready_for_codegen");
      expect(r.mode).toBe("review");
      expect(r.size_estimate.approx_tokens).toBe(batch.measured_tk);
    }
  });
});
