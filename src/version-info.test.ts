import { describe, it, expect, beforeEach } from "vitest";
import { loadBundleProvenance, _resetBundleProvenanceCache } from "./version-info.js";

describe("loadBundleProvenance", () => {
  beforeEach(() => {
    _resetBundleProvenanceCache();
  });

  it("surfaces the manual and KG versions from the consumed-bundle pin", () => {
    const p = loadBundleProvenance();
    expect(p).toBeDefined();

    // Manual provenance — version + commit are pinned, never invented.
    expect(typeof p?.manual.version).toBe("string");
    expect(p?.manual.version?.length).toBeGreaterThan(0);
    expect(p?.manual.commit).toMatch(/^[0-9a-f]{7,40}$/);

    // KG provenance — the release tag the MCP serves + the consumer contract.
    expect(p?.kg.release_tag).toMatch(/^kg-v1-manual-/);
    expect(p?.kg.consumer_contract_version).toMatch(/^v\d/);
    // sha256 (when present) is a 64-hex digest — shape-checked, never fabricated.
    if (p?.kg.sha256) {
      expect(p.kg.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("caches the result across calls", () => {
    const first = loadBundleProvenance();
    const second = loadBundleProvenance();
    expect(second).toBe(first);
  });
});
