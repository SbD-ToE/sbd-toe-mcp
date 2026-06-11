/**
 * response-shaping
 *
 * Consumer-aware, bundle-independent bounding of MCP responses. This is the
 * serving-layer seam through which the Codex consumer contract (v1.3, axis E5)
 * projects the published substrate to different consumer surfaces — inline
 * (size-constrained, e.g. Copilot), agentic (contract-strict autonomous
 * clients), governance (aggregated), and diagnostic (inspection).
 *
 * Shaping NEVER alters the substrate: it only bounds how much of an
 * already-resolved result is serialized, and it NEVER truncates silently —
 * every bound emits an explicit count so the consumer can tell that more
 * exists (AGENTS.md §3.4 + "no silent caps").
 */

export interface BoundedList<T> {
  /** The retained head of the list, at most `limit` items. */
  items: T[];
  /** Number of items actually returned. */
  returned: number;
  /** Total number of items before bounding. */
  total: number;
  /** True when `returned < total` (items were omitted). */
  truncated: boolean;
  /** Count of omitted items (`total - returned`). */
  omitted: number;
}

/**
 * Bound a list to at most `limit` items, preserving order and reporting the
 * total so truncation is never silent. `limit <= 0` yields an empty list with
 * the full count still reported.
 */
export function boundList<T>(items: readonly T[], limit: number): BoundedList<T> {
  const source = Array.isArray(items) ? items : [];
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  const kept = source.slice(0, safeLimit);
  return {
    items: kept,
    returned: kept.length,
    total: source.length,
    truncated: kept.length < source.length,
    omitted: source.length - kept.length,
  };
}

export interface TruncatedText {
  /** The bounded string (with an ellipsis appended when truncated). */
  value: string;
  /** True when the original string exceeded `maxChars`. */
  truncated: boolean;
  /** Length of the original string, before truncation. */
  originalLength: number;
}

/**
 * Truncate a string to at most `maxChars` visible characters, appending an
 * ellipsis when shortened. `maxChars <= 0` disables truncation (returns the
 * value unchanged). Non-string input is coerced to an empty result.
 */
export function truncateText(value: unknown, maxChars: number): TruncatedText {
  if (typeof value !== "string") {
    return { value: "", truncated: false, originalLength: 0 };
  }
  if (!Number.isFinite(maxChars) || maxChars <= 0 || value.length <= maxChars) {
    return { value, truncated: false, originalLength: value.length };
  }
  return {
    value: `${value.slice(0, Math.floor(maxChars))}…`,
    truncated: true,
    originalLength: value.length,
  };
}

/**
 * Consumer surfaces recognized by the serving layer. The concrete mapping of
 * consumer → profile is owned by the consumer contract (v1.3); this enum is the
 * stable vocabulary the contract resolves against.
 */
export type ConsumerProfile = "inline" | "agentic" | "governance" | "diagnostic";

export interface ShapingBudget {
  /** Maximum number of records serialized into a response. */
  maxRecords: number;
  /** Maximum visible characters per free-text excerpt. */
  maxExcerptChars: number;
}

/**
 * Default per-surface budgets. Conservative for inline (token-constrained IDE
 * assistants), generous-but-bounded for diagnostic inspection. These are
 * defaults: the consumer contract may override per-tool via {@link resolveBudget}.
 */
export const CONSUMER_BUDGETS: Record<ConsumerProfile, ShapingBudget> = {
  inline: { maxRecords: 5, maxExcerptChars: 240 },
  agentic: { maxRecords: 15, maxExcerptChars: 480 },
  governance: { maxRecords: 50, maxExcerptChars: 320 },
  diagnostic: { maxRecords: 15, maxExcerptChars: 600 },
};

/**
 * Resolve a shaping budget for a consumer profile, applying optional per-tool
 * overrides (e.g. an explicit `topK` overriding `maxRecords`). Unknown profiles
 * fall back to `agentic`.
 */
export function resolveBudget(
  profile: ConsumerProfile = "agentic",
  overrides: Partial<ShapingBudget> = {}
): ShapingBudget {
  const base = CONSUMER_BUDGETS[profile] ?? CONSUMER_BUDGETS.agentic;
  const merged: ShapingBudget = { ...base, ...overrides };
  return {
    maxRecords:
      Number.isFinite(merged.maxRecords) && merged.maxRecords > 0
        ? Math.floor(merged.maxRecords)
        : base.maxRecords,
    maxExcerptChars:
      Number.isFinite(merged.maxExcerptChars) && merged.maxExcerptChars > 0
        ? Math.floor(merged.maxExcerptChars)
        : base.maxExcerptChars,
  };
}
