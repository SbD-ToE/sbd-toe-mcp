/**
 * 0.20.0-beta.21 («declarativo primeiro»): ESTE ficheiro mede CODIFICAÇÃO (dieta v2),
 * não selecção. Para a série de medições continuar comparável byte a byte, as fixtures
 * correm no caminho inferencial histórico — `selection_mode: "discover"` — injectado
 * em `handlePrepareCodegenContext` pelo wrapper abaixo. A selecção declarativa tem os
 * seus próprios testes (selection.declarative.test.ts + next-invariant.beta).
 */
/**
 * s0 — Gates de medição (epic v2-token-diet).
 *
 * Orçamento de payload POR SECÇÃO para `prepare_sbd_toe_codegen_context`,
 * contra as 2 fixtures baseline do EPIC (agentic/planeado/v2-token-diet/EPIC.md,
 * §Fixtures baseline, medidas 2026-07-05 na 0.20.0-beta.1):
 *
 *   fixture 1 ⇒ ≈18.903 tokens / 111 ids citáveis (citation_map; 0.21 §3: `citations` em todos os níveis)
 *   fixture 2 ⇒ ≈24.731 tokens / 150 ids citáveis
 *
 * A decomposição por secção espelha scripts/measure-codegen-payload.mjs (o
 * instrumento baseline, que corre sobre dist/); este teste corre sobre src/ e
 * usa `estimateSize` do seam src/serving/response-shaping.ts. As duas
 * estimativas diferem no arredondamento (ceil vs round ⇒ ±1 token) — os
 * budgets absorvem essa diferença.
 *
 * Estrutura por nível de `detail` (0.21 §5 — três níveis):
 *   - `full`     = default. Budgets = medição da forma fundida + ~8% de margem,
 *                  para apanhar regressões de tamanho. Sem envelope (declara o preço).
 *   - `standard` = TOTAL = envelope herdado 9.200 (ratificado 2026-08-31).
 *   - `lista`    = TOTAL = envelope herdado do minimal 8.450 (ratificado 2026-08-31).
 *
 * Sentinelas: `s2RelationsRefLanded` (relations por referência) e `s1FusionLanded`
 * (requisito fundido, sem bloco evidence_patterns). Onde a forma fundida não cabe no
 * envelope, o desvio é DECLARADO em KNOWN_TOTAL_DEVIATIONS (nunca se baixa o gate em
 * silêncio) e o próprio payload di-lo em size_estimate.within_envelope.
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  citableIds,
  type PrepareCodegenContextResultReadyFull as PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { estimateSize } from "../serving/response-shaping.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __prepareRaw = handlePrepareCodegenContext;
const handlePrepareCodegenContextDiscover = (input: Parameters<typeof __prepareRaw>[0]) =>
  __prepareRaw({ selection_mode: "discover", ...input });


// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline. NÃO alterar sem
// atualizar o EPIC e scripts/measure-codegen-payload.mjs em conjunto.
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
  /** Baseline: nº exato de ids citáveis (invariante do EPIC; 0.21 §3: lidos de `citations` por citableIds). */
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
    // 111 on bundle v1.5.0 … v1.6.0 (EPIC baseline). 112 since the formal KG v1.6.1
    // pin (0.20.0-beta.4, contract v1.12 curated requirement→control layer v2):
    // one re-targeted link adds a direct control (9 → 10) to this fixture's
    // activated set. Data change, not a serving change. 104 since P3 do ciclo MP1
    // (2026-08-31): R2:narrowing-de-sinais-SES — a tarefa não tem sinais de
    // sessão/login/token de utilizador, SES-001..008 saem por narrowing declarado
    // (regra de serving, decisão pós-P2 do lead; não é alteração de dados).
    citationIds: 104
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias, ≈24.731 tokens)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    },
    // 150 on bundle v1.5.0 (EPIC baseline). 151 since the dev-build
    // kg-v1-manual-v1.7.0-aligned-2026-08-29 pin (0.20.0-beta.3): the bundle
    // publishes OPS-015 (ch. 12), which this fixture activates via `logging`
    // → +1 requirement in the activated set. Data growth, not a serving change.
    // 143 since P3 do ciclo MP1 (2026-08-31): R2:narrowing-de-sinais-SES (−8,
    // SES-001..008) — sem sinais de sessão na tarefa; regra de serving declarada.
    // 143 até v1.7.0; 152 desde o dev-build v1.8.0 (a fixture é um endpoint de
    // upload — o catálogo FIL aplica-se-lhe de facto: FIL ×8 + 1 controlo directo).
    citationIds: 152
  }
];

// ---------------------------------------------------------------------------
// Decomposição por secção (espelha scripts/measure-codegen-payload.mjs)
// ---------------------------------------------------------------------------

/** Secções orçamentadas — as 6 do quadro baseline do EPIC + resto/boilerplate. */
type SectionName =
  | "g2_context.relations"
  | "manual_grounding"
  | "citations"
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
    relations_summary?: unknown;
  };
  // 0.21 §3: full → relations_ref; lista/standard → relations_summary (a contabilidade).
  const relations = tok(g2.relations ?? g2.relations_ref ?? g2.relations_summary);
  const manualGrounding = tok(result.manual_grounding);
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
  // 0.21 §1: o bloco evidence_patterns morreu — o padrão vai fundido no requisito
  // (dentro de activated_scope); a secção deixa de existir no quadro.
  const rest =
    total -
    (relations + manualGrounding + citationMap + activatedScope + g2Entities);
  return {
    "g2_context.relations": relations,
    manual_grounding: manualGrounding,
    citations: citationMap,
    activated_scope: activatedScope,
    g2_entities: g2Entities,
    rest,
    total
  };
}

// ---------------------------------------------------------------------------
// Budgets declarados (tokens ≈ chars/4) por nível de `detail` e por fixture
// ---------------------------------------------------------------------------

type DetailLevel = "full" | "standard" | "lista";
type SectionBudgets = Record<SectionName, number> & { total: number };

/**
 * 0.21 §1+§3 (2026-09-25) — a forma mudou de propósito, os budgets re-fixam-se
 * por MEDIÇÃO da forma servida (+~5–8% de margem), e os TOTAIS dos níveis com
 * envelope são os ENVELOPES HERDADOS ratificados (lista 8.450 / standard
 * 9.200 — por nível, não por fixture). Onde a forma fundida não cabe no
 * envelope, a diferença é DECLARADA em KNOWN_TOTAL_DEVIATIONS — nunca um
 * levantamento silencioso do gate.
 *
 * Medição 2026-09-25 pós-§3 (dist; secções relations(ref|summary) / grounding /
 * citations / scope / entidades / resto):
 *   full     f1 121 / 3.572 / 166 / 4.754 / 2.058 / 1.605 = 12.276   (§1: 18.896; 0.20.0: 18.903)
 *            f2 204 / 4.913 / 166 / 10.119 / 2.822 / 1.843 = 20.067  (§1: 29.588)
 *   standard f1 ~85 / 237 / 167 / 4.462 / 642 / ~1.475 = 7.067      (§1: 7.105)
 *            f2 ~85 / 274 / 167 / 9.662 / 899 / ~1.610 = 12.696     (§1: 12.746)
 *   lista    idem standard −1 (só o eco do nível difere até à §2)
 *
 * §3 no full: citation_map (2.549/3.664) → citations invertido (166) e relations
 * inline (4.370/6.239) → relations_ref (121/204): −35% / −32%. Nos dieted a §3
 * troca relations_ref por relations_summary (−~40 tk): a base quase não mexe —
 * é o requisito fundido (~133 tk/req) que decide o tamanho.
 */
const BUDGETS: Record<DetailLevel, Record<BaselineFixture["name"], SectionBudgets>> = {
  full: {
    fixture1: {
      "g2_context.relations": 150, // 0.21 §3: relations_ref no full (medido 121)
      manual_grounding: 3850,
      citations: 200, // 0.21 §3: invertido no full (medido 166; era citation_map 2.549)
      activated_scope: 5100, // 0.21 §1: requisito fundido (description+verify+evidence) + description dos controlos directos — medido 4.754
      g2_entities: 2200,
      rest: 1730, // medido 1.605 (inclui size_estimate declarado)
      total: 13300 // medido 12.276 + ~8% (0.20.0: 20.400)
    },
    fixture2: {
      "g2_context.relations": 250, // relations_ref (medido 204)
      manual_grounding: 5300,
      citations: 200, // medido 166 (era 3.664)
      activated_scope: 10900, // medido 10.119 (69 requisitos fundidos)
      g2_entities: 3050,
      rest: 1990, // medido 1.843
      total: 21700 // medido 20.067 + ~8%
    }
  },
  standard: {
    fixture1: {
      "g2_context.relations": 100, // 0.21 §3: relations_summary (contabilidade; medido ~85)
      manual_grounding: 260, // 0.21: forma de contagens + entries_ref (era agrupada: 333)
      citations: 200,
      activated_scope: 4700, // medido 4.462 (fundido)
      g2_entities: 720,
      rest: 1560, // medido ~1.475 (instruções + template INLINE, verification, size_estimate)
      total: 9200 // 🔴 envelope herdado (ratificado 2026-08-31, mantido 2026-09-25)
    },
    fixture2: {
      "g2_context.relations": 100,
      manual_grounding: 300,
      citations: 200,
      activated_scope: 10200, // medido 9.662 (69 requisitos fundidos)
      g2_entities: 1000,
      rest: 1700, // medido ~1.610
      total: 9200 // 🔴 envelope herdado — NÃO CABE (medido 12.696): desvio declarado abaixo
    }
  },
  lista: {
    fixture1: {
      "g2_context.relations": 100,
      manual_grounding: 260,
      citations: 200,
      activated_scope: 4700,
      g2_entities: 720,
      rest: 1560,
      total: 8450 // 🔴 envelope herdado do minimal (ratificado 2026-08-31, herdado 2026-09-25)
    },
    fixture2: {
      "g2_context.relations": 100,
      manual_grounding: 300,
      citations: 200,
      activated_scope: 10200,
      g2_entities: 1000,
      rest: 1700,
      total: 8450 // 🔴 envelope herdado — NÃO CABE (medido 12.695): desvio declarado abaixo
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
  const result = handlePrepareCodegenContextDiscover(fixture.input);
  expectReady(result);
  return result;
}

function withDetail(
  input: PrepareCodegenContextInput,
  detail: Exclude<DetailLevel, "full">
): PrepareCodegenContextInput {
  return { ...input, detail };
}

/** O parâmetro `detail` existe desde o s1; a sonda fica pela disciplina (activação automática). */
function detailParamSupported(fixture: BaselineFixture): boolean {
  const withoutDetail = handlePrepareCodegenContextDiscover(fixture.input);
  const probe = handlePrepareCodegenContextDiscover(withDetail(fixture.input, "lista"));
  return JSON.stringify(probe) !== JSON.stringify(withoutDetail);
}

/** s2 (relations on-demand): `g2_context.relations` deixa de vir inline nos dieted. */
function s2RelationsRefLanded(result: PrepareCodegenContextResultReady): boolean {
  return !Array.isArray(result.g2_context.relations);
}

/** 0.21 §1 (o requisito fundido): a descrição nunca sai, o bloco morreu, e a verificação
 * é declarada com denominadores que fecham (um padrão publicado pode vir sem
 * verification_logic — «partial», declarado, nunca omitido). */
function s1FusionLanded(result: PrepareCodegenContextResultReady): boolean {
  const requirements = result.activated_scope.requirements as ReadonlyArray<Record<string, unknown>>;
  const v = (result.completeness_report as { verification?: { requirements: number; with_verify_and_evidence: number; partial: number; without_pattern: number } }).verification;
  return (
    requirements.length > 0 &&
    requirements.every((item) => "description" in item) &&
    !("evidence_patterns" in (result.g2_context as object)) &&
    v !== undefined &&
    v.with_verify_and_evidence + v.partial + v.without_pattern === v.requirements
  );
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
  const listMatch = /^([a-z0-9_]+)\.([a-z0-9_]+)\[\]\.([a-z0-9_]+)$/.exec(path);
  if (!listMatch) throw new Error(`ids_from path desconhecido: ${path}`);
  const list = (root[listMatch[1]!]?.[listMatch[2]!] ?? []) as Array<
    Record<string, string>
  >;
  return list.map((item) => item[listMatch[3]!]!);
}

/**
 * Known, REPORTED deviations from a hard gate — never a silent raise of the
 * gate itself (BUDGETS stays the EPIC/operator-ratified number). Each entry
 * names the measurement, the tolerated ceiling and the cause; it is removed
 * when the EPIC gate itself is re-set or the data shrinks back.
 */
/**
 * Known, REPORTED deviations from a hard gate — never a silent raise of the gate
 * itself.
 */
/**
 * Known, REPORTED deviations from a hard gate — never a silent raise of the gate
 * itself. 2026-09-25 (0.21 §1): a fixture 2 (69 requisitos) na forma fundida
 * custa ~12.75k em lista/standard — acima dos envelopes herdados. Não é o gate
 * que se levanta: é o ACHADO que se declara (a projecção do §5 fazia o join
 * verify/evidence sobre o bloco capado a 25 e subestimou o custo por requisito;
 * ver payload-ceilings.ts). O servidor di-lo também no payload
 * (size_estimate.within_envelope=false). Decisão do lead pendente: envelope,
 * forma, ou ambos.
 */
const KNOWN_TOTAL_DEVIATIONS: Readonly<
  Record<string, { measured: number; tolerated: number; since: string; reason: string }>
> = {
  "standard:fixture2": { measured: 12696, tolerated: 13400, since: "2026-09-25", reason: "0.21 §1+§3 forma fundida: 69 reqs × ~88 tk/req (description+verify+evidence) > envelope 9.200 — achado para o lead (a §3 só baixou ~50 tk)" },
  "lista:fixture2": { measured: 12695, tolerated: 13400, since: "2026-09-25", reason: "0.21 §1+§3 forma fundida: 69 reqs × ~88 tk/req > envelope herdado 8.450 — achado para o lead (a §3 só baixou ~50 tk)" }
}

function withKnownDeviation(
  budgets: SectionBudgets,
  level: DetailLevel,
  fixture: BaselineFixture["name"]
): SectionBudgets {
  const deviation = KNOWN_TOTAL_DEVIATIONS[`${level}:${fixture}`];
  return deviation ? { ...budgets, total: deviation.tolerated } : budgets;
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

    it("citations cobre exatamente o nº baseline de ids (invariante do EPIC; 0.21 §3: invertido também no full)", () => {
      const result = results.get(fixture.name)!;
      expect(result).not.toHaveProperty("citation_map");
      expect(new Set(citableIds(result)).size).toBe(fixture.citationIds);
    });

    it("é determinístico: 2 chamadas idênticas ⇒ payload byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContextDiscover(fixture.input);
      const second = handlePrepareCodegenContextDiscover(fixture.input);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      // E byte-igual à execução do beforeAll (independente do estado de cache).
      expect(JSON.stringify(first)).toBe(JSON.stringify(results.get(fixture.name)!));
    });

    // -- lista/standard: TOTAL = envelope herdado; desvios declarados --

    it.each(["standard", "lista"] as const)("respeita os budgets do nível `%s` (0.21 §1: envelope herdado como total; desvios declarados)", (detail) => {
      expect(detailSupported).toBe(true);
      const result = handlePrepareCodegenContextDiscover(withDetail(fixture.input, detail));
      expectReady(result);
      // sentinelas: relations por referência + requisito fundido (ambas aterradas)
      expect(s2RelationsRefLanded(result)).toBe(true);
      expect(s1FusionLanded(result)).toBe(true);
      assertSectionBudgets(
        sectionTokens(result),
        withKnownDeviation(BUDGETS[detail][fixture.name], detail, fixture.name)
      );
      // O payload DIZ se coube no envelope — e diz a verdade que este teste mede.
      const declared = (result as { size_estimate?: { approx_tokens: number; envelope_tk?: number; within_envelope?: boolean } }).size_estimate;
      expect(declared?.envelope_tk).toBe(BUDGETS[detail][fixture.name].total);
      expect(declared?.within_envelope).toBe(sectionTokens(result).total <= BUDGETS[detail][fixture.name].total);
    });

    it("conjunto de ids citáveis idêntico em todos os níveis de `detail` (invariante 3)", (ctx) => {
      if (!detailSupported) {
        ctx.skip(); // parâmetro `detail` ainda não existe (pré-s1)
        return;
      }
      // Invariante 3 do EPIC: muda a codificação, não o conjunto. Desde o s3
      // os ids citáveis vivem nas secções do payload e
      // citations.<source>.ids_from referencia-os (run-length source_data
      // alinhado 1:1) — extração via a mesma regra documentada no resource
      // (detail_encoding.citations), com fallback para ids explícitos.
      const fullIds = [...new Set(citableIds(results.get(fixture.name)!))].sort();
      const levels: ReadonlyArray<"standard" | "lista"> = ["standard", "lista"];
      for (const detail of levels) {
        const result = handlePrepareCodegenContextDiscover(withDetail(fixture.input, detail));
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
