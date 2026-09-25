/**
 * 0.20.0-beta.21 («declarativo primeiro»): ESTE ficheiro mede CODIFICAÇÃO (dieta v2),
 * não selecção. Para a série de medições continuar comparável byte a byte, as fixtures
 * correm no caminho inferencial histórico — `selection_mode: "discover"` — injectado
 * em `handlePrepareCodegenContext` pelo wrapper abaixo. A selecção declarativa tem os
 * seus próprios testes (selection.declarative.test.ts + next-invariant.beta).
 */
/**
 * s1 — Dieta estrutural (epic v2-token-diet): golden snapshots por `detail`
 * e invariantes da codificação deduplicada. 0.21 §1 (2026-09-25): os níveis
 * passam a `lista`/`standard`/`full` (ultrathin reformado, minimal→lista), o
 * requisito vai FUNDIDO (id, name, type, description, verify, evidence) em
 * todos os níveis, o bloco evidence_patterns morreu, as instruções vão inline
 * e o grounding dos dieted é a forma de contagens com `entries_ref` → full.
 *
 *   - `full` (default e explícito) byte-idêntico entre si (invariante 1);
 *   - golden snapshots por nível (full/standard/lista) para as 2 fixtures;
 *   - conjunto de IDs citáveis IDÊNTICO em todos os níveis (invariante 3);
 *   - dedup sem perda: reconstrução byte-igual a partir do PRÓPRIO payload +
 *     regras documentadas no resource (detail_encoding).
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  citableIds,
  handlePrepareCodegenContext,
  type CitationMapEntry,
  type G2ContextEntity,
  type ManualGroundingEntry,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReadyFull as PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted,
  type SliceGroupedEntityNames,
  type WithoutSource
} from "./prepare-codegen-context.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

/**
 * 0.20.0-beta.23 (P1): `provenance.server` traz a versão do PACOTE — muda a cada
 * release por desenho. Fixá-la nos golden bytes faria a suite da dieta partir a cada
 * bump por uma razão que nada tem que ver com dieta. Normaliza-se aqui (e SÓ aqui):
 * o gate de orçamento continua a medir o payload REAL, com o campo lá dentro.
 */
function snapshotJson(result: unknown): string {
  return JSON.stringify(result, null, 2).replace(/"server": "[^"]*"/g, '"server": "<pkg>"');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __prepareRaw = handlePrepareCodegenContext;
const handlePrepareCodegenContextDiscover = (input: Parameters<typeof __prepareRaw>[0]) =>
  __prepareRaw({ selection_mode: "discover", ...input });


// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (as no budget.test).
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
  /** 0.21 (a): 69 reqs > tecto 52/55 — os níveis dieted respondem needs_decomposition declarado. */
  dietedBlockedByCeiling?: boolean;
}

/** Guarda dos dieted: na fixture bloqueada por tecto, prova o bloqueio declarado e sai. */
function dietedBlocked(fixture: BaselineFixture, detail: "lista" | "standard"): boolean {
  if (!fixture.dietedBlockedByCeiling) return false;
  const r = handlePrepareCodegenContextDiscover({ ...fixture.input, detail }) as { status: string; requirement_ceiling?: { limit: number; selected: number; union: { recall: number } } };
  expect(r.status).toBe("needs_decomposition");
  expect(r.requirement_ceiling!.selected).toBeGreaterThan(r.requirement_ceiling!.limit);
  expect(r.requirement_ceiling!.union.recall).toBe(1);
  return true;
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
    },
    // 0.21 — decisão do lead (a): tecto lista 52 / standard 55. A fixture 2 (69 requisitos)
    // BLOQUEIA por tecto nos níveis dieted (needs_decomposition declarado); só o full a serve.
    dietedBlockedByCeiling: true
  }
];

const DIET_LEVELS = ["standard", "lista"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectReadyFull(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}

function expectReadyDieted(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}

/** Agrupa as entradas planas do full pela mesma chave (role, chapter, file, sha)
 * que a forma de contagens usa — para comparar contagens por grupo. */
function countGroups(flat: readonly ManualGroundingEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of flat) {
    const key = JSON.stringify([
      entry.rastreabilidade_role,
      "manual_chapter" in entry ? entry.manual_chapter ?? null : "<absent>",
      "manual_file" in entry ? entry.manual_file ?? null : "<absent>"
    ]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
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
    case "activated_scope.requirements[].id":
      return dieted.activated_scope.requirements.map((item) => item.id);
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
        handlePrepareCodegenContextDiscover({
          ...FIXTURES[0]!.input,
          detail: bad
        } as unknown as PrepareCodegenContextInput);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `detail=${JSON.stringify(bad)} devia falhar`).toBeInstanceOf(Error);
      expect((thrown as Error).message).toMatch(/lista, standard, full/);
      expect(
        (thrown as Error & { rpcError?: { code: number } }).rpcError?.code
      ).toBe(-32602);
    }
  });

  it("0.21: 'ultrathin' e 'minimal' são recusados com um erro que diz para onde foram (nunca só «inválido»)", () => {
    for (const [retired, expected] of [["ultrathin", /retirou-se.*lista/], ["minimal", /passou a chamar-se 'lista'/]] as const) {
      let thrown: unknown;
      try {
        handlePrepareCodegenContextDiscover({ ...FIXTURES[0]!.input, detail: retired } as unknown as PrepareCodegenContextInput);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toMatch(expected);
      expect((thrown as Error & { rpcError?: { code: number; message: string } }).rpcError?.code).toBe(-32602);
      expect((thrown as Error & { rpcError?: { message: string } }).rpcError?.message).toMatch(expected);
    }
  });

  describe.each(FIXTURES)("$label", (fixture) => {
    it("`detail: \"full\"` explícito é byte-idêntico ao default (invariante 1)", () => {
      const byDefault = handlePrepareCodegenContextDiscover(fixture.input);
      const explicit = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "full" });
      expect(JSON.stringify(explicit)).toBe(JSON.stringify(byDefault));
    });

    it("golden snapshot — full (default)", async () => {
      const result = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(result);
      await expect(snapshotJson(result)).toMatchFileSnapshot(
        `__snapshots__/codegen-detail/${fixture.name}-full.json`
      );
    });

    it.each([...DIET_LEVELS])("golden snapshot — %s", async (detail) => {
      const result = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
      if (fixture.dietedBlockedByCeiling) expect(result.status).toBe("needs_decomposition"); // o snapshot guarda o bloqueio declarado
      else expectReadyDieted(result);
      await expect(snapshotJson(result)).toMatchFileSnapshot(
        `__snapshots__/codegen-detail/${fixture.name}-${detail}.json`
      );
    });

    it("conjunto de IDs citáveis idêntico em todos os níveis (invariante 3)", () => {
      if (dietedBlocked(fixture, "lista")) return;
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      const fullIds = [...new Set(citableIds(full))].sort();
      for (const detail of DIET_LEVELS) {
        const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
        expectReadyDieted(dieted);
        const ids = citationIds(dieted);
        expect(ids.length).toBe(fullIds.length); // sem duplicados nem cortes
        expect([...ids].sort()).toEqual(fullIds);
      }
    });

    it("`citations` invertido (ids_from) reconstrói o mesmo id→{source, source_data} em todos os níveis (0.21 §3: full também invertido, ids por caminhos de lista)", () => {
      if (dietedBlocked(fixture, "standard")) return;
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const rebuilt = rebuildCitationMap(dieted);
      // o full reconstrói-se pela MESMA regra publicada (citableIds), com caminhos de lista
      const fullIds = citableIds(full);
      expect(new Set(fullIds).size).toBe(fullIds.length);
      expect([...fullIds].sort()).toEqual(Object.keys(rebuilt).sort());
      for (const [source, group] of Object.entries(full.citations)) {
        expect(group.ids_from, `${source}: ids_from ausente no full`).toBeDefined();
        expect(JSON.stringify(group.source_data)).toBe(JSON.stringify(dieted.citations[source as CitationMapEntry["source"]]!.source_data));
        for (const path of group.ids_from!) expect(path).not.toMatch(/^keys\(/);
      }
    });

    it("`manual_grounding` na forma de contagens preserva os totais (Σ entries == planas do full; contagens por grupo iguais; entries_ref → full)", () => {
      if (dietedBlocked(fixture, "lista")) return;
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      for (const detail of DIET_LEVELS) {
        const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
        expectReadyDieted(dieted);
        const grounding = dieted.manual_grounding;
        expect(grounding.total_entries).toBe(full.manual_grounding.length);
        const summed = grounding.groups.reduce((sum, group) => sum + group.entries, 0) + (grounding.ungrouped?.length ?? 0);
        expect(summed).toBe(full.manual_grounding.length);
        const expected = countGroups(full.manual_grounding);
        for (const group of grounding.groups) {
          const key = JSON.stringify([
            group.rastreabilidade_role,
            "manual_chapter" in group ? group.manual_chapter ?? null : "<absent>",
            "manual_file" in group ? group.manual_file ?? null : "<absent>"
          ]);
          expect(expected.get(key), `grupo ${key} sem correspondência no full`).toBe(group.entries);
        }
        expect(grounding.groups.length).toBe(expected.size);
        expect(grounding.entries_ref.with).toEqual({ detail: "full" });
      }
    });

    it("reconstrução sem perda: listas dieted + regras do detail_encoding ⇒ full-menos-source byte-igual", () => {
      if (dietedBlocked(fixture, "standard")) return;
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      // s2: por omissão as relations vêm como relations_ref; o caminho inline
      // (include_relations: true) continua a validar-se item a item.
      const dietedWithRelations = handlePrepareCodegenContextDiscover({
        ...fixture.input,
        detail: "standard",
        include_relations: true
      });
      expectReadyDieted(dietedWithRelations);
      // 0.21 §3: o full serve relations_ref; as relations clássicas inline só com include_relations.
      const fullInline = handlePrepareCodegenContextDiscover({ ...fixture.input, include_relations: true });
      expectReadyFull(fullInline);
      expect(Array.isArray(full.g2_context.relations)).toBe(false);
      expect(full.g2_context.relations_ref?.tool).toBe("trace_sbd_toe_graph");
      expect(dieted.g2_context.relations_summary?.total_relations).toBe(full.g2_context.relations_ref?.total_relations);
      expect(dieted.g2_context).not.toHaveProperty("relations_ref");

      const stripSource = <T extends { source: unknown }>(items: readonly T[]) =>
        items.map(({ source: _source, ...rest }) => rest);

      // -- requirements (0.21 §1): o objecto fundido é o MESMO em todos os níveis;
      //    o dieted só retira `source` (category nunca vai: derivável) ⇒ byte-igual.
      expect(JSON.stringify(dieted.activated_scope.requirements)).toBe(
        JSON.stringify(stripSource(full.activated_scope.requirements))
      );
      for (const item of dieted.activated_scope.requirements) {
        expect(item).not.toHaveProperty("category");
        expect(item).not.toHaveProperty("requirement_id");
        expect(item.description).toBeTruthy();
      }

      // -- controls: dedup s1 puro (só source) — a description dos directos vem do core, em todos os níveis.
      expect(JSON.stringify(dieted.activated_scope.controls)).toBe(
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
        JSON.stringify(stripSource(fullInline.g2_context.relations!))
      );

      // -- evidence_patterns (0.21 §1): o bloco NÃO existe em nível nenhum.
      expect(dieted.g2_context).not.toHaveProperty("evidence_patterns");
      expect(full.g2_context).not.toHaveProperty("evidence_patterns");

      // -- instruções + template: INLINE e byte-iguais ao full (0.21).
      expect(JSON.stringify(dieted.llm_codegen_instructions)).toBe(JSON.stringify(full.llm_codegen_instructions));
      expect(JSON.stringify(dieted.security_rationale_template)).toBe(JSON.stringify(full.security_rationale_template));
      expect(dieted).not.toHaveProperty("codegen_instructions_ref");

      // -- activation_trace: elidido (s3) com contador exato; debug=true repõe
      //    (testado no caps-resource.test).
      expect(dieted.activation_trace).toBeUndefined();
      expect(dieted.activation_trace_ref?.entries).toBe(full.activation_trace.length);

      // -- legend inline: aponta para o resource com a legenda completa.
      expect(dieted.provenance_legend.note).toContain("sbd://toe/codegen-instructions/");
    });

    it("0.21 §2: `lista` e `standard` diferem EXACTAMENTE na adjacência detalhada (inline vs detail_ref) — fora disso, do eco e do size_estimate são byte-iguais", () => {
      if (dietedBlocked(fixture, "lista")) return;
      const standard = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      const lista = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "lista" });
      expectReadyDieted(standard);
      expectReadyDieted(lista);
      expect(standard.input_echo.detail).toBe("standard");
      expect(lista.input_echo.detail).toBe("lista");
      const normalize = (result: PrepareCodegenContextResultReadyDieted): string =>
        JSON.stringify({ ...result, input_echo: null, size_estimate: null, adjacency: null });
      expect(normalize(lista)).toBe(normalize(standard));
      expect(standard.adjacency.detail).toBeDefined();
      expect(lista.adjacency.detail).toBeUndefined();
      expect(lista.adjacency.detail_ref?.with).toEqual({ detail: "standard" });
      const { detail: _d, ...standardSummary } = standard.adjacency;
      const { detail_ref: _r, ...listaSummary } = lista.adjacency;
      expect(JSON.stringify(listaSummary)).toBe(JSON.stringify(standardSummary));
      // o envelope declarado é o de cada nível
      expect(lista.size_estimate?.envelope_tk).toBe(8450);
      expect(standard.size_estimate?.envelope_tk).toBe(9200);
    });
  });

  it("caminho blocked: `detail` não altera a resposta blocked (dieta só em ready)", () => {
    const input: PrepareCodegenContextInput = {
      task: "make the whole application secure please",
      risk_level: "L2"
    };
    const byDefault = handlePrepareCodegenContextDiscover(input);
    const dieted = handlePrepareCodegenContextDiscover({ ...input, detail: "lista" });
    expect(byDefault.status).not.toBe("ready_for_codegen");
    expect(JSON.stringify(dieted)).toBe(JSON.stringify(byDefault));
  });
});
