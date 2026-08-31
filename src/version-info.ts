/**
 * version-info — provenance of the served knowledge for the sbd://toe/version
 * resource. Reads the consumed-bundle.json pin (the declaration of which Codex KG
 * build artefact this MCP serves) and exposes the Manual + KG + ontology versions.
 *
 * Best-effort: returns undefined if the pin is absent or malformed so the version
 * resource degrades to package metadata only. Never invents versions/tags — only
 * echoes the verified pin.
 */

import { readFileSync } from "node:fs";
import { resolveAppPath } from "./config.js";

export interface BundleProvenance {
  manual: { tag?: string | undefined; version?: string | undefined; commit?: string | undefined; generated_at?: string | undefined };
  kg: {
    release_tag?: string | undefined;
    sha256?: string | undefined;
    source?: string | undefined;
    substrate_version?: string | undefined;
    consumer_contract_version?: string | undefined;
  };
  ontology: { tag?: string | undefined; commit?: string | undefined };
}

interface ConsumedBundlePin {
  consumer_contract_version?: string;
  substrate_version?: string;
  kg_bundle?: { release_tag?: string; release_sha256?: string; source?: string; surface_built_at?: string };
  inputs?: {
    manual?: { tag?: string; version?: string; commit?: string; generated_at?: string };
    ontology?: { tag?: string; commit?: string };
  };
}

let cached: { value: BundleProvenance | undefined } | undefined;

let cachedKgTag: string | undefined;
/** Compact per-response version stamp (0.13.0): the kg release_tag of the served pin. */
export function servedKgReleaseTag(): string {
  cachedKgTag ??= loadBundleProvenance()?.kg?.release_tag ?? "unknown";
  return cachedKgTag;
}

export function loadBundleProvenance(): BundleProvenance | undefined {
  if (cached !== undefined) {
    return cached.value;
  }

  let pin: ConsumedBundlePin;
  try {
    pin = JSON.parse(readFileSync(resolveAppPath("consumed-bundle.json"), "utf-8")) as ConsumedBundlePin;
  } catch {
    cached = { value: undefined };
    return undefined;
  }

  const value: BundleProvenance = {
    manual: {
      tag: pin.inputs?.manual?.tag,
      version: pin.inputs?.manual?.version,
      commit: pin.inputs?.manual?.commit,
      generated_at: pin.inputs?.manual?.generated_at
    },
    kg: {
      release_tag: pin.kg_bundle?.release_tag,
      sha256: pin.kg_bundle?.release_sha256,
      source: pin.kg_bundle?.source,
      substrate_version: pin.substrate_version,
      consumer_contract_version: pin.consumer_contract_version
    },
    ontology: {
      tag: pin.inputs?.ontology?.tag,
      commit: pin.inputs?.ontology?.commit
    }
  };
  cached = { value };
  return value;
}

/** Test-only: clears the module cache so a test can re-exercise the loader. */
export function _resetBundleProvenanceCache(): void {
  cached = undefined;
}
