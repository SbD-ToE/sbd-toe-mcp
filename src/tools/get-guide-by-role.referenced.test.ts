/**
 * A banda `referenced_role` (papel que o Manual NOMEIA mas não é canónico) — coberta por dado SINTÉTICO.
 *
 * Desde a ontologia v2.11 (KG v2.0.0) o dado real não tem papéis referenciados: RH/PeopleOps foi canonizado
 * (17 papéis) e `referenced_roles.items` = []. A banda continua a ser contrato — se o Manual voltar a nomear um
 * papel não canónico, tem de chegar ao consumidor como o que é. Este teste injecta um referenciado e prova-a:
 * canonical:false, âncoras, fora do vocabulário, e a contagem canónica DERIVADA (nunca «13» nem «14.º» fixos).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../serving/traversal-assertions.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../serving/traversal-assertions.js")>();
  return {
    ...orig,
    referencedRoleFor: (value: string) =>
      /^jur[ií]dico$/i.test(value)
        ? { referenced_role_id: "juridico-sintetico", label: "Jurídico", canonical: false, anchors: ["14-governanca-contratacao/x.md:1 (sintético)"] }
        : undefined
  };
});

const { handleGetGuideByRole } = await import("./get-guide-by-role.js");
const { getOntologyData } = await import("./ontology-loader.js");

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("banda referenced_role (dado sintético)", () => {
  it("um papel referenciado chega como o que é: canonical:false, âncoras, fora do vocabulário, contagem derivada", () => {
    const n = (getOntologyData().roles ?? []).length;
    const g = handleGetGuideByRole({ risk_level: "L2", role: "Jurídico" } as never) as unknown as Any;
    const d = g.data ?? g;
    const ref = d.referenced_role;
    expect(ref).toBeDefined();
    expect(ref.canonical).toBe(false);
    expect(ref.anchors.length).toBeGreaterThan(0);
    expect(ref.note).toContain(`Não é o ${n + 1}.º papel`);
    expect(ref.note).toContain(`os canónicos continuam a ser ${n}`);
    expect(d.unknown_role).toBeUndefined();
    const known = (d.meta?.knownRoles ?? []).filter((r: string) => r !== "unassigned");
    expect(known).not.toContain(ref.referenced_role_id);
  });
});
