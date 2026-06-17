/**
 * protocol-envelope — the SbD-ToE Interaction Protocol response envelope.
 *
 * The Stage-2 spec (agentic/em-curso/2026-06-13-pontifex-interaction-protocol-spec-v0.1.md,
 * ratified 2026-06-14): every protocol-native tool answers with one object:
 *
 *   { data, provenance, coverage?, next? }
 *
 *   - data       — the deterministic answer. Pure, contract-stable; never reshaped
 *                  by the advisory layer (invariants #1, #8).
 *   - provenance — universal; content_type IS the epistemic label (invariant #4).
 *   - coverage   — present when `data` bounds a larger set; never silent (invariant #3).
 *   - next       — ≤3 grounded, ranked, never-auto-executed affordances (invariant #5,
 *                  RF-H). A pure function of `data` so the whole envelope stays
 *                  deterministic.
 *
 * Greenfield tools (the Implementation-view family + this regulatory lens) adopt this
 * from the start — they are the reference implementation of the protocol.
 */

export interface ProtocolProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

/** A grounded next-step affordance — a suggestion, never auto-executed (RF-H). */
export interface Affordance {
  /** What the caller likely wants next, in plain terms. */
  intent: string;
  /** A real MCP tool or resource that provides it (never invented). */
  tool: string;
  /** How to call it — the key args, in words. */
  with?: string;
  /** structural = drill-down on the same thing; semantic = an adjacent need. */
  kind: "structural" | "semantic";
}

export interface ProtocolEnvelope<T> {
  data: T;
  provenance: ProtocolProvenance;
  /** Present only when `data` is a bounded view of a larger set. */
  coverage?: unknown;
  /** Advisory band — at most 3, ranked by likely next intent. */
  next?: Affordance[];
}

/** Caps the advisory band at the protocol limit (≤3), preserving rank order. */
export function boundAffordances(affordances: Affordance[]): Affordance[] {
  return affordances.slice(0, 3);
}
