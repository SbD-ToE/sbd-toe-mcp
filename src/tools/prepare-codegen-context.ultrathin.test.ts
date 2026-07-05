/**
 * s3c — Perfil `ultrathin` (epic v2-token-diet; ADENDA 2026-07-05 do operador,
 * EPIC §s3c — especificado, adiado e REATIVADO no mesmo dia).
 *
 * Regras vinculativas do operador (as mesmas do s3b revisto): conjunto
 * ativado COMPLETO (sem top-k), nada só-id (name sempre presente),
 * nunca-silencioso (contagens + referência executável), descriptions nunca
 * parafraseadas — no ultrathin, nunca presentes de todo (o corte é o campo
 * inteiro, verbatim recuperável via referência executável).
 *
 * `detail: "ultrathin"` fica ABAIXO de `minimal` e diverge dele APENAS em:
 *   1. requirements só {requirement_id, name, type} e controls só
 *      {control_id, name, domain, control_type, confidence} — sem
 *      `description`; `activated_scope.descriptions_ref` executável
 *      (mesmo input, detail="minimal") devolve o scope COM as descriptions
 *      verbatim do bundle;
 *   2. evidence_patterns 0 inline — contagens no completeness_report
 *      (total, returned=0, capped=total, cap=0) + rest-ref executável para o
 *      nível MAIS BARATO que os devolve inline (detail="minimal" ⇒ 5;
 *      "standard" ⇒ 10; "full" ⇒ 25);
 *   3. manual_grounding só {total_entries, manual_commit_sha, groups_ref}
 *      (lista de grupos elidida; groups_ref executável → detail="standard");
 *   4. completeness_report aparado: os arrays de TEXTO
 *      v1_consistency_mismatches/v1_manifest_warnings → contagens exatas
 *      (*_count) + v1_diagnostics_ref executável (detail="minimal") quando
 *      alguma contagem > 0. TODAS as contagens numéricas (recall, totals,
 *      evidence) mantêm-se verbatim.
 *
 * MANTIDO byte-igual aos outros níveis dieted: entidades g2 (id→name|null,
 * completas — âncoras + invariante 3 via ids_from), relations_ref, citations,
 * codegen_instructions_ref, repeat_call_hint (texto s4 INALTERADO),
 * regulatory_overlay, provenance, next. `full`/`standard`/`minimal` ficam
 * byte-idênticos ao pós-s4 (snapshots golden do detail.test sem diff; novos
 * snapshots fixture{1,2}-ultrathin.json abaixo).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  REPEAT_CALL_HINT,
  type ManualGroundingGrouped,
  type ManualGroundingMinimal,
  type ManualGroundingUltrathin,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted,
  type SliceGroupedEntityNames,
  type UltrathinCompletenessReport
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

/** Narrowing: grounding na forma ultrathin (groups_ref SEM lista de grupos). */
function expectUltrathinGrounding(
  grounding: PrepareCodegenContextResultReadyDieted["manual_grounding"]
): asserts grounding is ManualGroundingUltrathin {
  expect(grounding).toHaveProperty("groups_ref");
  expect(grounding).not.toHaveProperty("groups");
}

function expectMinimalGrounding(
  grounding: PrepareCodegenContextResultReadyDieted["manual_grounding"]
): asserts grounding is ManualGroundingMinimal {
  expect(grounding).toHaveProperty("groups_ref");
  expect(grounding).toHaveProperty("groups");
}

function expectGroupedGrounding(
  grounding: PrepareCodegenContextResultReadyDieted["manual_grounding"]
): asserts grounding is ManualGroundingGrouped {
  expect(grounding).not.toHaveProperty("groups_ref");
}

function expectUltrathinReport(
  report: PrepareCodegenContextResultReadyDieted["completeness_report"]
): asserts report is UltrathinCompletenessReport {
  expect(report).toHaveProperty("v1_manifest_warnings_count");
  expect(report).not.toHaveProperty("v1_manifest_warnings");
  expect(report).not.toHaveProperty("v1_consistency_mismatches");
}

function runUltrathin(fixture: BaselineFixture): PrepareCodegenContextResultReadyDieted {
  const result = handlePrepareCodegenContext({ ...fixture.input, detail: "ultrathin" });
  expectReadyDieted(result);
  return result;
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

/** Chaves de um mapa de entidades agrupado por slice, na ordem dos grupos. */
function flattenEntityKeys(grouped: SliceGroupedEntityNames): string[] {
  return Object.values(grouped).flatMap((entities) => Object.keys(entities));
}

/** Resolve um path `ids_from` sobre o PRÓPRIO payload dieted (mini-sintaxe do
 * resource, detail_encoding.citations — mesma regra do detail.test). */
function idsAtPath(
  dieted: PrepareCodegenContextResultReadyDieted,
  path: string
): string[] {
  switch (path) {
    case "activated_scope.requirements[].requirement_id":
      return dieted.activated_scope.requirements.map((item) => item.requirement_id);
    case "activated_scope.controls[].control_id":
      return dieted.activated_scope.controls.map((item) => item.control_id);
    case "activated_scope.slices[].slice_id":
      return dieted.activated_scope.slices.map((item) => item.slice_id);
    case "keys(g2_context.control_objectives[slice])":
      return flattenEntityKeys(dieted.g2_context.control_objectives);
    case "keys(g2_context.mechanisms[slice])":
      return flattenEntityKeys(dieted.g2_context.mechanisms);
    case "keys(g2_context.practices[slice])":
      return flattenEntityKeys(dieted.g2_context.practices);
    case "keys(g2_context.artifacts[slice])":
      return flattenEntityKeys(dieted.g2_context.artifacts);
    case "regulatory_overlay.frameworks[].framework_id":
      return dieted.regulatory_overlay.frameworks.map((item) => item.framework_id);
    case "activated_scope.regulatory_obligations[].obligation_id":
      return dieted.activated_scope.regulatory_obligations.map(
        (item) => item.obligation_id
      );
    default:
      throw new Error(`ids_from path desconhecido: ${path}`);
  }
}

function citationIds(dieted: PrepareCodegenContextResultReadyDieted): string[] {
  const ids: string[] = [];
  for (const group of Object.values(dieted.citations)) {
    expect(group.ids).toBeUndefined(); // fallback nunca esperado
    expect(group.ids_from).toBeDefined();
    for (const path of group.ids_from!) ids.push(...idsAtPath(dieted, path));
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — perfil ultrathin (v2-token-diet s3c)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    // -------------------------------------------------------------------------
    // 1. Conjuntos COMPLETOS, nada só-id, campos exatos por item
    // -------------------------------------------------------------------------

    it("requirements COMPLETOS (returned == total do full, mesmos ids, mesma ordem); cada item é EXATAMENTE {requirement_id, name, type} — sem description, nada só-id", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);

      // Sem omissão: contagem e ids EXATAMENTE os do full (ordem incluída).
      expect(ultrathin.activated_scope.requirements.length).toBe(
        full.activated_scope.requirements.length
      );
      expect(
        ultrathin.activated_scope.requirements.map((item) => item.requirement_id)
      ).toEqual(full.activated_scope.requirements.map((item) => item.requirement_id));

      for (const requirement of ultrathin.activated_scope.requirements) {
        // Nunca só o id: nome legível sempre presente.
        expect(requirement.name, `${requirement.requirement_id} sem name`).toBeTruthy();
        // Campos EXATOS: {requirement_id, name, type} — sem description, sem
        // category (derivável = prefixo do id; guard sem perda inalterado),
        // sem source.
        expect(Object.keys(requirement).sort()).toEqual([
          "name",
          "requirement_id",
          "type"
        ]);
      }
    });

    it("controls COMPLETOS (returned == total do full, mesmos ids, mesma ordem); cada item é EXATAMENTE {control_id, name, domain, control_type, confidence} — sem description", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);

      expect(ultrathin.activated_scope.controls.length).toBe(
        full.activated_scope.controls.length
      );
      expect(ultrathin.activated_scope.controls.map((item) => item.control_id)).toEqual(
        full.activated_scope.controls.map((item) => item.control_id)
      );

      for (const control of ultrathin.activated_scope.controls) {
        expect(control.name, `${control.control_id} sem name`).toBeTruthy();
        expect(Object.keys(control).sort()).toEqual([
          "confidence",
          "control_id",
          "control_type",
          "domain",
          "name"
        ]);
      }
    });

    it("slices e regulatory_obligations byte-iguais aos de minimal/standard (como no minimal)", () => {
      const standard = runStandard(fixture);
      const minimal = runMinimal(fixture);
      const ultrathin = runUltrathin(fixture);
      expect(JSON.stringify(ultrathin.activated_scope.slices)).toBe(
        JSON.stringify(standard.activated_scope.slices)
      );
      expect(JSON.stringify(ultrathin.activated_scope.slices)).toBe(
        JSON.stringify(minimal.activated_scope.slices)
      );
      expect(JSON.stringify(ultrathin.activated_scope.regulatory_obligations)).toBe(
        JSON.stringify(standard.activated_scope.regulatory_obligations)
      );
      expect(JSON.stringify(ultrathin.regulatory_overlay)).toBe(
        JSON.stringify(standard.regulatory_overlay)
      );
    });

    it("entidades g2 id→name COMPLETAS e byte-iguais a standard/minimal (âncoras de contexto; name|null conforme publicado)", () => {
      const full = runFull(fixture);
      const standard = runStandard(fixture);
      const ultrathin = runUltrathin(fixture);
      for (const list of [
        "control_objectives",
        "mechanisms",
        "practices",
        "artifacts"
      ] as const) {
        expect(JSON.stringify(ultrathin.g2_context[list])).toBe(
          JSON.stringify(standard.g2_context[list])
        );
        // Contagem == full (nenhuma entidade omitida) e id→name|null conforme
        // a projeção clássica publicada (name presente ⇔ rastreabilidade).
        const fullEntities = full.g2_context[list];
        const flat = Object.entries(ultrathin.g2_context[list]).flatMap(
          ([sliceId, entities]) =>
            Object.entries(entities).map(([id, name]) => ({ sliceId, id, name }))
        );
        expect(flat.length).toBe(fullEntities.length);
        for (const [index, entity] of fullEntities.entries()) {
          expect(flat[index]!.id).toBe(entity.entity_id);
          expect(flat[index]!.sliceId).toBe(entity.slice_id);
          expect(flat[index]!.name).toBe(entity.name ?? null);
        }
      }
    });

    // -------------------------------------------------------------------------
    // 2. descriptions_ref executável (nunca-silencioso do corte de description)
    // -------------------------------------------------------------------------

    it("descriptions_ref é EXECUTÁVEL: detail='minimal' devolve o MESMO scope completo COM as descriptions verbatim do bundle", () => {
      const ultrathin = runUltrathin(fixture);
      const ref = ultrathin.activated_scope.descriptions_ref;
      expect(ref).toBeDefined();
      expect(ref!.tool).toBe("prepare_sbd_toe_codegen_context");
      expect(ref!.with).toEqual({ detail: "minimal" });

      // EXECUTA a referência de verdade: mesmo input, detail="minimal".
      const followUp = handlePrepareCodegenContext({
        ...fixture.input,
        detail: ref!.with.detail
      });
      expectReadyDieted(followUp);
      // Mesmos ids, mesma ordem — e as descriptions verbatim do bundle.
      expect(
        followUp.activated_scope.requirements.map((item) => item.requirement_id)
      ).toEqual(
        ultrathin.activated_scope.requirements.map((item) => item.requirement_id)
      );
      const requirementDescById = new Map(
        loadBundleItems("data/publish/runtime/requirements.json").map((item) => [
          item.requirement_id as string,
          item.description as string
        ])
      );
      for (const requirement of followUp.activated_scope.requirements) {
        expect(requirement.description).toBe(
          requirementDescById.get(requirement.requirement_id)
        );
      }
      const controlDescById = new Map(
        loadBundleItems("data/publish/runtime/controls.json").map((item) => [
          item.control_id as string,
          item.description as string
        ])
      );
      for (const control of followUp.activated_scope.controls) {
        if (control.confidence === "direct") {
          expect(control.description).toBe(controlDescById.get(control.control_id));
        }
      }
      // E, tirando description/descriptions_ref, o scope ultrathin é uma
      // projeção EXATA do minimal (mesmos valores nos campos mantidos).
      const strippedMinimal = {
        requirements: followUp.activated_scope.requirements.map(
          ({ description: _d, ...rest }) => rest
        ),
        controls: followUp.activated_scope.controls.map(
          ({ description: _d, ...rest }) => rest
        ),
        slices: followUp.activated_scope.slices,
        regulatory_obligations: followUp.activated_scope.regulatory_obligations
      };
      const { descriptions_ref: _ref, ...ultrathinScope } = ultrathin.activated_scope;
      expect(JSON.stringify(ultrathinScope)).toBe(JSON.stringify(strippedMinimal));
    });

    // -------------------------------------------------------------------------
    // 3. Evidence 0 inline — contagens + rest-ref executável (o mais barato)
    // -------------------------------------------------------------------------

    it("evidence_patterns: 0 inline; total/returned=0/capped=total no completeness_report; rest-ref executável aponta ao mais barato (minimal ⇒ 5)", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);

      expect(ultrathin.g2_context.evidence_patterns).toEqual([]);
      const report = ultrathin.completeness_report;
      expect(report.evidence_pattern_cap).toBe(0);
      expect(report.evidence_patterns_returned).toBe(0);
      // Nunca-silencioso: capped == total == universo do full.
      expect(report.evidence_patterns_total).toBe(
        full.completeness_report.evidence_patterns_total
      );
      expect(report.evidence_patterns_capped).toBe(report.evidence_patterns_total);

      // Referência executável para o nível MAIS BARATO que devolve patterns
      // inline: minimal (5) < standard (10) < full (25).
      const rest = report.evidence_patterns_rest;
      expect(rest).toBeDefined();
      expect(rest!.tool).toBe("prepare_sbd_toe_codegen_context");
      expect(rest!.with).toEqual({ detail: "minimal" });

      // EXECUTA a referência de verdade: minimal devolve os 5 (prefixo
      // determinístico do top-25 clássico do full).
      const followUp = handlePrepareCodegenContext({
        ...fixture.input,
        detail: rest!.with.detail
      });
      expectReadyDieted(followUp);
      expect(followUp.g2_context.evidence_patterns.length).toBe(5);
      const expectedFromFull = full.g2_context.evidence_patterns
        .slice(0, 5)
        .map(({ source: _s, relevance_score: _r, ...restFields }) => restFields);
      expect(JSON.stringify(followUp.g2_context.evidence_patterns)).toBe(
        JSON.stringify(expectedFromFull)
      );
      // E a cadeia continua: standard devolve 10, full os 25 clássicos.
      const standard = runStandard(fixture);
      expect(standard.g2_context.evidence_patterns.length).toBe(10);
      expect(full.g2_context.evidence_patterns.length).toBe(25);
    });

    // -------------------------------------------------------------------------
    // 4. manual_grounding agregado — {total_entries, sha, groups_ref}
    // -------------------------------------------------------------------------

    it("grounding ultrathin: SÓ {total_entries, manual_commit_sha, groups_ref}; total exato; sha = o único sha publicado", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);
      const grounding = ultrathin.manual_grounding;
      expectUltrathinGrounding(grounding);

      // Shape exato (lista de grupos elidida; guards nunca esperados ausentes).
      expect(Object.keys(grounding).sort()).toEqual([
        "groups_ref",
        "manual_commit_sha",
        "total_entries"
      ]);
      // Contagem total exata == entradas planas do full (nunca-silencioso).
      expect(grounding.total_entries).toBe(full.manual_grounding.length);
      // Proveniência agregada: o sha é o de TODAS as entradas planas.
      const flatShas = new Set(
        full.manual_grounding.map((entry) => entry.manual_commit_sha)
      );
      expect(flatShas.size).toBe(1);
      expect(grounding.manual_commit_sha).toBe([...flatShas][0]);
    });

    it("groups_ref é EXECUTÁVEL: detail='standard' devolve os grupos completos com Σ v1_entity_ids == total_entries", () => {
      const ultrathin = runUltrathin(fixture);
      const grounding = ultrathin.manual_grounding;
      expectUltrathinGrounding(grounding);
      expect(grounding.groups_ref.tool).toBe("prepare_sbd_toe_codegen_context");
      expect(grounding.groups_ref.with).toEqual({ detail: "standard" });

      // EXECUTA a referência de verdade: standard devolve o grouping completo.
      const followUp = handlePrepareCodegenContext({
        ...fixture.input,
        detail: grounding.groups_ref.with.detail
      });
      expectReadyDieted(followUp);
      const followUpGrounding = followUp.manual_grounding;
      expectGroupedGrounding(followUpGrounding);
      expect(followUpGrounding.total_entries).toBe(grounding.total_entries);
      const summed = followUpGrounding.groups.reduce(
        (sum, group) => sum + group.v1_entity_ids.length,
        0
      );
      expect(summed).toBe(grounding.total_entries);
      for (const group of followUpGrounding.groups) {
        expect(group.manual_commit_sha).toBe(grounding.manual_commit_sha);
      }
      // E o nível intermédio (minimal) devolve os grupos com contagens — a
      // forma ultrathin é a agregação exata dessa forma.
      const minimalGrounding = runMinimal(fixture).manual_grounding;
      expectMinimalGrounding(minimalGrounding);
      expect(minimalGrounding.total_entries).toBe(grounding.total_entries);
      expect(minimalGrounding.manual_commit_sha).toBe(grounding.manual_commit_sha);
    });

    it("invariante 3 local: o SET de ids do grounding continua no PRÓPRIO payload ultrathin (entity-maps g2)", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);
      const inPayload = new Set([
        ...flattenEntityKeys(ultrathin.g2_context.control_objectives),
        ...flattenEntityKeys(ultrathin.g2_context.mechanisms),
        ...flattenEntityKeys(ultrathin.g2_context.practices),
        ...flattenEntityKeys(ultrathin.g2_context.artifacts)
      ]);
      for (const entry of full.manual_grounding) {
        expect(
          inPayload.has(entry.v1_entity_id!),
          `grounding id ${entry.v1_entity_id} fora do payload ultrathin`
        ).toBe(true);
      }
    });

    // -------------------------------------------------------------------------
    // 5. completeness_report aparado — contagens mantidas, textos → count + ref
    // -------------------------------------------------------------------------

    it("completeness aparado: contagens numéricas VERBATIM (recall/totals/evidence); mismatches/warnings → contagens exatas + v1_diagnostics_ref executável", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);
      const report = ultrathin.completeness_report;
      expectUltrathinReport(report);

      // Backbone nunca-silencioso mantido verbatim (== full, exceto os campos
      // de evidence que o cap 0 recalcula de forma auditável).
      const fullReport = full.completeness_report;
      for (const key of [
        "expected_objectives",
        "returned_objectives",
        "m_recall",
        "expected_mechanisms",
        "returned_mechanisms",
        "expected_practices",
        "returned_practices",
        "expected_artifacts",
        "returned_artifacts",
        "named_v1_entities",
        "unnamed_v1_entities",
        "evidence_patterns_total"
      ] as const) {
        expect(report[key], `campo ${key} divergiu`).toBe(fullReport[key]);
      }

      // Diagnósticos: contagem exata dos arrays elididos.
      expect(report.v1_consistency_mismatches_count).toBe(
        fullReport.v1_consistency_mismatches.length
      );
      expect(report.v1_manifest_warnings_count).toBe(
        fullReport.v1_manifest_warnings.length
      );

      if (
        report.v1_consistency_mismatches_count + report.v1_manifest_warnings_count >
        0
      ) {
        // Referência executável: detail='minimal' devolve os textos inline.
        const ref = report.v1_diagnostics_ref;
        expect(ref).toBeDefined();
        expect(ref!.tool).toBe("prepare_sbd_toe_codegen_context");
        expect(ref!.with).toEqual({ detail: "minimal" });
        const followUp = handlePrepareCodegenContext({
          ...fixture.input,
          detail: ref!.with.detail
        });
        expectReadyDieted(followUp);
        const followUpReport = followUp.completeness_report as {
          v1_consistency_mismatches: string[];
          v1_manifest_warnings: string[];
        };
        expect(followUpReport.v1_consistency_mismatches).toEqual(
          fullReport.v1_consistency_mismatches
        );
        expect(followUpReport.v1_manifest_warnings).toEqual(
          fullReport.v1_manifest_warnings
        );
        expect(followUpReport.v1_manifest_warnings.length).toBe(
          report.v1_manifest_warnings_count
        );
      } else {
        expect(report.v1_diagnostics_ref).toBeUndefined();
      }
    });

    // -------------------------------------------------------------------------
    // 6. Secções MANTIDAS byte-iguais aos outros níveis dieted
    // -------------------------------------------------------------------------

    it("citations byte-iguais a standard/minimal; relations_ref, codegen_instructions_ref e repeat_call_hint (texto s4 INALTERADO) idem; provenance/next mantidos", () => {
      const standard = runStandard(fixture);
      const minimal = runMinimal(fixture);
      const ultrathin = runUltrathin(fixture);

      expect(JSON.stringify(ultrathin.citations)).toBe(
        JSON.stringify(standard.citations)
      );
      expect(JSON.stringify(ultrathin.citations)).toBe(JSON.stringify(minimal.citations));
      expect(JSON.stringify(ultrathin.g2_context.relations_ref)).toBe(
        JSON.stringify(standard.g2_context.relations_ref)
      );
      expect(JSON.stringify(ultrathin.codegen_instructions_ref)).toBe(
        JSON.stringify(standard.codegen_instructions_ref)
      );
      // s4 intocado: o hint é o MESMO texto exportado (byte-igual).
      expect(ultrathin.repeat_call_hint).toBe(REPEAT_CALL_HINT);
      expect(ultrathin.repeat_call_hint).toBe(standard.repeat_call_hint);
      expect(JSON.stringify(ultrathin.provenance)).toBe(
        JSON.stringify(standard.provenance)
      );
      expect(JSON.stringify(ultrathin.next)).toBe(JSON.stringify(standard.next));
      // Nunca-silencioso do trace (s3): contador exato mantido.
      const full = runFull(fixture);
      expect(ultrathin.activation_trace).toBeUndefined();
      expect(ultrathin.activation_trace_ref?.entries).toBe(
        full.activation_trace.length
      );
      // Echo audível do nível pedido.
      expect(ultrathin.input_echo.detail).toBe("ultrathin");
    });

    it("include_relations=true mantém o escape hatch no ultrathin (relations inline dieted, byte-igual a standard)", () => {
      const ultrathinInline = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "ultrathin",
        include_relations: true
      });
      expectReadyDieted(ultrathinInline);
      const standardInline = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "standard",
        include_relations: true
      });
      expectReadyDieted(standardInline);
      expect(ultrathinInline.g2_context.relations_ref).toBeUndefined();
      expect(JSON.stringify(ultrathinInline.g2_context.relations)).toBe(
        JSON.stringify(standardInline.g2_context.relations)
      );
    });

    // -------------------------------------------------------------------------
    // 7. Invariante 3 — conjunto de ids citáveis idêntico ao full
    // -------------------------------------------------------------------------

    it("invariante 3: conjunto de ids citáveis (via ids_from sobre o PRÓPRIO payload) idêntico ao citation_map do full", () => {
      const full = runFull(fixture);
      const ultrathin = runUltrathin(fixture);
      const fullIds = Object.keys(full.citation_map).sort();
      const ids = citationIds(ultrathin);
      expect(ids.length).toBe(fullIds.length); // sem duplicados nem cortes
      expect([...ids].sort()).toEqual(fullIds);
    });

    // -------------------------------------------------------------------------
    // 8. Determinismo + golden snapshot
    // -------------------------------------------------------------------------

    it("determinismo: 2 chamadas ultrathin idênticas ⇒ payload byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContext({ ...fixture.input, detail: "ultrathin" });
      const second = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "ultrathin"
      });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it("`detail: \"full\"` explícito continua byte-idêntico ao default (invariante 1 intocada pelo s3c)", () => {
      const byDefault = handlePrepareCodegenContext(fixture.input);
      const explicit = handlePrepareCodegenContext({ ...fixture.input, detail: "full" });
      expect(JSON.stringify(explicit)).toBe(JSON.stringify(byDefault));
    });

    it("golden snapshot — ultrathin", async () => {
      const result = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "ultrathin"
      });
      expectReadyDieted(result);
      await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
        `__snapshots__/codegen-detail/${fixture.name}-ultrathin.json`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // standard/minimal ficam INTOCADOS pelo s3c
  // ---------------------------------------------------------------------------

  it("s3c não toca standard/minimal: caps 10/5, grounding com grupos, descriptions presentes, sem descriptions_ref", () => {
    for (const fixture of FIXTURES) {
      const standard = runStandard(fixture);
      expect(standard.completeness_report.evidence_pattern_cap).toBe(10);
      expect(standard.activated_scope.descriptions_ref).toBeUndefined();
      expect(standard.completeness_report).toHaveProperty("v1_manifest_warnings");
      expectGroupedGrounding(standard.manual_grounding);
      const minimal = runMinimal(fixture);
      expect(minimal.completeness_report.evidence_pattern_cap).toBe(5);
      expect(minimal.activated_scope.descriptions_ref).toBeUndefined();
      expect(minimal.completeness_report).toHaveProperty("v1_manifest_warnings");
      expectMinimalGrounding(minimal.manual_grounding);
      expect(
        minimal.activated_scope.requirements.every((item) => item.description)
      ).toBe(true);
    }
  });

  it("caminho blocked: `detail: \"ultrathin\"` não altera a resposta blocked (dieta só em ready)", () => {
    const input: PrepareCodegenContextInput = {
      task: "make the whole application secure please",
      risk_level: "L2"
    };
    const byDefault = handlePrepareCodegenContext(input);
    const dieted = handlePrepareCodegenContext({ ...input, detail: "ultrathin" });
    expect(byDefault.status).not.toBe("ready_for_codegen");
    expect(JSON.stringify(dieted)).toBe(JSON.stringify(byDefault));
  });

  it("valida o input: 'ultrathin' aceite; valores inválidos continuam a falhar com -32602 listando os 4 níveis", () => {
    let thrown: unknown;
    try {
      handlePrepareCodegenContext({
        ...FIXTURES[0]!.input,
        detail: "nano"
      } as unknown as PrepareCodegenContextInput);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/ultrathin, minimal, standard, full/);
    expect((thrown as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(
      -32602
    );
  });
});
