import { describe, it, expect, beforeEach } from "vitest";
import { loadBundleProvenance, _resetBundleProvenanceCache } from "./version-info.js";

describe("loadBundleProvenance", () => {
  beforeEach(() => {
    _resetBundleProvenanceCache();
  });

  it("surfaces the manual and KG versions from the consumed-bundle pin", () => {
    const p = loadBundleProvenance();
    expect(p).toBeDefined();

    // Manual provenance — the REAL Manual tag/version (read from run_manifest.manual,
    // not the KG compiler version); pinned, never invented, never the "0.1.0" placeholder.
    expect(typeof p?.manual.version).toBe("string");
    expect(p?.manual.version?.length).toBeGreaterThan(0);
    expect(p?.manual.version).not.toBe("0.1.0"); // placeholder must never resurface
    expect(p?.manual.tag).toMatch(/^v\d+\.\d+/); // e.g. v1.6.4
    expect(p?.manual.commit).toMatch(/^[0-9a-f]{7,40}$/);
    // For the cycle-aligned dev-build tag scheme, the KG tag embeds the manual-vX.Y.Z
    // component; the formal semver release scheme (vX.Y.Z) does not — so only cross-check
    // when the tag is cycle-aligned. (The manual tag is verified independently above.)
    if (p?.kg.release_tag?.startsWith("kg-v1-manual-")) {
      expect(p.kg.release_tag).toContain((p?.manual.tag ?? "").replace(/^v/, "manual-v"));
    }

    // KG provenance — the release tag (cycle-aligned dev-build OR formal semver release)
    // + the consumer contract.
    expect(p?.kg.release_tag).toMatch(/^(kg-v1-manual-|v\d+\.\d+)/);
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
