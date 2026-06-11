import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { buildCoverageEnvelope } from "./coverage-envelope.js";
import { resolveAppPath } from "../config.js";

function chunk(id: string, block: string, chars: number) {
  return {
    chunk_id: id,
    bundle_id: block,
    title: `Chunk ${id}`,
    size_estimate: { chars, approx_tokens: Math.ceil(chars / 4) },
    text: "x".repeat(chars),
  };
}

describe("buildCoverageEnvelope", () => {
  const chunks = [
    chunk("c1", "01-classificacao-aplicacoes", 100),
    chunk("c2", "01-classificacao-aplicacoes", 200),
    chunk("c3", "02-requisitos-seguranca", 300),
  ];

  it("emits coverage_map entries with id/label/block/size_estimate/retrieval_handle", () => {
    const env = buildCoverageEnvelope(chunks);
    expect(env.coverage_map).toHaveLength(3);
    const e = env.coverage_map[0]!;
    expect(e.id).toBe("c1");
    expect(e.label).toBe("Chunk c1");
    expect(e.block).toBe("01-classificacao-aplicacoes");
    expect(e.size_estimate).toEqual({ chars: 100, approx_tokens: 25 });
    expect(e.retrieval_handle).toBe("mcp_chunks.jsonl#c1");
  });

  it("resumo reports true totals over the full set (blocks + summed size)", () => {
    const env = buildCoverageEnvelope(chunks);
    expect(env.resumo.total).toBe(3);
    expect(env.resumo.blocks).toEqual(["01-classificacao-aplicacoes", "02-requisitos-seguranca"]);
    expect(env.resumo.total_size_estimate).toEqual({ chars: 600, approx_tokens: 25 + 50 + 75 });
  });

  it("paginates the coverage_map but keeps resumo totals (coverage-preserving)", () => {
    const env = buildCoverageEnvelope(chunks, { offset: 0, limit: 2 });
    expect(env.coverage_map).toHaveLength(2);
    expect(env.coverage.total).toBe(3);
    expect(env.coverage.hasMore).toBe(true);
    expect(env.coverage.nextOffset).toBe(2);
    // resumo still reflects the full set, not just the page.
    expect(env.resumo.total).toBe(3);

    const collected: string[] = [];
    let offset: number | null = 0;
    let guard = 0;
    while (offset !== null && guard++ < 50) {
      const page = buildCoverageEnvelope(chunks, { offset, limit: 2 });
      collected.push(...page.coverage_map.map((e) => e.id));
      offset = page.coverage.nextOffset;
    }
    expect(collected).toEqual(["c1", "c2", "c3"]);
  });

  it("tolerates empty / non-array input", () => {
    const env = buildCoverageEnvelope([]);
    expect(env.coverage_map).toEqual([]);
    expect(env.resumo.total).toBe(0);
    expect(env.related_blocks).toEqual([]);
  });

  it("assembles a real envelope over published mcp_chunks (smoke)", () => {
    const path = resolveAppPath("data/publish/indexes/mcp_chunks.jsonl");
    if (!existsSync(path)) return; // bundle not present in this environment
    const real = readFileSync(path, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .slice(0, 20)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    const env = buildCoverageEnvelope(real, { limit: 5 });
    expect(env.coverage_map.length).toBe(5);
    expect(env.resumo.total).toBe(20);
    // Native size_estimate is carried through, not recomputed to 0.
    expect(env.resumo.total_size_estimate.chars).toBeGreaterThan(0);
    for (const e of env.coverage_map) {
      expect(e.retrieval_handle.startsWith("mcp_chunks.jsonl#")).toBe(true);
    }
  });
});
