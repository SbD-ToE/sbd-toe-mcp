import { describe, expect, it } from "vitest";
import {
  boundList,
  truncateText,
  resolveBudget,
  CONSUMER_BUDGETS,
  paginate,
  estimateSize,
} from "./response-shaping.js";

describe("boundList", () => {
  it("retains the head and reports the full total (no silent truncation)", () => {
    const result = boundList([1, 2, 3, 4, 5], 2);
    expect(result.items).toEqual([1, 2]);
    expect(result.returned).toBe(2);
    expect(result.total).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.omitted).toBe(3);
  });

  it("does not truncate when the limit covers the list", () => {
    const result = boundList([1, 2], 5);
    expect(result.items).toEqual([1, 2]);
    expect(result.truncated).toBe(false);
    expect(result.omitted).toBe(0);
  });

  it("treats non-positive or non-finite limits as empty but keeps the total", () => {
    for (const limit of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = boundList([1, 2, 3], limit);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(3);
      expect(result.truncated).toBe(true);
      expect(result.omitted).toBe(3);
    }
  });

  it("tolerates non-array input", () => {
    const result = boundList(undefined as unknown as number[], 3);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.truncated).toBe(false);
  });
});

describe("truncateText", () => {
  it("truncates and appends an ellipsis, reporting the original length", () => {
    const result = truncateText("abcdefgh", 3);
    expect(result.value).toBe("abc…");
    expect(result.truncated).toBe(true);
    expect(result.originalLength).toBe(8);
  });

  it("leaves short strings untouched", () => {
    const result = truncateText("abc", 10);
    expect(result.value).toBe("abc");
    expect(result.truncated).toBe(false);
    expect(result.originalLength).toBe(3);
  });

  it("disables truncation for non-positive maxChars", () => {
    const result = truncateText("abcdef", 0);
    expect(result.value).toBe("abcdef");
    expect(result.truncated).toBe(false);
  });

  it("coerces non-string input to empty", () => {
    const result = truncateText(undefined, 5);
    expect(result.value).toBe("");
    expect(result.originalLength).toBe(0);
  });
});

describe("resolveBudget", () => {
  it("returns the per-profile defaults", () => {
    expect(resolveBudget("inline")).toEqual(CONSUMER_BUDGETS.inline);
    expect(resolveBudget("diagnostic")).toEqual(CONSUMER_BUDGETS.diagnostic);
  });

  it("defaults to agentic for an unknown profile", () => {
    expect(resolveBudget(undefined)).toEqual(CONSUMER_BUDGETS.agentic);
    expect(resolveBudget("bogus" as never)).toEqual(CONSUMER_BUDGETS.agentic);
  });

  it("applies positive overrides (e.g. an explicit topK as maxRecords)", () => {
    expect(resolveBudget("diagnostic", { maxRecords: 3 })).toEqual({
      maxRecords: 3,
      maxExcerptChars: CONSUMER_BUDGETS.diagnostic.maxExcerptChars,
    });
  });

  it("ignores invalid overrides and keeps the base value", () => {
    expect(resolveBudget("inline", { maxRecords: 0, maxExcerptChars: -1 })).toEqual(
      CONSUMER_BUDGETS.inline
    );
  });
});

describe("estimateSize", () => {
  it("returns the serialized length", () => {
    expect(estimateSize([1, 2, 3])).toBe(JSON.stringify([1, 2, 3]).length);
  });

  it("returns 0 for non-serializable input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(estimateSize(circular)).toBe(0);
  });
});

describe("paginate", () => {
  const data = Array.from({ length: 25 }, (_, i) => i);

  it("returns the first window with a coverage map and size estimate", () => {
    const page = paginate(data, { offset: 0, limit: 10 });
    expect(page.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(page.coverage).toEqual({
      total: 25,
      returned: 10,
      offset: 0,
      nextOffset: 10,
      hasMore: true,
    });
    expect(page.size_estimate).toBe(estimateSize(page.items));
  });

  it("signals exhaustion on the last page", () => {
    const page = paginate(data, { offset: 20, limit: 10 });
    expect(page.items).toEqual([20, 21, 22, 23, 24]);
    expect(page.coverage.hasMore).toBe(false);
    expect(page.coverage.nextOffset).toBeNull();
  });

  it("is coverage-preserving: walking nextOffset yields the full set, no loss/dup", () => {
    const collected: number[] = [];
    let offset: number | null = 0;
    let guard = 0;
    while (offset !== null && guard++ < 100) {
      const page: ReturnType<typeof paginate<number>> = paginate(data, { offset, limit: 7 });
      collected.push(...page.items);
      offset = page.coverage.nextOffset;
    }
    expect(collected).toEqual(data);
  });

  it("clamps an out-of-range offset to the end (empty page, no crash)", () => {
    const page = paginate(data, { offset: 999, limit: 10 });
    expect(page.items).toEqual([]);
    expect(page.coverage.offset).toBe(25);
    expect(page.coverage.hasMore).toBe(false);
  });

  it("falls back to the agentic default limit for invalid limits", () => {
    const page = paginate(data, { limit: 0 });
    expect(page.coverage.returned).toBe(CONSUMER_BUDGETS.agentic.maxRecords);
  });

  it("tolerates non-array input", () => {
    const page = paginate(undefined as unknown as number[], { limit: 5 });
    expect(page.items).toEqual([]);
    expect(page.coverage.total).toBe(0);
  });
});
