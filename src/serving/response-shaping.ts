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

/**
 * Size estimate of a serialized value. Shape matches the consumer contract v1.3
 * §1.12 (`size_estimate: { chars, approx_tokens }`) so this serving helper speaks
 * the contract's vocabulary directly when the E5 envelope binds.
 */
export interface SizeEstimate {
  chars: number;
  approx_tokens: number;
}

/**
 * Estimated serialized size of a value — a cheap proxy for the token/byte cost a
 * consumer pays, so it can budget without re-serializing. `approx_tokens` uses
 * the conventional ~4-chars-per-token heuristic. Non-serializable input yields 0/0.
 */
export function estimateSize(value: unknown): SizeEstimate {
  let chars = 0;
  try {
    chars = JSON.stringify(value)?.length ?? 0;
  } catch {
    chars = 0;
  }
  return { chars, approx_tokens: Math.ceil(chars / 4) };
}

export interface PageRequest {
  /** 0-based index of the first item to return. */
  offset?: number | undefined;
  /** Maximum items in the page. */
  limit?: number | undefined;
}

/**
 * Pagination cursor for a page. Makes omission explicit and tells the consumer
 * how to retrieve the rest: walking `nextOffset` yields the full set with nothing
 * silently dropped (coverage-preserving). Distinct from the contract's
 * `coverage_map` (v1.3 §1.12) — that is a per-item `{id,label,block,size_estimate,
 * retrieval_handle}` index over chunk surfaces; this is a generic list cursor.
 */
export interface PageCoverage {
  /** Total items available across all pages. */
  total: number;
  /** Items returned in this page. */
  returned: number;
  /** 0-based start index of this page. */
  offset: number;
  /** Cursor for the next page, or null when this page reaches the end. */
  nextOffset: number | null;
  /** True when more items exist beyond this page. */
  hasMore: boolean;
}

export interface Page<T> {
  items: T[];
  coverage: PageCoverage;
  /** Estimated serialized size of `items` ({ chars, approx_tokens }, contract v1.3 §1.12). */
  size_estimate: SizeEstimate;
}

/**
 * Coverage-preserving pagination. Returns a window plus a {@link CoverageMap}
 * the consumer follows (via `nextOffset`) to retrieve everything without loss.
 * Out-of-range/invalid offsets clamp to a valid window; `limit` defaults to the
 * agentic budget. This is the serving mechanism the consumer contract (v1.3/E5)
 * projects through — bundle-independent.
 */
export function paginate<T>(
  items: readonly T[],
  request: PageRequest = {},
  defaultLimit: number = CONSUMER_BUDGETS.agentic.maxRecords
): Page<T> {
  const source = Array.isArray(items) ? items : [];
  const total = source.length;

  const limit =
    Number.isFinite(request.limit) && (request.limit as number) > 0
      ? Math.floor(request.limit as number)
      : defaultLimit;
  const rawOffset =
    Number.isFinite(request.offset) && (request.offset as number) > 0
      ? Math.floor(request.offset as number)
      : 0;
  const offset = Math.min(rawOffset, total);

  const page = source.slice(offset, offset + limit);
  const end = offset + page.length;
  const hasMore = end < total;

  return {
    items: page,
    coverage: {
      total,
      returned: page.length,
      offset,
      nextOffset: hasMore ? end : null,
      hasMore,
    },
    size_estimate: estimateSize(page),
  };
}
