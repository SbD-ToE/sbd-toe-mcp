/**
 * s1 — Dieta estrutural (epic v2-token-diet): golden snapshots por `detail`
 * e invariantes da codificação deduplicada. ATUALIZADO pelo s3 (caps,
 * boilerplate→resource, descriptions) e pelo s3b REVISTO (ADENDA 2026-07-05
 * do operador: sem top-N — `minimal` mantém o conjunto ativado COMPLETO e
 * diverge de `standard` só em serialização de traceability; gates próprios em
 * prepare-codegen-context.minimal.test.ts). Ver
 * prepare-codegen-context.caps-resource.test.ts para os gates específicos do
 * s3; aqui ficam os invariantes s1 adaptados à codificação corrente:
 *
 *   - `full` (default e explícito) byte-idêntico ao comportamento pré-s1;
 *   - golden snapshots por nível (full/standard/minimal) para as 2 fixtures
 *     baseline do EPIC;
 *   - conjunto de IDs citáveis IDÊNTICO em todos os níveis (invariante 3 —
 *     muda a codificação, não o conjunto); desde o s3 os ids vivem nas
 *     secções do payload e `citations.<source>.ids_from` referencia-os
 *     (run-length `source_data` alinhado 1:1) — a reconstrução byte-igual do
 *     `citation_map` clássico prova a codificação;
 *   - dedup sem perda: `manual_grounding` agrupado reconstrói as entradas
 *     planas (como multiset); as listas com campos derivável-elididos
 *     (source, category, entity_type/slice_family, relevance_score)
 *     reconstroem byte-igual a partir do PRÓPRIO payload + regras documentadas
 *     no resource sbd://toe/codegen-instructions/{mode} (detail_encoding).
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type CitationMapEntry,
  type G2ContextEntity,
  type ManualGroundingEntry,
  type ManualGroundingGrouped,
  type ManualGroundingMinimal,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted,
  type SliceGroupedEntityNames,
  type WithoutSource
} from "./prepare-codegen-context.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { requirementCategoryOf } from "../serving/requirement-id.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (as no budget.test).
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

const DIET_LEVELS = ["standard", "minimal"] as const;

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

/** Narrowing: grounding na forma agrupada de `standard` (s3b: `minimal` usa a
 * forma mínima — ver prepare-codegen-context.minimal.test.ts). */
function expectGroupedGrounding(
  grounding: ManualGroundingGrouped | ManualGroundingMinimal
): asserts grounding is ManualGroundingGrouped {
  expect(grounding).not.toHaveProperty("groups_ref");
}

/** Chaves de um mapa de entidades agrupado por slice, na ordem dos grupos e
 * das chaves (= ordem da lista clássica; ver detail_encoding.g2_entities). */
function flattenEntityKeys(grouped: SliceGroupedEntityNames): string[] {
  return Object.values(grouped).flatMap((entities) => Object.keys(entities));
}

/** Resolve um path `ids_from` sobre o PRÓPRIO payload dieted (mini-sintaxe
 * documentada no resource, detail_encoding.citations). */
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

/** Reconstrói o citation_map clássico a partir do `citations` invertido
 * (s3: run-length source_data + ids_from alinhado 1:1 com os ficheiros; os
 * ids vêm das secções do próprio payload, por ordem). */
function rebuildCitationMap(
  dieted: PrepareCodegenContextResultReadyDieted
): Record<string, CitationMapEntry> {
  const rebuilt: Record<string, CitationMapEntry> = {};
  for (const [source, group] of Object.entries(dieted.citations)) {
    const files = Object.entries(group.source_data);
    // Codificação s3: ids_from presente, ids explícitos ausentes (fallback
    // nunca esperado para o bundle publicado).
    expect(group.ids, `fallback ids explícitos inesperado em ${source}`).toBeUndefined();
    expect(group.ids_from, `ids_from ausente em ${source}`).toBeDefined();
    expect(group.ids_from!.length).toBe(files.length); // alinhado 1:1
    for (const [index, [file, count]] of files.entries()) {
      const ids = idsAtPath(dieted, group.ids_from![index]!);
      expect(ids.length, `run-length de ${file} ≠ tamanho da secção`).toBe(count);
      for (const id of ids) {
        rebuilt[id] = {
          source: source as CitationMapEntry["source"],
          source_data: file
        };
      }
    }
  }
  return rebuilt;
}

function citationIds(dieted: PrepareCodegenContextResultReadyDieted): string[] {
  return Object.keys(rebuildCitationMap(dieted));
}

/** Reconstrói as entradas planas de manual_grounding a partir dos grupos +
 * nomes recuperáveis do g2_context do MESMO payload full. */
function rebuildManualGrounding(
  grouped: ManualGroundingGrouped,
  full: PrepareCodegenContextResultReady
): ManualGroundingEntry[] {
  const g2Names = new Map<string, string | undefined>();
  for (const list of [
    full.g2_context.control_objectives,
    full.g2_context.mechanisms,
    full.g2_context.practices,
    full.g2_context.artifacts
  ]) {
    for (const entity of list) g2Names.set(entity.entity_id, entity.name);
  }
  const flat: ManualGroundingEntry[] = [];
  for (const group of grouped.groups) {
    for (const id of group.v1_entity_ids) {
      const entry: ManualGroundingEntry = {
        rastreabilidade_role: group.rastreabilidade_role,
        ...("manual_chapter" in group ? { manual_chapter: group.manual_chapter } : {}),
        ...("manual_file" in group ? { manual_file: group.manual_file } : {}),
        ...(group.manual_commit_sha !== undefined
          ? { manual_commit_sha: group.manual_commit_sha }
          : {}),
        v1_entity_id: id,
        source: "runtime_v1"
      };
      const name = group.v1_entity_names?.[id] ?? g2Names.get(id);
      if (name) entry.v1_entity_name = name;
      // reordena para bater com a ordem de chaves da projeção plana original
      const ordered: ManualGroundingEntry = {
        rastreabilidade_role: entry.rastreabilidade_role,
        ...("manual_chapter" in entry ? { manual_chapter: entry.manual_chapter } : {}),
        ...("manual_file" in entry ? { manual_file: entry.manual_file } : {}),
        ...(entry.manual_commit_sha !== undefined
          ? { manual_commit_sha: entry.manual_commit_sha }
          : {}),
        ...(entry.v1_entity_id ? { v1_entity_id: entry.v1_entity_id } : {}),
        ...(entry.v1_entity_name ? { v1_entity_name: entry.v1_entity_name } : {}),
        source: "runtime_v1"
      };
      flat.push(ordered);
    }
  }
  for (const extra of grouped.ungrouped ?? []) {
    flat.push({ ...extra, source: "runtime_v1" });
  }
  return flat;
}

function canonicalMultiset(entries: readonly unknown[]): string[] {
  return entries.map((entry) => JSON.stringify(entry)).sort();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — `detail` (v2-token-diet s1)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  it("valida o input: `detail` inválido falha com erro claro (-32602)", () => {
    for (const bad of ["compact", "", 42, null, {}] as const) {
      let thrown: unknown;
      try {
        handlePrepareCodegenContext({
          ...FIXTURES[0]!.input,
          detail: bad
        } as unknown as PrepareCodegenContextInput);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `detail=${JSON.stringify(bad)} devia falhar`).toBeInstanceOf(Error);
      expect((thrown as Error).message).toMatch(/minimal, standard, full/);
      expect(
        (thrown as Error & { rpcError?: { code: number } }).rpcError?.code
      ).toBe(-32602);
    }
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    it("`detail: \"full\"` explícito é byte-idêntico ao default (invariante 1)", () => {
      const byDefault = handlePrepareCodegenContext(fixture.input);
      const explicit = handlePrepareCodegenContext({ ...fixture.input, detail: "full" });
      expect(JSON.stringify(explicit)).toBe(JSON.stringify(byDefault));
    });

    it("golden snapshot — full (default)", async () => {
      const result = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(result);
      await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
        `__snapshots__/codegen-detail/${fixture.name}-full.json`
      );
    });

    it.each([...DIET_LEVELS])("golden snapshot — %s", async (detail) => {
      const result = handlePrepareCodegenContext({ ...fixture.input, detail });
      expectReadyDieted(result);
      await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
        `__snapshots__/codegen-detail/${fixture.name}-${detail}.json`
      );
    });

    it("conjunto de IDs citáveis idêntico em todos os níveis (invariante 3)", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const fullIds = Object.keys(full.citation_map).sort();
      for (const detail of DIET_LEVELS) {
        const dieted = handlePrepareCodegenContext({ ...fixture.input, detail });
        expectReadyDieted(dieted);
        const ids = citationIds(dieted);
        expect(ids.length).toBe(fullIds.length); // sem duplicados nem cortes
        expect([...ids].sort()).toEqual(fullIds);
      }
    });

    it("`citations` invertido (ids_from) reconstrói o citation_map clássico byte-igual (dedup sem perda)", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const rebuilt = rebuildCitationMap(dieted);
      // byte-igual: mesmos ids, mesma ordem de inserção, mesmo {source, source_data}
      expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(full.citation_map));
    });

    it("`manual_grounding` agrupado preserva a informação total (multiset das entradas planas)", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const grouped = dieted.manual_grounding;
      expectGroupedGrounding(grouped);
      // contagem exata — s1 não corta nada (invariante 2)
      const groupedCount =
        grouped.groups.reduce((sum, group) => sum + group.v1_entity_ids.length, 0) +
        (grouped.ungrouped?.length ?? 0);
      expect(grouped.total_entries).toBe(full.manual_grounding.length);
      expect(groupedCount).toBe(full.manual_grounding.length);
      // reconstrução (a ordem plana original intercala grupos ⇒ multiset)
      const rebuilt = rebuildManualGrounding(grouped, full);
      expect(canonicalMultiset(rebuilt)).toEqual(canonicalMultiset(full.manual_grounding));
    });

    it("reconstrução sem perda: listas dieted + regras do detail_encoding ⇒ full-menos-source byte-igual", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      // s2: por omissão as relations vêm como relations_ref; o caminho inline
      // (include_relations: true) continua a validar-se item a item.
      const dietedWithRelations = handlePrepareCodegenContext({
        ...fixture.input,
        detail: "standard",
        include_relations: true
      });
      expectReadyDieted(dietedWithRelations);

      const stripSource = <T extends { source: unknown }>(items: readonly T[]) =>
        items.map(({ source: _source, ...rest }) => rest);

      // -- requirements: repõe `category` (= segmento de categoria do id, v1.10:
      //    `REQ-AGN-001` → AGN) e retira a `description` adicionada (s3) ⇒
      //    byte-igual a full-menos-source.
      const rebuiltRequirements = dieted.activated_scope.requirements.map((item) => {
        const { description: _description, ...rest } = item;
        const category = rest.category ?? requirementCategoryOf(item.requirement_id);
        return {
          requirement_id: rest.requirement_id,
          name: rest.name,
          category,
          ...(rest.type !== undefined ? { type: rest.type } : {})
        };
      });
      expect(JSON.stringify(rebuiltRequirements)).toBe(
        JSON.stringify(stripSource(full.activated_scope.requirements))
      );

      // -- controls: retira a `description` (s3, só nos direct) ⇒ byte-igual.
      const rebuiltControls = dieted.activated_scope.controls.map(
        ({ description: _description, ...rest }) => rest
      );
      expect(JSON.stringify(rebuiltControls)).toBe(
        JSON.stringify(stripSource(full.activated_scope.controls))
      );

      // -- slices / obrigações / listas do overlay: dedup s1 puro (só source).
      expect(JSON.stringify(dieted.activated_scope.slices)).toBe(
        JSON.stringify(stripSource(full.activated_scope.slices))
      );
      expect(JSON.stringify(dieted.activated_scope.regulatory_obligations)).toBe(
        JSON.stringify(stripSource(full.activated_scope.regulatory_obligations))
      );
      for (const key of ["frameworks", "obligations", "mappings", "playbooks"] as const) {
        expect(JSON.stringify(dieted.regulatory_overlay[key])).toBe(
          JSON.stringify(stripSource(full.regulatory_overlay[key]))
        );
      }

      // -- entidades g2: mapa {slice_id: {entity_id: name|null}} reconstrói a
      //    lista clássica (entity_type = lista; slice_family via slices).
      const familyBySlice = new Map(
        dieted.activated_scope.slices.map((slice) => [slice.slice_id, slice.objective_family])
      );
      const entityLists = [
        ["control_objectives", "ControlObjective"],
        ["mechanisms", "Mechanism"],
        ["practices", "Practice"],
        ["artifacts", "Artifact"]
      ] as const;
      for (const [list, entityType] of entityLists) {
        const rebuilt: Array<WithoutSource<G2ContextEntity>> = [];
        for (const [sliceId, entities] of Object.entries(dieted.g2_context[list])) {
          for (const [entityId, name] of Object.entries(entities)) {
            rebuilt.push({
              entity_id: entityId,
              entity_type: entityType,
              slice_id: sliceId,
              slice_family: familyBySlice.get(sliceId)!,
              ...(name !== null ? { name } : {})
            });
          }
        }
        expect(
          JSON.stringify(rebuilt),
          `reconstrução de g2_context.${list} divergiu`
        ).toBe(JSON.stringify(stripSource(full.g2_context[list])));
      }

      // -- relations (caminho inline): dedup s1 puro, item a item.
      expect(JSON.stringify(dietedWithRelations.g2_context.relations)).toBe(
        JSON.stringify(stripSource(full.g2_context.relations))
      );

      // -- evidence_patterns: prefixo determinístico do top-25 clássico, sem
      //    relevance_score (a ordem carrega o ranking) — cap nunca-silencioso
      //    (contagens + rest-ref testadas no caps-resource.test).
      const expectedEvidence = full.g2_context.evidence_patterns
        .slice(0, dieted.completeness_report.evidence_pattern_cap)
        .map(({ source: _source, relevance_score: _score, ...rest }) => rest);
      expect(JSON.stringify(dieted.g2_context.evidence_patterns)).toBe(
        JSON.stringify(expectedEvidence)
      );

      // -- activation_trace: elidido (s3) com contador exato; debug=true repõe
      //    (testado no caps-resource.test).
      expect(dieted.activation_trace).toBeUndefined();
      expect(dieted.activation_trace_ref?.entries).toBe(full.activation_trace.length);

      // -- legend inline: aponta para o resource com a legenda completa.
      expect(dieted.provenance_legend.note).toContain("sbd://toe/codegen-instructions/");
    });

    it("s3b (ADENDA 2026-07-05): `minimal` diverge de `standard` SÓ em serialização de traceability (evidence cap 5, grounding mínimo, echo)", () => {
      const standard = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      const minimal = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      expectReadyDieted(standard);
      expectReadyDieted(minimal);
      expect(standard.input_echo.detail).toBe("standard");
      expect(minimal.input_echo.detail).toBe("minimal");

      // Contexto de execução INTOCADO (sem top-N, sem subsetting): o
      // activated_scope completo — requirements/controls com description —,
      // as entidades g2, as citations (ids_from), o relations_ref, o overlay
      // e as referências são byte-iguais aos de standard.
      expect(JSON.stringify(minimal.activated_scope)).toBe(
        JSON.stringify(standard.activated_scope)
      );
      expect(JSON.stringify(minimal.citations)).toBe(JSON.stringify(standard.citations));
      expect(JSON.stringify(minimal.regulatory_overlay)).toBe(
        JSON.stringify(standard.regulatory_overlay)
      );
      expect(JSON.stringify(minimal.codegen_instructions_ref)).toBe(
        JSON.stringify(standard.codegen_instructions_ref)
      );
      const g2Sansevidence = (
        result: PrepareCodegenContextResultReadyDieted
      ): string =>
        JSON.stringify({ ...result.g2_context, evidence_patterns: null });
      expect(g2Sansevidence(minimal)).toBe(g2Sansevidence(standard));

      // Divergências PERMITIDAS (e só estas): input_echo (detail), evidence
      // cap 10→5 (prefixo; contagens no completeness_report) e a forma mínima
      // do manual_grounding. Normalizando-as, os payloads são byte-iguais.
      const normalize = (result: PrepareCodegenContextResultReadyDieted): string =>
        JSON.stringify({
          ...result,
          input_echo: null,
          manual_grounding: null,
          g2_context: { ...result.g2_context, evidence_patterns: null },
          completeness_report: null
        });
      expect(normalize(minimal)).toBe(normalize(standard));

      // Evidence: o minimal (cap 5) é PREFIXO exato do standard (cap 10).
      expect(JSON.stringify(minimal.g2_context.evidence_patterns)).toBe(
        JSON.stringify(standard.g2_context.evidence_patterns.slice(0, 5))
      );
      // Gates específicos do minimal (grounding mínimo, contagens, referências
      // executáveis): prepare-codegen-context.minimal.test.ts.
    });
  });

  it("caminho blocked: `detail` não altera a resposta blocked (dieta só em ready)", () => {
    const input: PrepareCodegenContextInput = {
      task: "make the whole application secure please",
      risk_level: "L2"
    };
    const byDefault = handlePrepareCodegenContext(input);
    const dieted = handlePrepareCodegenContext({ ...input, detail: "minimal" });
    expect(byDefault.status).not.toBe("ready_for_codegen");
    expect(JSON.stringify(dieted)).toBe(JSON.stringify(byDefault));
  });
});
