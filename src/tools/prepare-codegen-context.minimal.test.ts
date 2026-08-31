/**
 * s3b REVISTO — Perfil `minimal` (epic v2-token-diet; ⟳ ADENDA 2026-07-05 do
 * operador, EPIC §s3b — SUBSTITUI o desenho top-N original).
 *
 * Princípio ratificado: *minimizar a serialização, nunca o contexto*. SEM
 * top-N/ranking/subsetting — a ativação é determinística e o conjunto ativado
 * (requirements, controls, entidades) vai COMPLETO em todos os níveis de
 * `detail`; nenhum item é exposto só com id. O `minimal` diverge de
 * `standard` APENAS em serialização de traceability, sempre nunca-silenciosa:
 *
 *   1. `activated_scope` byte-igual a `standard` (completo, com as
 *      `description` VERBATIM do bundle publicado — nunca parafraseadas);
 *   2. evidence_patterns cap 10→5 (mesmo mecanismo s3: prefixo determinístico,
 *      total/returned/capped, rest-ref executável);
 *   3. `manual_grounding` na forma mínima: total_entries + manual_commit_sha
 *      agregado (hoisted) + grupos (role, chapter, file) com CONTAGEM exata
 *      por grupo + `groups_ref` executável (mesmo input, detail="standard");
 *   4. invariante 3 (conjunto de ids citáveis idêntico entre níveis) intacto:
 *      os ids do grounding nunca alimentam `citations`/`ids_from`, e o SET de
 *      ids do grounding continua reconstruível a partir das entity-maps
 *      g2_context DO MESMO payload, sem chamadas extra;
 *   5. determinismo: 2 chamadas idênticas ⇒ payload byte-igual.
 *
 * `standard` e `full` ficam byte-idênticos ao pós-s3 (snapshots golden do
 * detail.test sem diff; só os snapshots minimal regeneram).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type ManualGroundingGrouped,
  type ManualGroundingMinimal,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { resolveAppPath } from "../config.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (como budget/detail).
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    }
  }
];

const MINIMAL_CAP = 5;

// ---------------------------------------------------------------------------
// Bundle publicado — lido DIRETAMENTE dos JSON (prova verbatim byte-igual).
// ---------------------------------------------------------------------------

function loadBundleItems(relPath: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(resolveAppPath(relPath), "utf-8")) as
    | Array<Record<string, unknown>>
    | { items?: Array<Record<string, unknown>> };
  return Array.isArray(parsed) ? parsed : (parsed.items ?? []);
}

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
  expect(result).not.toHaveProperty("citation_map");
}

function expectMinimalGrounding(
  grounding: ManualGroundingGrouped | ManualGroundingMinimal
): asserts grounding is ManualGroundingMinimal {
  expect(grounding).toHaveProperty("groups_ref");
}

function expectGroupedGrounding(
  grounding: ManualGroundingGrouped | ManualGroundingMinimal
): asserts grounding is ManualGroundingGrouped {
  expect(grounding).not.toHaveProperty("groups_ref");
}

function runMinimal(fixture: BaselineFixture): PrepareCodegenContextResultReadyDieted {
  const result = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
  expectReadyDieted(result);
  return result;
}

function runStandard(fixture: BaselineFixture): PrepareCodegenContextResultReadyDieted {
  const result = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
  expectReadyDieted(result);
  return result;
}

function runFull(fixture: BaselineFixture): PrepareCodegenContextResultReady {
  const result = handlePrepareCodegenContext(fixture.input);
  expectReadyFull(result);
  return result;
}

/** Todas as entity-ids das entity-maps g2_context do payload dieted. */
function g2EntityIds(dieted: PrepareCodegenContextResultReadyDieted): Set<string> {
  const ids = new Set<string>();
  for (const list of [
    dieted.g2_context.control_objectives,
    dieted.g2_context.mechanisms,
    dieted.g2_context.practices,
    dieted.g2_context.artifacts
  ]) {
    for (const entities of Object.values(list)) {
      for (const id of Object.keys(entities)) ids.add(id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — perfil minimal (v2-token-diet s3b REVISTO)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    // -----------------------------------------------------------------------
    // 1. Conjunto ativado COMPLETO — sem top-N, nada só-id, descriptions verbatim
    // -----------------------------------------------------------------------

    it("requirements COMPLETOS (returned == total do full, mesmos ids, mesma ordem) com id+name+description — nada só-id", () => {
      const full = runFull(fixture);
      const minimal = runMinimal(fixture);

      // Sem omissão: contagem e ids EXATAMENTE os do full (ordem incluída).
      expect(minimal.activated_scope.requirements.length).toBe(
        full.activated_scope.requirements.length
      );
      expect(
        minimal.activated_scope.requirements.map((item) => item.requirement_id)
      ).toEqual(full.activated_scope.requirements.map((item) => item.requirement_id));

      // Nunca só o id: cada item leva nome legível e a description publicada.
      const bundle = loadBundleItems("data/publish/runtime/requirements.json");
      const descriptionById = new Map(
        bundle.map((item) => [item.requirement_id as string, item.description as string])
      );
      for (const requirement of minimal.activated_scope.requirements) {
        expect(requirement.name, `${requirement.requirement_id} sem name`).toBeTruthy();
        // Description VERBATIM do bundle publicado — byte-igual, nunca parafraseada.
        expect(requirement.description).toBe(
          descriptionById.get(requirement.requirement_id)
        );
      }
    });

    it("controls COMPLETOS (returned == total do full, mesmos ids) com id+name; direct com description verbatim do bundle", () => {
      const full = runFull(fixture);
      const minimal = runMinimal(fixture);

      expect(minimal.activated_scope.controls.length).toBe(
        full.activated_scope.controls.length
      );
      expect(minimal.activated_scope.controls.map((item) => item.control_id)).toEqual(
        full.activated_scope.controls.map((item) => item.control_id)
      );

      const bundle = loadBundleItems("data/publish/runtime/controls.json");
      const descriptionById = new Map(
        bundle.map((item) => [item.control_id as string, item.description as string])
      );
      for (const control of minimal.activated_scope.controls) {
        expect(control.name, `${control.control_id} sem name`).toBeTruthy();
        if (control.confidence === "direct") {
          expect(control.description).toBe(descriptionById.get(control.control_id));
        }
      }
    });

    it("activated_scope e entidades g2 byte-iguais a standard (contexto de execução intocado)", () => {
      const standard = runStandard(fixture);
      const minimal = runMinimal(fixture);
      expect(JSON.stringify(minimal.activated_scope)).toBe(
        JSON.stringify(standard.activated_scope)
      );
      for (const list of [
        "control_objectives",
        "mechanisms",
        "practices",
        "artifacts"
      ] as const) {
        expect(JSON.stringify(minimal.g2_context[list])).toBe(
          JSON.stringify(standard.g2_context[list])
        );
      }
      // E o conjunto de entity-ids é o do full (nenhuma entidade omitida).
      const full = runFull(fixture);
      const fullIds = new Set(
        [
          ...full.g2_context.control_objectives,
          ...full.g2_context.mechanisms,
          ...full.g2_context.practices,
          ...full.g2_context.artifacts
        ].map((entity) => entity.entity_id)
      );
      expect(g2EntityIds(minimal)).toEqual(fullIds);
    });

    // -----------------------------------------------------------------------
    // 2. Evidence cap 10→5 — nunca-silencioso, prefixo, rest-ref executável
    // -----------------------------------------------------------------------

    it("evidence cap 5: returned+capped == total, prefixo exato de standard e do full, rest-ref executável", () => {
      const full = runFull(fixture);
      const standard = runStandard(fixture);
      const minimal = runMinimal(fixture);

      const report = minimal.completeness_report;
      expect(report.evidence_pattern_cap).toBe(MINIMAL_CAP);
      expect(minimal.g2_context.evidence_patterns.length).toBe(
        report.evidence_patterns_returned
      );
      // boundList nunca-silencioso: omitted + returned == total.
      expect(report.evidence_patterns_returned + report.evidence_patterns_capped).toBe(
        report.evidence_patterns_total
      );
      // O universo é o MESMO do full — o cap muda o returned, não o total.
      expect(report.evidence_patterns_total).toBe(
        full.completeness_report.evidence_patterns_total
      );

      // Prefixo determinístico: minimal(5) ⊂ standard(10) ⊂ full(25).
      expect(JSON.stringify(minimal.g2_context.evidence_patterns)).toBe(
        JSON.stringify(standard.g2_context.evidence_patterns.slice(0, MINIMAL_CAP))
      );
      const expectedFromFull = full.g2_context.evidence_patterns
        .slice(0, MINIMAL_CAP)
        .map(({ source: _s, relevance_score: _r, ...rest }) => rest);
      expect(JSON.stringify(minimal.g2_context.evidence_patterns)).toBe(
        JSON.stringify(expectedFromFull)
      );

      // Referência executável: detail="full" devolve a lista de que o minimal
      // é prefixo (executada de verdade).
      const rest = report.evidence_patterns_rest;
      expect(rest).toBeDefined();
      expect(rest!.tool).toBe("prepare_sbd_toe_codegen_context");
      const followUp = handlePrepareCodegenContext({
        ...fixture.input,
        detail: rest!.with.detail
      });
      expectReadyFull(followUp);
      const followUpIds = followUp.g2_context.evidence_patterns.map((p) => p.id);
      const minimalIds = minimal.g2_context.evidence_patterns.map((p) => p.id);
      expect(followUpIds.slice(0, minimalIds.length)).toEqual(minimalIds);
      expect(followUpIds.length).toBeGreaterThan(minimalIds.length);
    });

    // -----------------------------------------------------------------------
    // 3. manual_grounding mínimo — contagens + proveniência agregada + ref
    // -----------------------------------------------------------------------

    it("grounding mínimo: total_entries exato, Σ entries == total, sha agregado, nunca-silencioso", () => {
      const full = runFull(fixture);
      const minimal = runMinimal(fixture);
      const grounding = minimal.manual_grounding;
      expectMinimalGrounding(grounding);

      // Contagem total exata (== entradas planas do full) e Σ por grupo.
      expect(grounding.total_entries).toBe(full.manual_grounding.length);
      const summed =
        grounding.groups.reduce((sum, group) => sum + group.entries, 0) +
        (grounding.ungrouped?.length ?? 0);
      expect(summed).toBe(grounding.total_entries);

      // Proveniência agregada: o sha hoisted é o de TODAS as entradas planas
      // (o bundle publica um único manual commit) e os grupos não o repetem.
      const flatShas = new Set(
        full.manual_grounding.map((entry) => entry.manual_commit_sha)
      );
      expect(flatShas.size).toBe(1);
      expect(grounding.manual_commit_sha).toBe([...flatShas][0]);
      for (const group of grounding.groups) {
        expect(group).not.toHaveProperty("manual_commit_sha");
        // Nunca só metadados vazios: cada grupo identifica (role, chapter,
        // file) e a contagem exata.
        expect(group.rastreabilidade_role).toBeTruthy();
        expect(group.entries).toBeGreaterThan(0);
        // Guard sem perda: nomes não-recuperáveis ficariam aqui (esperado nunca).
        expect(group.v1_entity_names).toBeUndefined();
      }
      expect(grounding.ungrouped).toBeUndefined(); // esperado nunca (guard)
    });

    it("groups_ref é EXECUTÁVEL: detail='standard' devolve os grupos completos, alinhados 1:1 (mesma ordem, mesmas contagens)", () => {
      const minimal = runMinimal(fixture);
      const grounding = minimal.manual_grounding;
      expectMinimalGrounding(grounding);

      expect(grounding.groups_ref.tool).toBe("prepare_sbd_toe_codegen_context");
      expect(grounding.groups_ref.with).toEqual({ detail: "standard" });

      // EXECUTA a referência de verdade: mesmo input, detail="standard".
      const followUp = handlePrepareCodegenContext({
        ...fixture.input,
        detail: grounding.groups_ref.with.detail
      });
      expectReadyDieted(followUp);
      const followUpGrounding = followUp.manual_grounding;
      expectGroupedGrounding(followUpGrounding);

      expect(followUpGrounding.total_entries).toBe(grounding.total_entries);
      expect(followUpGrounding.groups.length).toBe(grounding.groups.length);
      for (const [index, group] of grounding.groups.entries()) {
        const fullGroup = followUpGrounding.groups[index]!;
        expect(fullGroup.rastreabilidade_role).toBe(group.rastreabilidade_role);
        expect(fullGroup.manual_chapter).toBe(group.manual_chapter);
        expect(fullGroup.manual_file).toBe(group.manual_file);
        expect(fullGroup.manual_commit_sha).toBe(grounding.manual_commit_sha);
        // A contagem do minimal é EXATAMENTE o tamanho da lista de ids do
        // grupo standard correspondente — nada omitido em silêncio.
        expect(fullGroup.v1_entity_ids.length).toBe(group.entries);
      }
    });

    it("invariante 3 local: o SET de ids do grounding é reconstruível do PRÓPRIO payload minimal (sem chamadas)", () => {
      const full = runFull(fixture);
      const minimal = runMinimal(fixture);

      // Os ids do grounding nunca alimentam citations/ids_from…
      const citable = new Set(Object.keys(full.citation_map));
      const groundingIds = new Set(
        full.manual_grounding.map((entry) => entry.v1_entity_id!)
      );
      // …mas são todos entity-ids citáveis que continuam VERBATIM nas
      // entity-maps g2_context do payload minimal.
      const inPayload = g2EntityIds(minimal);
      for (const id of groundingIds) {
        expect(inPayload.has(id), `grounding id ${id} fora do payload minimal`).toBe(true);
        expect(citable.has(id), `grounding id ${id} fora do conjunto citável`).toBe(true);
      }
      // E as citations do minimal são byte-iguais às de standard (o corte do
      // grounding não toca na codificação citável).
      const standard = runStandard(fixture);
      expect(JSON.stringify(minimal.citations)).toBe(JSON.stringify(standard.citations));
    });

    // -----------------------------------------------------------------------
    // 4. Determinismo
    // -----------------------------------------------------------------------

    it("determinismo: 2 chamadas minimal idênticas ⇒ payload byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      const second = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });
  });

  // ---------------------------------------------------------------------------
  // standard fica INTOCADO pelo s3b (grounding agrupado completo, cap 10)
  // ---------------------------------------------------------------------------

  it("standard não muda com o s3b: grounding agrupado completo (sem groups_ref), cap 10", () => {
    for (const fixture of FIXTURES) {
      const standard = runStandard(fixture);
      expectGroupedGrounding(standard.manual_grounding);
      expect(standard.completeness_report.evidence_pattern_cap).toBe(10);
    }
  });
});
