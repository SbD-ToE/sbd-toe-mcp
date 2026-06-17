import { describe, expect, it } from "vitest";
import { inspectManualRetrieval, searchManualQuestion } from "./ask-manual.js";

/**
 * Regression guard for the inspect_retrieval token-bomb: before bounding, the
 * tool serialized the full candidate pool (~4k records, ~17MB) regardless of
 * topK. These tests assert that topK now bounds the serialized output and that
 * truncation is reported explicitly (never silent).
 */
describe("inspectManualRetrieval bounding", () => {
  it("bounds retrieved records to topK and reports the full total", async () => {
    const result = await inspectManualRetrieval("secure dependency management", 5, {});
    const meta = result.debug.meta;

    expect(meta).toBeDefined();
    expect(result.debug.retrieved.length).toBeLessThanOrEqual(5);
    expect(result.debug.retrieved.length).toBe(meta?.retrievedReturned);
    // The candidate pool is large; topK=5 must omit the rest, explicitly.
    expect(meta?.retrievedTotal ?? 0).toBeGreaterThan(result.debug.retrieved.length);
    expect(meta?.retrievedTruncated).toBe(true);
    expect(meta?.retrievedOmitted).toBe((meta?.retrievedTotal ?? 0) - (meta?.retrievedReturned ?? 0));
  });

  it("keeps the serialized payload small (was ~17MB before the bound)", async () => {
    const result = await inspectManualRetrieval("secure dependency management", 5, {});
    const bytes = JSON.stringify(result).length;
    expect(bytes).toBeLessThan(512 * 1024);
  });

  it("truncates excerpts to the diagnostic budget", async () => {
    const result = await inspectManualRetrieval("secure dependency management", 5, {});
    const max = result.debug.meta?.excerptMaxChars ?? 0;
    expect(max).toBeGreaterThan(0);
    for (const record of result.debug.retrieved) {
      // +1 tolerates the appended ellipsis on truncated excerpts.
      expect(record.excerpt.length).toBeLessThanOrEqual(max + 1);
    }
  });

  it("raising topK widens the window monotonically", async () => {
    const narrow = await inspectManualRetrieval("secure dependency management", 3, {});
    const wide = await inspectManualRetrieval("secure dependency management", 12, {});
    expect(wide.debug.retrieved.length).toBeGreaterThanOrEqual(narrow.debug.retrieved.length);
    expect(narrow.debug.meta?.retrievedTotal).toBe(wide.debug.meta?.retrievedTotal);
  });
});

/**
 * Regression guard for the search debug=true token-bomb: the debug appendix used
 * to serialize the full candidate pool (~5MB) regardless of topK. Now topK bounds
 * it, with explicit truncation metadata.
 */
describe("searchManualQuestion debug bounding", () => {
  it("bounds the debug retrieved set + text when debug is on", async () => {
    const result = await searchManualQuestion("secure dependency management", true, 5, {});
    expect(result.debug.retrieved.length).toBeLessThanOrEqual(5);
    expect(result.debug.meta?.retrievedReturned).toBe(result.debug.retrieved.length);
    expect(result.debug.meta?.retrievedTotal ?? 0).toBeGreaterThan(result.debug.retrieved.length);
    expect(result.debug.meta?.retrievedTruncated).toBe(true);
    // Whole payload stays well under budget (was ~5MB before bounding).
    expect(JSON.stringify(result).length).toBeLessThan(512 * 1024);
  });

  it("raising topK widens the debug window monotonically", async () => {
    const narrow = await searchManualQuestion("secure dependency management", true, 3, {});
    const wide = await searchManualQuestion("secure dependency management", true, 12, {});
    expect(wide.debug.retrieved.length).toBeGreaterThanOrEqual(narrow.debug.retrieved.length);
    expect(narrow.debug.meta?.retrievedTotal).toBe(wide.debug.meta?.retrievedTotal);
  });
});
