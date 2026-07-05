/**
 * s0 — Gates de medição (epic v2-token-diet).
 *
 * Orçamento de payload POR SECÇÃO para `prepare_sbd_toe_codegen_context`,
 * contra as 2 fixtures baseline do EPIC (agentic/planeado/v2-token-diet/EPIC.md,
 * §Fixtures baseline, medidas 2026-07-05 na 0.20.0-beta.1):
 *
 *   fixture 1 ⇒ ≈18.903 tokens / 111 ids no citation_map
 *   fixture 2 ⇒ ≈24.731 tokens / 150 ids no citation_map
 *
 * A decomposição por secção espelha scripts/measure-codegen-payload.mjs (o
 * instrumento baseline, que corre sobre dist/); este teste corre sobre src/ e
 * usa `estimateSize` do seam src/serving/response-shaping.ts. As duas
 * estimativas diferem no arredondamento (ceil vs round ⇒ ±1 token) — os
 * budgets absorvem essa diferença.
 *
 * Estrutura por nível de `detail` (futuro parâmetro, slices s1–s3b):
 *   - `full`     = comportamento ATUAL (default). Budgets = baseline medido
 *                  + ~8% de margem, para apanhar regressões de tamanho.
 *   - `standard` = gates hard do EPIC (total ≤6.500 típico / ≤8.500
 *                  3-famílias). SKIPPED até o parâmetro `detail` existir.
 *   - `minimal`  = alvo s3b (total ≤2.000). SKIPPED até `detail` existir.
 *
 * O skip é condicional em runtime, em dois estágios (s1 aterrou 2026-07-05):
 *   1. probe `detailParamSupported` — o parâmetro `detail` existe (s1);
 *   2. sentinelas por slice (`s2RelationsRefLanded`/`s3CapsLanded`/
 *      `s3bMinimalLanded`) — os TOTAIS hard standard/minimal só vinculam
 *      quando os slices que cortam as secções pesadas aterrarem (s2+s3 para
 *      standard; s3b para minimal). Quando aterrarem, os testes ativam-se
 *      sozinhos (só recalibrar os budgets POR SECÇÃO provisórios, ver nota
 *      no BUDGETS — nunca baixar os TOTAIS).
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { estimateSize } from "../serving/response-shaping.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline. NÃO alterar sem
// atualizar o EPIC e scripts/measure-codegen-payload.mjs em conjunto.
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
  /** Baseline: nº exato de ids no citation_map (invariante do EPIC). */
  citationIds: number;
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica, ≈18.903 tokens)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    },
    citationIds: 111
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias, ≈24.731 tokens)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    },
    citationIds: 150
  }
];

// ---------------------------------------------------------------------------
// Decomposição por secção (espelha scripts/measure-codegen-payload.mjs)
// ---------------------------------------------------------------------------

/** Secções orçamentadas — as 6 do quadro baseline do EPIC + resto/boilerplate. */
type SectionName =
  | "g2_context.relations"
  | "manual_grounding"
  | "g2_context.evidence_patterns"
  | "citation_map"
  | "activated_scope"
  | "g2_entities"
  | "rest";

type SectionTokens = Record<SectionName, number> & { total: number };

function tok(value: unknown): number {
  return estimateSize(value).approx_tokens;
}

function sectionTokens(
  result: PrepareCodegenContextResultReady | PrepareCodegenContextResultReadyDieted
): SectionTokens {
  const total = tok(result);
  // Nas formas dieted (s2/s3) a secção equivalente é relations_ref / citations.
  const g2 = result.g2_context as {
    relations?: unknown;
    relations_ref?: unknown;
  };
  const relations = tok(g2.relations ?? g2.relations_ref);
  const manualGrounding = tok(result.manual_grounding);
  const evidencePatterns = tok(result.g2_context.evidence_patterns);
  const citationMap = tok(
    (result as { citation_map?: unknown }).citation_map ??
      (result as { citations?: unknown }).citations
  );
  const activatedScope = tok(result.activated_scope);
  // "entidades g2_context" = soma das 4 listas núcleo (como no quadro do EPIC).
  const g2Entities =
    tok(result.g2_context.control_objectives) +
    tok(result.g2_context.mechanisms) +
    tok(result.g2_context.practices) +
    tok(result.g2_context.artifacts);
  // "resto" = tudo o que não é uma das 6 secções acima (activation_trace,
  // llm_codegen_instructions, completeness_report, security_rationale_template,
  // next, provenance, input_echo, regulatory_overlay, status, mode) + overhead
  // estrutural do JSON — mesma convenção do quadro baseline (~1.240 na fixture 1).
  const rest =
    total -
    (relations + manualGrounding + evidencePatterns + citationMap + activatedScope + g2Entities);
  return {
    "g2_context.relations": relations,
    manual_grounding: manualGrounding,
    "g2_context.evidence_patterns": evidencePatterns,
    citation_map: citationMap,
    activated_scope: activatedScope,
    g2_entities: g2Entities,
    rest,
    total
  };
}

// ---------------------------------------------------------------------------
// Budgets declarados (tokens ≈ chars/4) por nível de `detail` e por fixture
// ---------------------------------------------------------------------------

type DetailLevel = "full" | "standard" | "minimal";
type SectionBudgets = Record<SectionName, number> & { total: number };

/**
 * `full`: baseline medido (2026-07-05, 0.20.0-beta.1) + ~8% de margem — a
 * margem justa pedida pelo s0 para apanhar regressões sem falsos positivos.
 *
 * `standard`/`minimal`: os TOTAIS são os gates hard do EPIC (§Orçamento:
 * standard ≤6.500 típico / ≤8.500 3-famílias; minimal ≤2.000). Os budgets POR
 * SECÇÃO destes dois níveis são PROVISÓRIOS, derivados dos deltas previstos
 * nos slices s1–s3b (citations invertido, grounding agrupado, relations→ref,
 * caps de evidence, +description no activated_scope) — recalibrar quando os
 * slices aterrarem; até lá o gate que vincula é o TOTAL.
 */
const BUDGETS: Record<DetailLevel, Record<BaselineFixture["name"], SectionBudgets>> = {
  full: {
    // Baseline fixture 1: relations 4.370 / grounding 3.572 / evidence 2.846 /
    // citation_map 2.677 / activated_scope 2.145 / entidades 2.057 / resto ≈1.236.
    fixture1: {
      "g2_context.relations": 4700,
      manual_grounding: 3850,
      "g2_context.evidence_patterns": 3050,
      citation_map: 2900,
      activated_scope: 2300,
      g2_entities: 2200,
      rest: 1350,
      total: 20400
    },
    // Baseline fixture 2: relations 6.238 / grounding 4.913 / evidence 2.846 /
    // citation_map 3.591 / activated_scope 2.923 / entidades 2.820 / resto ≈1.400.
    fixture2: {
      "g2_context.relations": 6700,
      manual_grounding: 5300,
      "g2_context.evidence_patterns": 3050,
      citation_map: 3900,
      activated_scope: 3150,
      g2_entities: 3050,
      rest: 1550,
      total: 26700
    }
  },
  // standard: budgets POR SECÇÃO recalibrados no s3 para os valores REAIS
  // medidos (2026-07-05, pós-s3: f1 = relations_ref 121 / grounding 333 /
  // evidence 1.054 / citations 169 / scope-com-description 3.076 / entidades
  // 642 / resto 762, total 6.157; f2 = 204 / 450 / 1.054 / 170 / 4.824 / 899 /
  // 757, total 8.358) + ~10% de margem justa. Os TOTAIS são os gates hard do
  // EPIC — intocados.
  standard: {
    fixture1: {
      "g2_context.relations": 150, // s2: relations_ref (lenses trace_sbd_toe_graph)
      manual_grounding: 380, // s1: agrupado por (chapter,file,sha)
      "g2_context.evidence_patterns": 1150, // s3: cap 25→10, sem relevance_score
      citation_map: 200, // s1+s3: citations invertido, ids via ids_from
      activated_scope: 3350, // núcleo mantém + `description` publicada (s3)
      g2_entities: 720, // núcleo — agrupado por slice (s3)
      rest: 850, // s3: instructions→resource, trace só com debug
      total: 6500 // 🔴 gate hard do EPIC (payload típico)
    },
    fixture2: {
      "g2_context.relations": 240,
      manual_grounding: 510,
      "g2_context.evidence_patterns": 1150,
      citation_map: 200,
      activated_scope: 5200,
      g2_entities: 1000,
      rest: 850,
      total: 8500 // 🔴 gate hard do EPIC (payload 3-famílias)
    }
  },
  minimal: {
    fixture1: {
      "g2_context.relations": 200,
      manual_grounding: 300,
      "g2_context.evidence_patterns": 800, // s3b: cap 5
      citation_map: 300,
      activated_scope: 900, // s3b: requirements top-10 + description, controls direct
      g2_entities: 450,
      rest: 400,
      total: 2000 // alvo s3b
    },
    fixture2: {
      "g2_context.relations": 200,
      manual_grounding: 300,
      "g2_context.evidence_patterns": 800,
      citation_map: 350,
      activated_scope: 900,
      g2_entities: 450,
      rest: 400,
      total: 2000 // alvo s3b (recalibrável em s3b se a task 3-famílias justificar)
    }
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectReady(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
}

function runFixture(fixture: BaselineFixture): PrepareCodegenContextResultReady {
  const result = handlePrepareCodegenContext(fixture.input);
  expectReady(result);
  return result;
}

/**
 * Deteção em runtime do futuro parâmetro `detail` (s1–s3b): hoje o handler
 * ignora propriedades desconhecidas, logo `detail: "<nível>"` devolve payload
 * byte-igual ao default. Quando o parâmetro existir, o output diverge e os
 * testes standard/minimal ativam-se automaticamente.
 */
function withDetail(
  input: PrepareCodegenContextInput,
  detail: Exclude<DetailLevel, "full">
): PrepareCodegenContextInput {
  return { ...input, detail } as unknown as PrepareCodegenContextInput;
}

function detailParamSupported(fixture: BaselineFixture): boolean {
  const withoutDetail = handlePrepareCodegenContext(fixture.input);
  const probe = handlePrepareCodegenContext(withDetail(fixture.input, "minimal"));
  return JSON.stringify(probe) !== JSON.stringify(withoutDetail);
}

/**
 * Sentinelas por slice (s1 aterrou; ver EPIC §Slices). O parâmetro `detail`
 * existe desde o s1 (dedup estrutural), mas os TOTAIS hard standard/minimal
 * só são alcançáveis com os slices que cortam as secções pesadas. Os budgets
 * NÃO são baixados nem os testes removidos — ficam skip até a sentinela do
 * slice correspondente aterrar, e ativam-se sozinhos nesse momento:
 *
 *  - s2 (relations on-demand): `g2_context.relations` deixa de vir inline em
 *    `standard` (passa a `relations_ref`). Sentinela: deixa de ser um array.
 *  - s3 (caps/boilerplate): cap de evidence_patterns desce 25→10 em
 *    `standard`. Sentinela: `completeness_report.evidence_pattern_cap <= 10`.
 *  - s3b (minimal codegen-lean): requirements top-N com omissão explícita
 *    (padrão total/returned/omitted) em `minimal`. Sentinela: o campo deixa
 *    de ser um array plano completo.
 *
 * Se a forma final de um slice divergir da sentinela aqui prevista, o
 * executor desse slice ajusta a sentinela NESTE ficheiro (nunca os budgets).
 */
function s2RelationsRefLanded(result: PrepareCodegenContextResultReady): boolean {
  return !Array.isArray(result.g2_context.relations);
}

function s3CapsLanded(result: PrepareCodegenContextResultReady): boolean {
  return result.completeness_report.evidence_pattern_cap <= 10;
}

function s3bMinimalLanded(result: PrepareCodegenContextResultReady): boolean {
  return !Array.isArray(result.activated_scope.requirements);
}

/** Resolve um path `ids_from` sobre o próprio payload dieted (mini-sintaxe
 * documentada no resource sbd://toe/codegen-instructions/{mode},
 * detail_encoding.citations). */
function idsAtPath(payload: unknown, path: string): string[] {
  const root = payload as Record<string, Record<string, unknown>>;
  const keysMatch = /^keys\(g2_context\.([a-z_]+)\[slice\]\)$/.exec(path);
  if (keysMatch) {
    const grouped = (root.g2_context?.[keysMatch[1]!] ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    return Object.values(grouped).flatMap((entities) => Object.keys(entities));
  }
  const listMatch = /^([a-z_]+)\.([a-z_]+)\[\]\.([a-z_]+)$/.exec(path);
  if (!listMatch) throw new Error(`ids_from path desconhecido: ${path}`);
  const list = (root[listMatch[1]!]?.[listMatch[2]!] ?? []) as Array<
    Record<string, string>
  >;
  return list.map((item) => item[listMatch[3]!]!);
}

function assertSectionBudgets(measured: SectionTokens, budgets: SectionBudgets): void {
  for (const section of Object.keys(budgets) as (keyof SectionBudgets)[]) {
    expect(
      measured[section],
      `secção "${section}" excedeu o budget: ${measured[section]} > ${budgets[section]} tokens (≈chars/4)`
    ).toBeLessThanOrEqual(budgets[section]);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — orçamento de payload (v2-token-diet s0)", () => {
  const results = new Map<BaselineFixture["name"], PrepareCodegenContextResultReady>();
  let detailSupported = false;

  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
    for (const fixture of FIXTURES) {
      results.set(fixture.name, runFixture(fixture));
    }
    detailSupported = detailParamSupported(FIXTURES[0]!);
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    it("respeita os budgets por secção do nível `full` (= comportamento atual)", () => {
      const measured = sectionTokens(results.get(fixture.name)!);
      assertSectionBudgets(measured, BUDGETS.full[fixture.name]);
    });

    it("citation_map cobre exatamente o nº baseline de ids (invariante do EPIC)", () => {
      const result = results.get(fixture.name)!;
      expect(Object.keys(result.citation_map).length).toBe(fixture.citationIds);
    });

    it("é determinístico: 2 chamadas idênticas ⇒ payload byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContext(fixture.input);
      const second = handlePrepareCodegenContext(fixture.input);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      // E byte-igual à execução do beforeAll (independente do estado de cache).
      expect(JSON.stringify(first)).toBe(JSON.stringify(results.get(fixture.name)!));
    });

    // -- standard/minimal: declarados JÁ, ativos só quando `detail` existir --
    // (skip condicional em runtime — ver detailParamSupported. Não usar
    // test.todo aqui para que a ativação seja automática quando s1–s3b
    // aterrarem, sem edição deste ficheiro.)

    it("respeita os budgets do nível `standard` (gates hard do EPIC) [pendente s1–s3]", (ctx) => {
      if (!detailSupported) {
        ctx.skip(); // parâmetro `detail` ainda não existe (pré-s1)
        return;
      }
      const result = handlePrepareCodegenContext(withDetail(fixture.input, "standard"));
      expectReady(result);
      if (!s2RelationsRefLanded(result) || !s3CapsLanded(result)) {
        // s1 (dedup estrutural) aterrou, mas o total ≤6.5K/8.5K só é
        // alcançável com s2 (relations→ref, −4.3K) + s3 (caps/boilerplate)
        // — ver EPIC §Slices. Sentinelas acima; budgets intactos.
        ctx.skip();
        return;
      }
      assertSectionBudgets(sectionTokens(result), BUDGETS.standard[fixture.name]);
    });

    it("respeita os budgets do nível `minimal` (alvo s3b ≤2K) [pendente s3b]", (ctx) => {
      if (!detailSupported) {
        ctx.skip(); // parâmetro `detail` ainda não existe (pré-s1)
        return;
      }
      const result = handlePrepareCodegenContext(withDetail(fixture.input, "minimal"));
      expectReady(result);
      if (!s3bMinimalLanded(result)) {
        // s1 trata `minimal` como `standard`; o alvo ≤2K só chega com o
        // perfil codegen-lean do s3b (top-N + omissão explícita). Sentinela
        // acima; budgets intactos.
        ctx.skip();
        return;
      }
      assertSectionBudgets(sectionTokens(result), BUDGETS.minimal[fixture.name]);
    });

    it("conjunto de ids citáveis idêntico em todos os níveis de `detail` [pendente s1]", (ctx) => {
      if (!detailSupported) {
        ctx.skip(); // parâmetro `detail` ainda não existe (pré-s1)
        return;
      }
      // Invariante 3 do EPIC: muda a codificação, não o conjunto. Desde o s3
      // os ids citáveis vivem nas secções do payload e
      // citations.<source>.ids_from referencia-os (run-length source_data
      // alinhado 1:1) — extração via a mesma regra documentada no resource
      // (detail_encoding.citations), com fallback para ids explícitos.
      const fullIds = Object.keys(results.get(fixture.name)!.citation_map).sort();
      for (const detail of ["standard", "minimal"] as const) {
        const result = handlePrepareCodegenContext(withDetail(fixture.input, detail));
        expectReady(result);
        const shaped = result as unknown as {
          citation_map?: Record<string, unknown>;
          citations?: Record<string, { ids_from?: string[]; ids?: string[] }>;
        };
        const ids = shaped.citation_map
          ? Object.keys(shaped.citation_map)
          : Object.values(shaped.citations ?? {}).flatMap(
              (group) =>
                group.ids ??
                (group.ids_from ?? []).flatMap((path) => idsAtPath(shaped, path))
            );
        expect([...new Set(ids)].sort()).toEqual(fullIds);
      }
    });
  });
});
