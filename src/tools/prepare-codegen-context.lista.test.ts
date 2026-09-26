/**
 * 0.20.0-beta.21 («declarativo primeiro»): ESTE ficheiro mede CODIFICAÇÃO, não
 * selecção — as fixtures correm em `selection_mode: "discover"` para a série ficar
 * comparável com a do minimal que este perfil substitui.
 */
/**
 * 0.21 §1 — Perfil `lista` (sucessor do `minimal`; ratificado 2026-09-25).
 *
 * A promessa escrita (decisões/0003 §2): «Todo o requisito activado vem completo e
 * verbatim: id, nome, descrição publicada, como se verifica e que prova se espera.
 * Com ele vêm os ids que podes citar, as instruções que te proíbem de inventar ids
 * [...]. O detalhe da adjacência e o ancoramento no manual obtêm-se por referência —
 * nada se perde, muda de sítio.»
 *
 *   1. requisitos COMPLETOS (mesmos ids e ordem do full) — id, name, type,
 *      description, verify, evidence — VERBATIM do bundle; nada só-id;
 *   2. controlos COMPLETOS; directos com description verbatim;
 *   3. activated_scope, entidades g2, citations byte-iguais a `standard`;
 *   4. manual_grounding na forma de contagens: Σ entries == planas do full, sha
 *      hoisted, `entries_ref` EXECUTÁVEL → detail='full' devolve as planas;
 *   5. CADA REF É ALCANÇÁVEL (executada de verdade): verification.by_ref → a matriz
 *      devolve uma linha por requisito com evidence_pattern_id/control_id e
 *      validation_method == verify inline; related_by_control_outside_scope.ref →
 *      resolve_entities devolve os padrões dos controlos activados;
 *   6. invariante 3 local: o SET de ids do grounding vive no próprio payload;
 *   7. determinismo; 8. `lista` ≡ `standard` fora do eco (separador chega na §2).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  citableIds,
  type PrepareCodegenContextResultReadyFull as PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { handleGetVerificationMatrix } from "./get-verification-matrix.js";
import { handleResolveEntities } from "./resolve-entities.js";
import { resolveAppPath } from "../config.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

const __prepareRaw = handlePrepareCodegenContext;
const handlePrepareCodegenContextDiscover = (input: Parameters<typeof __prepareRaw>[0]) =>
  __prepareRaw({ selection_mode: "discover", ...input });

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
  /** 0.21.2: o payload medido passa o envelope — a lista responde needs_decomposition com lotes medidos que somam o todo. */
  dietedBlockedByCeiling?: boolean;
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica)",
    input: { task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email", risk_level: "L2", mode: "codegen" }
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias)",
    input: { task: "Implement a secure endpoint for uploading documents with logging", risk_level: "L2", mode: "codegen" },
    dietedBlockedByCeiling: true
  }
];
/** Só as fixtures que a lista SERVE; a bloqueada prova-se no seu próprio teste, abaixo. */
const SERVED_FIXTURES = FIXTURES.filter((f) => !f.dietedBlockedByCeiling);

function loadBundleItems(relPath: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(resolveAppPath(relPath), "utf-8")) as
    | Array<Record<string, unknown>>
    | { items?: Array<Record<string, unknown>> };
  return Array.isArray(parsed) ? parsed : (parsed.items ?? []);
}

function expectReadyFull(result: PrepareCodegenContextResult): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}
function expectReadyDieted(result: PrepareCodegenContextResult): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}
function runLista(fixture: BaselineFixture): PrepareCodegenContextResultReadyDieted {
  const result = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "lista" });
  expectReadyDieted(result);
  return result;
}
function runStandard(fixture: BaselineFixture): PrepareCodegenContextResultReadyDieted {
  const result = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
  expectReadyDieted(result);
  return result;
}
function runFull(fixture: BaselineFixture): PrepareCodegenContextResultReady {
  const result = handlePrepareCodegenContextDiscover(fixture.input);
  expectReadyFull(result);
  return result;
}
function g2EntityIds(dieted: PrepareCodegenContextResultReadyDieted): Set<string> {
  const ids = new Set<string>();
  for (const list of [dieted.g2_context.control_objectives, dieted.g2_context.mechanisms, dieted.g2_context.practices, dieted.g2_context.artifacts]) {
    for (const entities of Object.values(list)) for (const id of Object.keys(entities)) ids.add(id);
  }
  return ids;
}

describe("prepare_sbd_toe_codegen_context — perfil lista (0.21 §1)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("fixture 2 (69 reqs) @ lista: needs_decomposition por CUSTO MEDIDO (acima de 8 450 tk), lotes medidos que cabem e somam o todo (recall 1); o full serve-a", () => {
    const blockedFixture = FIXTURES.find((f) => f.dietedBlockedByCeiling)!;
    const r = handlePrepareCodegenContextDiscover({ ...blockedFixture.input, detail: "lista" }) as { status: string; requirement_ceiling?: { basis: string; projected_tk: number; promise_tk: number; selected: number; union: { recall: number }; batches: Array<{ requirements: number; measured_tk: number; irreducible: boolean }> } };
    expect(r.status).toBe("needs_decomposition");
    expect(r.requirement_ceiling).toMatchObject({ basis: "measured_payload", selected: 69, promise_tk: 8450 });
    expect(r.requirement_ceiling!.projected_tk).toBeGreaterThan(8450);
    expect(r.requirement_ceiling!.union.recall).toBe(1);
    for (const b of r.requirement_ceiling!.batches) if (!b.irreducible) expect(b.measured_tk).toBeLessThanOrEqual(8450);
    expect(runFull(blockedFixture).activated_scope.requirements.length).toBe(69);
  });

  describe.each(SERVED_FIXTURES)("$label", (fixture) => {
    it("requisitos COMPLETOS (mesmos ids e ordem do full), cada um id+name+type+description+verify+evidence VERBATIM — nada só-id", () => {
      const full = runFull(fixture);
      const lista = runLista(fixture);
      expect(lista.activated_scope.requirements.map((r) => r.id)).toEqual(full.activated_scope.requirements.map((r) => r.id));
      const descriptionById = new Map(loadBundleItems("data/publish/runtime/requirements.json").map((i) => [i.requirement_id as string, i.description as string]));
      const patternByReq = new Map(loadBundleItems("data/publish/runtime/evidence_patterns.json").map((i) => [i.maps_to_requirement_id as string, i]));
      for (const requirement of lista.activated_scope.requirements) {
        expect(requirement.name, `${requirement.id} sem name`).toBeTruthy();
        expect(requirement.type).toMatch(/^(base|domain-specific)$/);
        expect(requirement.description).toBe(descriptionById.get(requirement.id));
        const ep = patternByReq.get(requirement.id)!;
        // padrões com verification_logic VAZIO existem no bundle (EP-ENC-*): o campo não
        // viaja e o requisito conta como `partial` no sumário — declarado, nunca omitido.
        expect(requirement.verify ?? "").toBe((ep.verification_logic as string | undefined) ?? "");
        expect(requirement.evidence ?? "").toBe((ep.evidence_expectation as string | undefined) ?? "");
        const expectedKeys = ["description", "id", "name", "type", ...(requirement.verify ? ["verify"] : []), ...(requirement.evidence ? ["evidence"] : [])].sort();
        expect(Object.keys(requirement).sort()).toEqual(expectedKeys);
      }
    });

    it("controlos COMPLETOS (mesmos ids do full); direct com description verbatim do bundle", () => {
      const full = runFull(fixture);
      const lista = runLista(fixture);
      expect(lista.activated_scope.controls.map((c) => c.control_id)).toEqual(full.activated_scope.controls.map((c) => c.control_id));
      const descriptionById = new Map(loadBundleItems("data/publish/runtime/controls.json").map((i) => [i.control_id as string, i.description as string]));
      for (const control of lista.activated_scope.controls) {
        expect(control.name).toBeTruthy();
        if (control.confidence === "direct") expect(control.description).toBe(descriptionById.get(control.control_id));
        else expect(control.description).toBeUndefined();
      }
    });

    it("activated_scope, entidades g2 e citations byte-iguais a standard (contexto de execução intocado)", () => {
      const standard = runStandard(fixture);
      const lista = runLista(fixture);
      expect(JSON.stringify(lista.activated_scope)).toBe(JSON.stringify(standard.activated_scope));
      for (const list of ["control_objectives", "mechanisms", "practices", "artifacts"] as const) {
        expect(JSON.stringify(lista.g2_context[list])).toBe(JSON.stringify(standard.g2_context[list]));
      }
      expect(JSON.stringify(lista.citations)).toBe(JSON.stringify(standard.citations));
      const full = runFull(fixture);
      const fullIds = new Set([...full.g2_context.control_objectives, ...full.g2_context.mechanisms, ...full.g2_context.practices, ...full.g2_context.artifacts].map((e) => e.entity_id));
      expect(g2EntityIds(lista)).toEqual(fullIds);
    });

    it("grounding por referência: total exacto, Σ entries == total, sha hoisted, entries_ref EXECUTÁVEL → full devolve as entradas planas", () => {
      const full = runFull(fixture);
      const lista = runLista(fixture);
      const grounding = lista.manual_grounding;
      expect(grounding.total_entries).toBe(full.manual_grounding.length);
      expect(grounding.groups.reduce((sum, g) => sum + g.entries, 0) + (grounding.ungrouped?.length ?? 0)).toBe(grounding.total_entries);
      const flatShas = new Set(full.manual_grounding.map((e) => e.manual_commit_sha));
      expect(flatShas.size).toBe(1);
      expect(grounding.manual_commit_sha).toBe([...flatShas][0]);
      for (const group of grounding.groups) {
        expect(group).not.toHaveProperty("manual_commit_sha");
        expect(group.entries).toBeGreaterThan(0);
        expect(group.v1_entity_names).toBeUndefined();
      }
      expect(grounding.ungrouped).toBeUndefined();
      // EXECUTA a referência: mesmo input, detail='full' — as planas, e por grupo as contagens batem.
      expect(grounding.entries_ref.tool).toBe("prepare_sbd_toe_codegen_context");
      const followUp = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: grounding.entries_ref.with.detail });
      expectReadyFull(followUp);
      expect(followUp.manual_grounding.length).toBe(grounding.total_entries);
      for (const group of grounding.groups) {
        const matching = followUp.manual_grounding.filter(
          (e) => e.rastreabilidade_role === group.rastreabilidade_role && (e.manual_chapter ?? null) === (group.manual_chapter ?? null) && (e.manual_file ?? null) === (group.manual_file ?? null)
        );
        expect(matching.length, `grupo ${group.rastreabilidade_role}/${group.manual_chapter}`).toBe(group.entries);
      }
    });

    it("cada ref é ALCANÇÁVEL: verification.by_ref → matriz com uma linha por requisito (evidence_pattern_id, control_id; validation_method == verify inline)", () => {
      const lista = runLista(fixture);
      const v = lista.completeness_report.verification;
      const ids = lista.activated_scope.requirements.map((r) => r.id);
      expect(v.by_ref.calls).toBe(Math.ceil(ids.length / 50));
      const byReq = new Map<string, { evidence_pattern_id: string; control_id?: string; validation_method?: string; expected_evidence?: string; expected_artifact_type_ids?: string[] }>();
      for (let i = 0; i < ids.length; i += 50) {
        const page = handleGetVerificationMatrix({ risk_level: fixture.input.risk_level, requirement_ids: ids.slice(i, i + 50), limit: 50 }) as unknown as { data: { rows: Array<{ requirement_id?: string; evidence_pattern_id: string; control_id?: string; validation_method?: string; expected_evidence?: string; expected_artifact_type_ids?: string[] }>; unknown_requirement_ids?: string[] } };
        expect(page.data.unknown_requirement_ids ?? []).toEqual([]);
        for (const row of page.data.rows) if (row.requirement_id) byReq.set(row.requirement_id, row);
      }
      const patternByReq = new Map(loadBundleItems("data/publish/runtime/evidence_patterns.json").map((i) => [i.maps_to_requirement_id as string, i]));
      for (const requirement of lista.activated_scope.requirements) {
        const row = byReq.get(requirement.id);
        expect(row, `matriz sem linha para ${requirement.id}`).toBeDefined();
        const ep = patternByReq.get(requirement.id)!;
        // os campos por referência chegam pelo destino exactamente como o bundle os publica
        expect(row!.evidence_pattern_id).toBe(ep.id);
        expect(row!.control_id ?? null).toBe((ep.maps_to_control_id as string | undefined) ?? null);
        expect(row!.expected_artifact_type_ids ?? []).toEqual((ep.expected_artifact_type_ids as string[] | undefined) ?? []);
        expect(row!.validation_method ?? "").toBe(requirement.verify ?? "");
        expect(row!.expected_evidence ?? "").toBe(requirement.evidence ?? "");
      }
      const v2 = lista.completeness_report.verification;
      expect(v2.partial).toBe(lista.activated_scope.requirements.filter((r) => !(r.verify && r.evidence)).length);
    });

    it("cada ref é ALCANÇÁVEL: related_by_control_outside_scope.ref → resolve_entities devolve os padrões dos controlos activados; o count bate", () => {
      const lista = runLista(fixture);
      const v = lista.completeness_report.verification;
      const controlIds = lista.activated_scope.controls.map((c) => c.control_id);
      const active = new Set(lista.activated_scope.requirements.map((r) => r.id));
      const found = handleResolveEntities({ record_type: "evidence_pattern", filters: { maps_to_control_id: { in: controlIds } }, limit: 500 });
      // achado colateral da §1 (corrigido): o resolve aplicava o filtro mas anunciava
      // `maps_to_control_id` como desconhecido — o esquema era derivado dos 100 primeiros
      // itens da cache v0 inteira, não dos evidence_patterns. A ref é alcançável E honesta.
      expect(found.unknown_filter_fields ?? []).toEqual([]);
      expect(found.total).toBeGreaterThan(0);
      const entities = found.entities as Array<{ maps_to_requirement_id?: string; maps_to_control_id?: string }>;
      expect(entities.every((e) => e.maps_to_control_id && controlIds.includes(e.maps_to_control_id))).toBe(true);
      expect(found.total).toBe(entities.length);
      const outside = entities.filter((e) => !(e.maps_to_requirement_id && active.has(e.maps_to_requirement_id))).length;
      expect(v.related_by_control_outside_scope.count).toBe(outside);
    });

    it("invariante 3 local: o SET de ids do grounding é reconstruível do PRÓPRIO payload lista (sem chamadas)", () => {
      const full = runFull(fixture);
      const lista = runLista(fixture);
      const citable = new Set(citableIds(full));
      const inPayload = g2EntityIds(lista);
      for (const entry of full.manual_grounding) {
        expect(inPayload.has(entry.v1_entity_id!), `grounding id ${entry.v1_entity_id} fora do payload lista`).toBe(true);
        expect(citable.has(entry.v1_entity_id!)).toBe(true);
      }
    });

    it("determinismo: 2 chamadas lista idênticas ⇒ payload byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "lista" });
      const second = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "lista" });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });
  });

  it("lista ≡ standard fora do eco, do envelope declarado e da adjacência detalhada (0.21 §2: o separador é o detalhe inline vs detail_ref)", () => {
    for (const fixture of SERVED_FIXTURES) {
      const lista = runLista(fixture);
      const standard = runStandard(fixture);
      const normalize = (r: PrepareCodegenContextResultReadyDieted) => JSON.stringify({ ...r, input_echo: null, size_estimate: null, adjacency: null });
      expect(normalize(lista)).toBe(normalize(standard));
      expect(lista.adjacency.detail_ref?.with).toEqual({ detail: "standard" });
      expect(standard.adjacency.detail?.length).toBe(standard.adjacency.would_change_the_set);
      expect(lista.size_estimate?.envelope_tk).toBe(8450);
      expect(standard.size_estimate?.envelope_tk).toBe(9200);
    }
  });
});
