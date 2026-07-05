/**
 * s2 — Relations on-demand (epic v2-token-diet): `relations_ref` no lugar do
 * array inline `g2_context.relations` em `detail: "standard" | "minimal"`.
 *
 * Gates do slice (EPIC §s2):
 *   - SUPERSET (gate central, provado por EXECUÇÃO, sem mocks): para cada
 *     fixture baseline, executar DE VERDADE cada lens referida em
 *     `relations_ref` (handleTraceGraph real, paginado até ao fim) e verificar
 *     que a união das relations recuperadas cobre o conjunto exato de
 *     relations que iam inline em `full` (chave canónica
 *     subject_id|predicate|object_id). Nota de desvio documentada: as lenses
 *     curadas existentes não devolvem arestas belongsToSlice de
 *     Mechanism/Practice/Artifact — essas arestas são byte-redundantes com o
 *     campo `slice_id` de cada entidade do MESMO payload (provado abaixo,
 *     também por execução/comparação) e são contadas em
 *     `coverage.implicit_in_entities` (padrão nunca-silencioso). A união
 *     lenses ∪ slice_id-das-entidades ⊇ inline, com contagens exatas.
 *   - NO-LEAK (invariante 6): nenhum valor em relations_ref contém IRIs
 *     internos — testado contra o esquema REAL do grafo (BASE/REL de
 *     src/serving/rdf/projection.ts) e contra padrões de URI genéricos.
 *   - `include_relations: true` restaura as relations inline (dieted, sem
 *     `source` por item); `full` nunca muda.
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted,
  type RelationsRef
} from "./prepare-codegen-context.js";
import { handleTraceGraph, type GraphLens } from "./trace-graph.js";
import { BASE, REL } from "../serving/rdf/projection.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (como budget/detail).
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
  /** Auditoria baseline (2026-07-05, bundle da 0.20.0-beta.1): decomposição
   * exata do coverage do relations_ref. `residual` > 0 só na fixture 2:
   * ACM-SLG-005/006 têm belongsToSlice→ASC-10 em relations.jsonl mas NÃO
   * existem em mechanisms.json (lacuna do bundle publicado) — ficam inline em
   * residual_relations (padrão nunca-silencioso). */
  expectedCoverage: { total: number; viaLenses: number; implicit: number; residual: number };
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    },
    expectedCoverage: { total: 106, viaLenses: 70, implicit: 36, residual: 0 }
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    },
    expectedCoverage: { total: 151, viaLenses: 102, implicit: 47, residual: 2 }
  }
];

const DIET_LEVELS = ["standard", "minimal"] as const;

const VALID_LENSES: ReadonlySet<string> = new Set([
  "slice_implementation",
  "objective_realization",
  "mechanism_provenance"
]);

const PRED_BELONGS = "belongsToSlice";
const PRED_MECH = "objective_implemented_by_mechanism";
const PRED_PRAC = "objective_realized_by_practice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectReadyFull(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citation_map");
}

function expectReadyDieted(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
}

function relationsRefOf(result: PrepareCodegenContextResultReadyDieted): RelationsRef {
  const ref = result.g2_context.relations_ref;
  expect(ref, "relations_ref ausente no payload dieted").toBeDefined();
  return ref!;
}

const relationKey = (subject: string, predicate: string, object: string): string =>
  `${subject}|${predicate}|${object}`;

/** Executa DE VERDADE uma lens da trace_sbd_toe_graph, paginando até ao fim. */
function executeLens(lens: GraphLens, anchor: string): Record<string, string | undefined>[] {
  const rows: Record<string, string | undefined>[] = [];
  let page = 0;
  for (;;) {
    const result = handleTraceGraph({ lens, anchor, page, pageSize: 200 });
    rows.push(...result.rows);
    if (result.cursor === null) break;
    page = result.cursor;
  }
  return rows;
}

/**
 * Deriva as relations (chaves canónicas) recuperáveis das rows de cada lens,
 * segundo o mapeamento documentado em buildRelationsRef:
 *  - slice_implementation: cada row carrega (objective belongsToSlice slice) E
 *    (objective →kind target);
 *  - objective_realization: (objective →kind target);
 *  - mechanism_provenance: (objective →? target) — o predicado é recuperado do
 *    entity_type do target no payload — e, quando a row traz slice,
 *    (objective belongsToSlice slice).
 */
function deriveRelations(
  lens: GraphLens,
  rows: Record<string, string | undefined>[],
  entityTypeById: Map<string, string>
): Set<string> {
  const derived = new Set<string>();
  const kindPredicate = (kind: string | undefined): string | null =>
    kind === "mechanism" ? PRED_MECH : kind === "practice" ? PRED_PRAC : null;
  for (const row of rows) {
    if (lens === "slice_implementation") {
      if (row.objective && row.slice) {
        derived.add(relationKey(row.objective, PRED_BELONGS, row.slice));
      }
      const predicate = kindPredicate(row.kind);
      if (row.objective && row.target && predicate) {
        derived.add(relationKey(row.objective, predicate, row.target));
      }
    } else if (lens === "objective_realization") {
      const predicate = kindPredicate(row.kind);
      if (row.objective && row.target && predicate) {
        derived.add(relationKey(row.objective, predicate, row.target));
      }
    } else {
      // mechanism_provenance
      if (row.objective && row.target) {
        const targetType = entityTypeById.get(row.target);
        const predicate =
          targetType === "Mechanism" ? PRED_MECH : targetType === "Practice" ? PRED_PRAC : null;
        if (predicate) derived.add(relationKey(row.objective, predicate, row.target));
      }
      if (row.objective && row.slice) {
        derived.add(relationKey(row.objective, PRED_BELONGS, row.slice));
      }
    }
  }
  return derived;
}

/** s3: as listas de entidades dieted vêm agrupadas por slice
 * ({slice_id: {entity_id: name|null}}) — o entity_type é a lista onde o mapa
 * vive e o slice_id é a chave do grupo (detail_encoding.g2_entities). */
type DietedEntityMaps = Record<string, Record<string, string | null>>;

interface DietedG2EntitySections {
  control_objectives: DietedEntityMaps;
  mechanisms: DietedEntityMaps;
  practices: DietedEntityMaps;
  artifacts: DietedEntityMaps;
}

function entityIndex(g2: DietedG2EntitySections): {
  typeById: Map<string, string>;
  sliceById: Map<string, string>;
} {
  const typeById = new Map<string, string>();
  const sliceById = new Map<string, string>();
  const lists = [
    [g2.control_objectives, "ControlObjective"],
    [g2.mechanisms, "Mechanism"],
    [g2.practices, "Practice"],
    [g2.artifacts, "Artifact"]
  ] as const;
  for (const [grouped, entityType] of lists) {
    for (const [sliceId, entities] of Object.entries(grouped)) {
      for (const entityId of Object.keys(entities)) {
        typeById.set(entityId, entityType);
        sliceById.set(entityId, sliceId);
      }
    }
  }
  return { typeById, sliceById };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — relations_ref (v2-token-diet s2)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("valida o input: `include_relations` não-booleano falha com erro claro (-32602)", () => {
    for (const bad of ["yes", 1, 0, null, {}, []] as const) {
      let thrown: unknown;
      try {
        handlePrepareCodegenContext({
          ...FIXTURES[0]!.input,
          include_relations: bad
        } as unknown as PrepareCodegenContextInput);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `include_relations=${JSON.stringify(bad)} devia falhar`).toBeInstanceOf(
        Error
      );
      expect(
        (thrown as Error & { rpcError?: { code: number } }).rpcError?.code
      ).toBe(-32602);
    }
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    it.each([...DIET_LEVELS])(
      "%s: relations_ref substitui o array inline, com formato executável e auditoria exata",
      (detail) => {
        const full = handlePrepareCodegenContext(fixture.input);
        expectReadyFull(full);
        const dieted = handlePrepareCodegenContext({ ...fixture.input, detail });
        expectReadyDieted(dieted);

        // O array inline saiu…
        expect("relations" in dieted.g2_context).toBe(false);
        // …e a sentinela do budget.test (s2RelationsRefLanded) aciona:
        expect(Array.isArray((dieted.g2_context as { relations?: unknown }).relations)).toBe(
          false
        );

        const ref = relationsRefOf(dieted);
        expect(ref.tool).toBe("trace_sbd_toe_graph");
        expect(ref.lenses.length).toBeGreaterThan(0);
        for (const call of ref.lenses) {
          expect(VALID_LENSES.has(call.lens), `lens desconhecida: ${call.lens}`).toBe(true);
          expect(typeof call.anchor).toBe("string");
          expect(call.anchor.length).toBeGreaterThan(0);
        }
        // total_relations = nº EXATO de relations que iam inline em full.
        expect(ref.total_relations).toBe(full.g2_context.relations.length);
        // Auditoria nunca-silenciosa: a decomposição soma ao total.
        expect(
          ref.coverage.via_lenses +
            ref.coverage.implicit_in_entities +
            ref.coverage.residual_inline
        ).toBe(ref.total_relations);
        // Decomposição baseline exata (ver expectedCoverage nas fixtures).
        expect(ref.coverage).toEqual({
          via_lenses: fixture.expectedCoverage.viaLenses,
          implicit_in_entities: fixture.expectedCoverage.implicit,
          residual_inline: fixture.expectedCoverage.residual
        });
        expect(ref.total_relations).toBe(fixture.expectedCoverage.total);
        // residual_relations: presentes SÓ quando há resíduo, inline verbatim
        // (dieted, sem `source`) — nada é silenciosamente descartado.
        if (fixture.expectedCoverage.residual === 0) {
          expect(ref.residual_relations).toBeUndefined();
        } else {
          expect(ref.residual_relations).toHaveLength(fixture.expectedCoverage.residual);
          const inlineKeys = new Set(
            full.g2_context.relations.map((relation) =>
              relationKey(relation.subject_id, relation.predicate, relation.object_id)
            )
          );
          const { typeById } = entityIndex(dieted.g2_context);
          for (const relation of ref.residual_relations!) {
            expect(relation).not.toHaveProperty("source");
            expect(
              inlineKeys.has(
                relationKey(relation.subject_id, relation.predicate, relation.object_id)
              )
            ).toBe(true);
            // Resíduo legítimo: o sujeito não existe nas listas de entidades
            // do payload (lacuna do bundle) — nenhuma lens nem slice_id o cobre.
            expect(typeById.has(relation.subject_id)).toBe(false);
          }
        }
      }
    );

    it("anchors do relations_ref são ids ATIVADOS neste payload (executáveis)", () => {
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const ref = relationsRefOf(dieted);
      const activatedSliceIds = new Set(
        dieted.activated_scope.slices.map((slice) => slice.slice_id)
      );
      const { typeById } = entityIndex(dieted.g2_context);
      for (const call of ref.lenses) {
        if (call.lens === "slice_implementation") {
          expect(
            activatedSliceIds.has(call.anchor),
            `anchor ${call.anchor} não é slice ativado`
          ).toBe(true);
        } else {
          expect(
            typeById.has(call.anchor),
            `anchor ${call.anchor} não é entidade ativada`
          ).toBe(true);
        }
      }
    });

    it("SUPERSET por execução real: união das lenses ∪ slice_id das entidades ⊇ relations inline de full", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const ref = relationsRefOf(dieted);
      const { typeById, sliceById } = entityIndex(dieted.g2_context);

      // 1. Conjunto exato que ia inline em full (chave canónica).
      const inline = new Map<string, { predicate: string }>();
      for (const relation of full.g2_context.relations) {
        inline.set(relationKey(relation.subject_id, relation.predicate, relation.object_id), {
          predicate: relation.predicate
        });
      }
      expect(inline.size).toBe(ref.total_relations);

      // 2. Executa DE VERDADE cada lens referida (paginada, sem mocks).
      const viaLenses = new Set<string>();
      for (const call of ref.lenses) {
        const rows = executeLens(call.lens as GraphLens, call.anchor);
        for (const key of deriveRelations(call.lens as GraphLens, rows, typeById)) {
          viaLenses.add(key);
        }
      }

      // 3. Arestas belongsToSlice implícitas no PRÓPRIO payload dieted:
      //    cada entidade g2_context carrega slice_id (byte-igual à aresta).
      const implicit = new Set<string>();
      for (const [entityId, sliceId] of sliceById) {
        implicit.add(relationKey(entityId, PRED_BELONGS, sliceId));
      }

      // 3b. Resíduo declarado (nunca-silencioso): relations que nem as lenses
      //     nem o slice_id das entidades cobrem vêm INLINE em residual_relations.
      const residualKeys = new Set(
        (ref.residual_relations ?? []).map((relation) =>
          relationKey(relation.subject_id, relation.predicate, relation.object_id)
        )
      );
      expect(residualKeys.size).toBe(ref.coverage.residual_inline);

      // 4. Superset: cada relation inline é recuperável por uma das vias
      //    (execução das lenses, slice_id das entidades, ou resíduo inline).
      const missing: string[] = [];
      let coveredByLenses = 0;
      let coveredImplicit = 0;
      let coveredResidual = 0;
      for (const [key, meta] of inline) {
        if (viaLenses.has(key)) {
          coveredByLenses += 1;
        } else if (implicit.has(key)) {
          // Só arestas belongsToSlice podem ser cobertas pela via implícita.
          expect(meta.predicate).toBe(PRED_BELONGS);
          coveredImplicit += 1;
        } else if (residualKeys.has(key)) {
          coveredResidual += 1;
        } else {
          missing.push(key);
        }
      }
      expect(missing, `relations inline não recuperáveis: ${missing.join(", ")}`).toEqual([]);

      // 5. As contagens de auditoria do relations_ref batem com a execução.
      expect(coveredByLenses).toBe(ref.coverage.via_lenses);
      expect(coveredImplicit).toBe(ref.coverage.implicit_in_entities);
      expect(coveredResidual).toBe(ref.coverage.residual_inline);

      // 6. Gate estrito nas arestas de GRAFO (objective_*): a união das lenses
      //    sozinha é superset de todas — nenhuma depende da via implícita.
      for (const [key, meta] of inline) {
        if (meta.predicate !== PRED_BELONGS) {
          expect(viaLenses.has(key), `aresta objective_* fora das lenses: ${key}`).toBe(true);
        }
      }
    });

    it("NO-LEAK: nenhum valor em relations_ref contém IRIs internos (esquema real do grafo)", () => {
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const ref = relationsRefOf(dieted);
      const serialized = JSON.stringify(ref);
      // Esquema REAL de IRIs do grafo (src/serving/rdf/projection.ts).
      expect(BASE).toBe("https://sbd-toe.dev/v2/"); // guarda: o teste segue o esquema real
      expect(serialized).not.toContain(BASE);
      expect(serialized).not.toContain(REL);
      // Qualquer URI/IRI genérico é fuga — anchors e lenses são ids/nomes puros.
      expect(serialized).not.toMatch(/[a-z][a-z0-9+.-]*:\/\//i);
      for (const call of ref.lenses) {
        expect(call.anchor).toMatch(/^[A-Za-z0-9_.:-]+$/);
        expect(call.anchor.startsWith(BASE)).toBe(false);
      }
    });

    it("`include_relations: true` devolve as relations inline dieted (sem `source`), sem relations_ref", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      for (const detail of DIET_LEVELS) {
        const dieted = handlePrepareCodegenContext({
          ...fixture.input,
          detail,
          include_relations: true
        });
        expectReadyDieted(dieted);
        expect(dieted.g2_context.relations_ref).toBeUndefined();
        const relations = dieted.g2_context.relations;
        expect(Array.isArray(relations)).toBe(true);
        // Mesmíssimas relations de full, por ordem, sem o `source` por item.
        const expected = full.g2_context.relations.map(
          ({ source: _source, ...rest }) => rest
        );
        expect(JSON.stringify(relations)).toBe(JSON.stringify(expected));
        // Echo de auditoria do escape hatch.
        expect(dieted.input_echo.include_relations).toBe(true);
      }
    });

    it("`include_relations` omisso/false não altera nada além do echo", () => {
      const byDefault = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      const explicitFalse = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "standard",
        include_relations: false
      });
      expect(JSON.stringify(explicitFalse)).toBe(JSON.stringify(byDefault));
    });

    it("`full` continua byte-idêntico, com ou sem include_relations (nada muda em full)", () => {
      const byDefault = handlePrepareCodegenContext(fixture.input);
      for (const extra of [
        { detail: "full" as const, include_relations: true },
        { include_relations: true },
        { include_relations: false }
      ]) {
        const result = handlePrepareCodegenContext({ ...fixture.input, ...extra });
        expect(JSON.stringify(result)).toBe(JSON.stringify(byDefault));
      }
    });

    it("determinismo: relations_ref byte-igual em 2 chamadas idênticas", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      const second = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });
  });

  it("caminho blocked: include_relations não altera a resposta blocked", () => {
    const input: PrepareCodegenContextInput = {
      task: "make the whole application secure please",
      risk_level: "L2"
    };
    const byDefault = handlePrepareCodegenContext(input);
    const withFlag = handlePrepareCodegenContext({
      ...input,
      detail: "standard",
      include_relations: true
    });
    expect(byDefault.status).not.toBe("ready_for_codegen");
    expect(JSON.stringify(withFlag)).toBe(JSON.stringify(byDefault));
  });
});
