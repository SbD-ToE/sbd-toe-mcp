/**
 * 0.21 — a adjacência declarada: o que o chamador NÃO declarou e que mudaria o conjunto.
 *
 * O que estes testes guardam não é o conteúdo (esse vem do bundle pinado e muda com ele) — é a
 * DISCIPLINA: nunca truncar em silêncio, ser reproduzível, e não afirmar mais do que se calculou.
 */
import { describe, it, expect } from "vitest";
import { buildDeclaredAdjacency, ADJACENCY_TOP_N } from "./adjacency.js";
import { runSelection } from "./selection.js";

const BASE = { risk_level: "L2" as const, concerns: ["auth"] };

describe("adjacência declarada", () => {
  it("nomeia no máximo o tecto, e o DENOMINADOR vai sempre ao lado — truncar em silêncio não acontece", () => {
    const a = buildDeclaredAdjacency(BASE);
    expect(a.undeclared_that_would_change_the_set.length).toBeLessThanOrEqual(ADJACENCY_TOP_N);
    expect(a.shown).toBe(a.undeclared_that_would_change_the_set.length);
    // o total é conhecido e declarado, mesmo quando é muito maior do que o que se mostra
    expect(a.would_change_the_set).toBeGreaterThanOrEqual(a.shown);
    expect(a.scanned).toBeGreaterThanOrEqual(a.would_change_the_set);
    // e o ref diz como obter o resto — a lista completa nunca fica inalcançável
    expect(a.detail_ref).toContain(String(a.would_change_the_set));
    expect(a.detail_ref).toContain("select_sbd_toe_requirements");
  });

  it("é reproduzível: duas construções dão o mesmo, byte a byte", () => {
    expect(JSON.stringify(buildDeclaredAdjacency({ ...BASE }))).toBe(
      JSON.stringify(buildDeclaredAdjacency({ ...BASE, concerns: ["auth"] }))
    );
  });

  it("ordena por impacto, e o desempate é estável (kind, depois nome)", () => {
    const a = buildDeclaredAdjacency(BASE);
    for (let i = 1; i < a.undeclared_that_would_change_the_set.length; i += 1) expect(a.undeclared_that_would_change_the_set[i - 1]!.would_add).toBeGreaterThanOrEqual(a.undeclared_that_would_change_the_set[i]!.would_add);
  });

  it("cada `would_add` é VERDADE: declarar o sinal acrescenta exactamente esse número de ids", () => {
    const baseIds = new Set(runSelection(BASE).selected.map((r) => r.requirement_id));
    for (const s of buildDeclaredAdjacency(BASE).undeclared_that_would_change_the_set) {
      const withSignal =
        s.kind === "concern"
          ? { ...BASE, concerns: [...BASE.concerns, s.signal] }
          : s.kind === "technology"
            ? { ...BASE, technologies: [s.signal] }
            : s.kind === "exposure"
              ? { ...BASE, exposure: s.signal }
              : { ...BASE, data_sensitivity: s.signal };
      const added = runSelection(withSignal).selected.filter((r) => !baseIds.has(r.requirement_id)).length;
      expect(added, `${s.kind}=${s.signal}`).toBe(s.would_add);
    }
  });

  it("nunca nomeia um sinal JÁ declarado — a adjacência é o que falta, não o que já se pediu", () => {
    const a = buildDeclaredAdjacency({ risk_level: "L2", concerns: ["auth", "logging"], exposure: "public" });
    const named = a.undeclared_that_would_change_the_set.map((s) => s.signal);
    expect(named).not.toContain("auth");
    expect(named).not.toContain("logging");
    expect(named).not.toContain("public");
    // e um exposure declarado não volta a ser sondado
    expect(a.undeclared_that_would_change_the_set.some((s) => s.kind === "exposure")).toBe(false);
  });

  it("só entram sinais com impacto: `would_add` é sempre > 0", () => {
    for (const s of buildDeclaredAdjacency(BASE).undeclared_that_would_change_the_set) expect(s.would_add).toBeGreaterThan(0);
  });

  it("declara o que NÃO é — não se apresenta como leitura da tarefa", () => {
    expect(buildDeclaredAdjacency(BASE).reading.toLowerCase()).toContain("não leitura da tarefa");
  });
});
