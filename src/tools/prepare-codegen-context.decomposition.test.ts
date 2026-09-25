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
 */
import { describe, expect, it } from "vitest";
import { handlePrepareCodegenContext, type PrepareCodegenContextInput } from "./prepare-codegen-context.js";
import { REQUIREMENT_CEILING_BY_DETAIL } from "../serving/payload-ceilings.js";

const CASES: Array<[string, PrepareCodegenContextInput]> = [
  ["caso real dos 83 — auth+integrity+deployment / L3", { task: "Rever a segurança da plataforma", risk_level: "L3", concerns: ["auth", "integrity", "deployment"] }],
  ["caso da avaliação — auth+api+validation, public, personal / L3", { task: "Expor API pública com autenticação e validação", risk_level: "L3", concerns: ["auth", "api", "validation"], exposure: "public", data_sensitivity: "personal" }],
  ["caso da avaliação com technologies — + jwt", { task: "Expor API pública com autenticação e validação", risk_level: "L3", concerns: ["auth", "api", "validation"], exposure: "public", data_sensitivity: "personal", technologies: ["jwt"] }]
];

type Blocked = {
  status: string;
  suggestions?: string[];
  requirement_ceiling?: {
    limit: number;
    selected: number;
    batches: Array<{ with: { categories: string[]; technologies?: string[]; changed_files?: string[] }; requirements: number; derived_from: { concerns: string[]; exposure?: string; data_sensitivity?: string } }>;
    union: { requirements: number; recall: number };
  };
};

describe("0.21 §6 — decomposição que soma o todo (condição da decisão (a))", () => {
  it.each(CASES)("%s: lista bloqueia declarado; cada lote cabe, executa e a UNIÃO dos lotes cobre a selecção inteira (m_recall = 1)", (_n, input) => {
    for (const detail of ["lista", "standard"] as const) {
      const blocked = handlePrepareCodegenContext({ ...input, detail }) as Blocked;
      expect(blocked.status).toBe("needs_decomposition");
      const rc = blocked.requirement_ceiling!;
      expect(rc.limit).toBe(REQUIREMENT_CEILING_BY_DETAIL[detail]);
      expect(rc.selected).toBeGreaterThan(rc.limit);
      expect(rc.batches.length).toBeGreaterThan(1);
      // o servidor declara a união e o recall — e o teste não confia: executa
      expect(rc.union.recall).toBe(1);
      const full = handlePrepareCodegenContext({ ...input, detail: "full" }) as { status: string; activated_scope: { requirements: Array<{ id: string }> } };
      expect(full.status).toBe("ready_for_codegen");
      const fullIds = new Set(full.activated_scope.requirements.map((r) => r.id));
      expect(fullIds.size).toBe(rc.selected);
      const union = new Set<string>();
      for (const batch of rc.batches) {
        expect(batch.requirements).toBeLessThanOrEqual(rc.limit);
        expect(batch.with.categories.length).toBeGreaterThan(0);
        // technologies/changed_files PRESERVADOS literalmente em cada lote
        if (input.technologies?.length) expect(batch.with.technologies).toEqual(input.technologies);
        else expect(batch.with).not.toHaveProperty("technologies");
        // a receita executa-se tal e qual: task + risk_level + detail + with
        const r = handlePrepareCodegenContext({ task: input.task, risk_level: input.risk_level, detail, ...batch.with }) as { status: string; activated_scope: { requirements: Array<{ id: string }> } };
        expect(r.status, `lote ${JSON.stringify(batch.with)}`).toBe("ready_for_codegen");
        expect(r.activated_scope.requirements.length).toBe(batch.requirements); // a contagem declarada é a REAL
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
});
