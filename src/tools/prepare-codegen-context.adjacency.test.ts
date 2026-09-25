/**
 * 0.21 §2 — A ADJACÊNCIA DECLARADA, ligada ao prepare.
 *
 * O que estes testes guardam é a DISCIPLINA da ligação (o conteúdo vem do bundle pinado):
 *   - o bloco existe em TODOS os níveis, o mais magro incluído (é correcção, não detalhe);
 *   - o resumo é o top-N por impacto com o denominador ao lado — nunca se trunca em silêncio;
 *   - o detalhe (a lista completa) vai inline em standard/full, e o resumo é o seu prefixo;
 *   - em lista o detalhe vai por REFERÊNCIA executável — e executa-se de verdade;
 *   - é o mesmo bloco que o módulo produz para a MESMA declaração (a ligação não reinterpreta);
 *   - nunca nomeia um sinal já declarado; nunca acrescenta ids citáveis (invariante 3 intacta).
 */
import { describe, expect, it } from "vitest";
import {
  citableIds,
  handlePrepareCodegenContext,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResultReadyDieted,
  type PrepareCodegenContextResultReadyFull
} from "./prepare-codegen-context.js";
import { ADJACENCY_TOP_N, buildDeclaredAdjacency, declaredAdjacencyDetail } from "../serving/adjacency.js";

const CASES: Array<[string, PrepareCodegenContextInput]> = [
  ["auth/L2", { task: "Implementar autenticação de utilizadores", risk_level: "L2", concerns: ["auth"] }],
  ["auth+validation/L2", { task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", concerns: ["auth", "validation"] }],
  // declaração completa (exposure + data_sensitivity) dentro do tecto: a adjacência não pode nomear o que já foi declarado
  ["API interna/L2 declarada", { task: "Expor API interna de consulta", risk_level: "L2", exposure: "internal", data_sensitivity: "low", concerns: ["api"] }]
];

type Ready = PrepareCodegenContextResultReadyFull | PrepareCodegenContextResultReadyDieted;
function ready(input: PrepareCodegenContextInput, detail: "lista" | "standard" | "full"): Ready {
  const r = handlePrepareCodegenContext({ ...input, detail });
  expect(r.status).toBe("ready_for_codegen");
  return r as Ready;
}

describe("0.21 §2 — adjacência declarada no prepare", () => {
  it.each(CASES)("%s: o bloco existe nos três níveis, com resumo top-N e denominadores iguais aos do módulo", (_n, input) => {
    const base = { risk_level: input.risk_level!, ...(input.concerns ? { concerns: input.concerns } : {}), ...(input.exposure ? { exposure: input.exposure } : {}), ...(input.data_sensitivity ? { data_sensitivity: input.data_sensitivity } : {}) };
    const module = buildDeclaredAdjacency(base);
    for (const detail of ["lista", "standard", "full"] as const) {
      const r = ready(input, detail);
      const a = r.adjacency;
      expect(a.undeclared_that_would_change_the_set.length).toBeLessThanOrEqual(ADJACENCY_TOP_N);
      expect(a.shown).toBe(a.undeclared_that_would_change_the_set.length);
      expect(a.would_change_the_set).toBeGreaterThanOrEqual(a.shown);
      expect(a.scanned).toBeGreaterThanOrEqual(a.would_change_the_set);
      // a ligação não reinterpreta: é o bloco do módulo para a mesma declaração
      expect(JSON.stringify(a.undeclared_that_would_change_the_set)).toBe(JSON.stringify(module.undeclared_that_would_change_the_set));
      expect([a.scanned, a.would_change_the_set, a.shown]).toEqual([module.scanned, module.would_change_the_set, module.shown]);
      // ordenado por impacto
      for (let i = 1; i < a.undeclared_that_would_change_the_set.length; i += 1)
        expect(a.undeclared_that_would_change_the_set[i - 1]!.would_add).toBeGreaterThanOrEqual(a.undeclared_that_would_change_the_set[i]!.would_add);
      // nunca nomeia o que já foi declarado
      for (const s of a.undeclared_that_would_change_the_set) {
        if (s.kind === "concern") expect(input.concerns ?? []).not.toContain(s.signal);
        if (s.kind === "exposure") expect(input.exposure).toBeUndefined();
        if (s.kind === "data_sensitivity") expect(input.data_sensitivity).toBeUndefined();
      }
      // a prosa não viaja no payload (vive na legenda do resource)
      expect(a).not.toHaveProperty("reading");
    }
  });

  it.each(CASES)("%s: detalhe inline em standard/full (o resumo é o seu prefixo), por REFERÊNCIA executável em lista", (_n, input) => {
    const base = { risk_level: input.risk_level!, ...(input.concerns ? { concerns: input.concerns } : {}), ...(input.exposure ? { exposure: input.exposure } : {}), ...(input.data_sensitivity ? { data_sensitivity: input.data_sensitivity } : {}) };
    const detail = declaredAdjacencyDetail(base);
    for (const level of ["standard", "full"] as const) {
      const a = ready(input, level).adjacency;
      expect(a.detail_ref).toBeUndefined();
      expect(JSON.stringify(a.detail)).toBe(JSON.stringify(detail));
      expect(a.detail!.length).toBe(a.would_change_the_set);
      expect(JSON.stringify(a.detail!.slice(0, a.shown))).toBe(JSON.stringify(a.undeclared_that_would_change_the_set));
    }
    const lista = ready(input, "lista").adjacency;
    expect(lista.detail).toBeUndefined();
    expect(lista.detail_ref?.tool).toBe("prepare_sbd_toe_codegen_context");
    expect(lista.detail_ref?.with).toEqual({ detail: "standard" });
    expect(lista.detail_ref?.note).toMatch(/select_sbd_toe_requirements/);
    // EXECUTA a referência: o standard traz a lista completa, com o mesmo denominador
    const followUp = ready({ ...input, detail: lista.detail_ref!.with.detail }, "standard").adjacency;
    expect(followUp.detail!.length).toBe(lista.would_change_the_set);
    expect(JSON.stringify(followUp.undeclared_that_would_change_the_set)).toBe(JSON.stringify(lista.undeclared_that_would_change_the_set));
  });

  it("a adjacência não acrescenta ids citáveis (invariante 3 intacta) e os seus sinais são vocabulário, não ids", () => {
    const input = CASES[0]![1];
    const ids = new Set(citableIds(ready(input, "full")));
    for (const level of ["lista", "standard", "full"] as const) {
      const a = ready(input, level).adjacency;
      expect([...new Set(citableIds(ready(input, level)))].sort()).toEqual([...ids].sort());
      for (const s of [...a.undeclared_that_would_change_the_set, ...(a.detail ?? [])]) {
        expect(ids.has(s.signal)).toBe(false);
        expect(s.signal).toMatch(/^[a-z0-9_.-]+$/); // vocabulário (concerns, exposure, data_sensitivity, tecnologias como sca-sbom)
        expect(s.would_add).toBeGreaterThan(0);
      }
    }
  });

  it("o resumo cabe no orçamento anunciado (~150–200 tk) em lista; o detalhe é o separador lista↔standard", () => {
    const tk = (x: unknown) => Math.round(JSON.stringify(x).length / 4);
    const input = CASES[0]![1];
    const lista = ready(input, "lista");
    const standard = ready(input, "standard");
    expect(tk(lista.adjacency)).toBeLessThanOrEqual(200);
    expect(tk(standard.adjacency)).toBeGreaterThan(tk(lista.adjacency));
    // fora do eco, do envelope declarado e da adjacência, lista ≡ standard
    const norm = (r: Ready) => JSON.stringify({ ...r, input_echo: null, size_estimate: null, adjacency: null });
    expect(norm(lista)).toBe(norm(standard));
  });

  it("caminho blocked: sem bloco de adjacência (a adjacência é de uma selecção pronta)", () => {
    const r = handlePrepareCodegenContext({ task: "make the whole application secure please", risk_level: "L2" });
    expect(r.status).not.toBe("ready_for_codegen");
    expect(r).not.toHaveProperty("adjacency");
  });
});
