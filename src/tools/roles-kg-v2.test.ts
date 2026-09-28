/**
 * 0.22.0 — verificação dos papéis contra o KG v2.0.0 (passo 5 do despacho do lead).
 *
 * 17 papéis canónicos (os 13 de antes + rh-peopleops, procurement, legal e o 17.º do Manual), aliases
 * publicados pelo KG (pentester → appsec-engineer; secops* → operacoes), e unknown_role declarado com
 * os valores suportados — nunca inventado.
 */
import { describe, expect, it } from "vitest";
import { getOntologyData } from "./ontology-loader.js";
import { handleGetGuideByRole } from "./get-guide-by-role.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("0.22.0 — papéis do KG v2.0.0", () => {
  const ids = (getOntologyData().roles as Array<{ role_id: string }>).map((r) => r.role_id).sort();

  it("17 papéis canónicos, incluindo rh-peopleops, procurement e legal", () => {
    expect(ids).toHaveLength(17);
    for (const r of ["appsec-engineer", "operacoes", "devops-sre", "rh-peopleops", "procurement", "legal"]) expect(ids).toContain(r);
  });

  it("SecOps resolve pelo dado para operacoes e traz a banda da vista repartida", () => {
    const g = handleGetGuideByRole({ risk_level: "L2", role: "SecOps" } as never) as unknown as Any;
    const d = g.data ?? g;
    expect(d.canonicalRole).toBe("operacoes");
    expect(d.role_scope_split).toBeDefined();
    expect(d.unknown_role).toBeUndefined();
  });

  it("pentester resolve pelo dado para appsec-engineer", () => {
    const g = handleGetGuideByRole({ risk_level: "L2", role: "pentester" } as never) as unknown as Any;
    expect((g.data ?? g).canonicalRole).toBe("appsec-engineer");
  });

  it("papel desconhecido: unknown_role declarado, com os 17 valores suportados — nunca inventado", () => {
    const g = handleGetGuideByRole({ risk_level: "L2", role: "astronauta" } as never) as unknown as Any;
    const u = (g.data ?? g).unknown_role;
    expect(u.requested).toBe("astronauta");
    expect(u.resolved).toBeNull();
    expect([...u.supported_values].sort()).toEqual(ids);
  });

  it("o vocabulário publica os mesmos 17 papéis", () => {
    const v = buildActivationVocabulary() as Any;
    expect((v.roles.values as Any[]).map((x) => x.value).sort()).toEqual(ids);
  });
});
