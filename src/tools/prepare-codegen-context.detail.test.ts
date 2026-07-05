/**
 * s1 — Dieta estrutural (epic v2-token-diet): golden snapshots por `detail`
 * e invariantes da codificação deduplicada.
 *
 * Gates do slice (EPIC §s1):
 *   - `full` (default e explícito) byte-idêntico ao comportamento pré-s1;
 *   - golden snapshots por nível (full/standard/minimal) para as 2 fixtures
 *     baseline do EPIC;
 *   - conjunto de IDs citáveis IDÊNTICO em todos os níveis (invariante 3 —
 *     muda a codificação, não o conjunto);
 *   - dedup sem perda: `citations` invertido reconstrói o `citation_map`
 *     clássico byte-igual; `manual_grounding` agrupado reconstrói as entradas
 *     planas (como multiset — a ordem plana original intercala grupos);
 *   - `provenance_legend` cobre exatamente as listas cujos `source` por item
 *     foram removidos, com o source correto (listas source-homogéneas).
 *
 * s1 é dedup puro: nenhuma truncagem introduzida (invariante 2) — os testes
 * de contagem abaixo (total_entries, somas por grupo) provam-no.
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  handlePrepareCodegenContext,
  type CitationsBySource,
  type CitationMapEntry,
  type ManualGroundingEntry,
  type ManualGroundingGrouped,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
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

function citationIds(citations: CitationsBySource): string[] {
  return Object.values(citations).flatMap((group) => group.ids);
}

/** Reconstrói o citation_map clássico a partir do `citations` invertido
 * (run-length: os N₁ primeiros ids do grupo vêm do 1º ficheiro, etc.). */
function rebuildCitationMap(
  citations: CitationsBySource
): Record<string, CitationMapEntry> {
  const rebuilt: Record<string, CitationMapEntry> = {};
  for (const [source, group] of Object.entries(citations)) {
    let cursor = 0;
    for (const [file, count] of Object.entries(group.source_data)) {
      for (let i = 0; i < count; i++) {
        const id = group.ids[cursor++]!;
        rebuilt[id] = {
          source: source as CitationMapEntry["source"],
          source_data: file
        };
      }
    }
    expect(cursor).toBe(group.ids.length); // run-lengths cobrem todos os ids
  }
  return rebuilt;
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
        const ids = citationIds(dieted.citations);
        expect(ids.length).toBe(fullIds.length); // sem duplicados nem cortes
        expect([...ids].sort()).toEqual(fullIds);
      }
    });

    it("`citations` invertido reconstrói o citation_map clássico byte-igual (dedup sem perda)", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const rebuilt = rebuildCitationMap(dieted.citations);
      // byte-igual: mesmos ids, mesma ordem de inserção, mesmo {source, source_data}
      expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(full.citation_map));
    });

    it("`manual_grounding` agrupado preserva a informação total (multiset das entradas planas)", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const grouped = dieted.manual_grounding;
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

    it("`provenance_legend` cobre as listas com `source` removido, com o source correto", () => {
      const full = handlePrepareCodegenContext(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);

      const listsBySection: Record<string, { fullList: Array<{ source: string }>; dietedList: unknown[] }> = {
        "activated_scope.requirements": {
          fullList: full.activated_scope.requirements,
          dietedList: dieted.activated_scope.requirements
        },
        "activated_scope.controls": {
          fullList: full.activated_scope.controls,
          dietedList: dieted.activated_scope.controls
        },
        "activated_scope.slices": {
          fullList: full.activated_scope.slices,
          dietedList: dieted.activated_scope.slices
        },
        "activated_scope.regulatory_obligations": {
          fullList: full.activated_scope.regulatory_obligations,
          dietedList: dieted.activated_scope.regulatory_obligations
        },
        "g2_context.control_objectives": {
          fullList: full.g2_context.control_objectives,
          dietedList: dieted.g2_context.control_objectives
        },
        "g2_context.mechanisms": {
          fullList: full.g2_context.mechanisms,
          dietedList: dieted.g2_context.mechanisms
        },
        "g2_context.practices": {
          fullList: full.g2_context.practices,
          dietedList: dieted.g2_context.practices
        },
        "g2_context.artifacts": {
          fullList: full.g2_context.artifacts,
          dietedList: dieted.g2_context.artifacts
        },
        "g2_context.relations": {
          fullList: full.g2_context.relations,
          dietedList: dieted.g2_context.relations
        },
        "g2_context.evidence_patterns": {
          fullList: full.g2_context.evidence_patterns,
          dietedList: dieted.g2_context.evidence_patterns
        },
        "regulatory_overlay.frameworks": {
          fullList: full.regulatory_overlay.frameworks,
          dietedList: dieted.regulatory_overlay.frameworks
        },
        "regulatory_overlay.obligations": {
          fullList: full.regulatory_overlay.obligations,
          dietedList: dieted.regulatory_overlay.obligations
        },
        "regulatory_overlay.mappings": {
          fullList: full.regulatory_overlay.mappings,
          dietedList: dieted.regulatory_overlay.mappings
        },
        "regulatory_overlay.playbooks": {
          fullList: full.regulatory_overlay.playbooks,
          dietedList: dieted.regulatory_overlay.playbooks
        }
      };

      const legendSources = dieted.provenance_legend.sources as Record<string, string>;
      for (const [section, { fullList, dietedList }] of Object.entries(listsBySection)) {
        // 1) a legend declara a secção
        expect(legendSources[section], `legend sem entrada para ${section}`).toBeDefined();
        // 2) a lista full é source-homogénea e coincide com a legend
        for (const item of fullList) {
          expect(item.source, `source misto em ${section}`).toBe(legendSources[section]);
        }
        // 3) itens dieted não repetem `source` e nada mais foi alterado
        expect(dietedList.length).toBe(fullList.length); // s1: zero truncagem
        for (const [index, item] of dietedList.entries()) {
          expect(item).not.toHaveProperty("source");
          const { source: _source, ...rest } = fullList[index]!;
          expect(JSON.stringify(item)).toBe(JSON.stringify(rest));
        }
      }
      // manual_grounding agrupado: source coberto pela legend
      expect(legendSources["manual_grounding.groups"]).toBe("runtime_v1");
      // activation_trace: `source` é o TIPO de trigger, não proveniência — mantém-se
      expect(dieted.activation_trace[0]).toHaveProperty("source");
      expect(JSON.stringify(dieted.activation_trace)).toBe(
        JSON.stringify(full.activation_trace)
      );
    });

    it("s1: `minimal` e `standard` partilham a codificação (diferem só no echo do detail)", () => {
      const standard = handlePrepareCodegenContext({ ...fixture.input, detail: "standard" });
      const minimal = handlePrepareCodegenContext({ ...fixture.input, detail: "minimal" });
      expectReadyDieted(standard);
      expectReadyDieted(minimal);
      expect(standard.input_echo.detail).toBe("standard");
      expect(minimal.input_echo.detail).toBe("minimal");
      const stripEcho = (result: PrepareCodegenContextResultReadyDieted): string =>
        JSON.stringify({ ...result, input_echo: null });
      // NOTA s3/s3b: quando os níveis divergirem, substituir esta igualdade
      // pelos contratos próprios de cada nível.
      expect(stripEcho(minimal)).toBe(stripEcho(standard));
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
