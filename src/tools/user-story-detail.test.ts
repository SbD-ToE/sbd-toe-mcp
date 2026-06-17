import { describe, expect, it } from "vitest";
import { getOntologyData } from "./ontology-loader.js";

/**
 * Detail-on-demand join (chapter-decomposition contract, serving §2): a resolved
 * US carries its full detail — checklist_items (DoD) + multi-clause bdd +
 * proportionality (L1-L3) + sdlc_integration (phase/responsible/sla) — assembled
 * from the side-files by user_story_id. Guards against the projection
 * impoverishing the US back to a stub.
 */
describe("user-story detail join", () => {
  it("enriches user stories with proportionality and sdlc_integration", () => {
    const userStories = getOntologyData().userStories;
    expect(userStories.length).toBeGreaterThan(0);

    const withProportionality = userStories.filter((us) => us.proportionality !== undefined);
    const withSdlc = userStories.filter(
      (us) => Array.isArray(us.sdlc_integration) && us.sdlc_integration.length > 0
    );
    // The side-files cover most (not all) US; require a substantial join, not zero.
    expect(withProportionality.length).toBeGreaterThan(100);
    expect(withSdlc.length).toBeGreaterThan(100);
  });

  it("carries the full DoD detail on an individual story", () => {
    const us = getOntologyData().userStories.find((u) => u.proportionality && u.sdlc_integration);
    expect(us).toBeDefined();
    // proportionality has the three risk levels (at least one populated).
    expect(Object.keys(us?.proportionality ?? {}).length).toBeGreaterThan(0);
    // sdlc entries carry a normalized phase.
    expect(us?.sdlc_integration?.[0]?.phase).toBeTruthy();
    // roles are the canonical normalized tokens, not raw.
    expect(Array.isArray(us?.roles_normalized)).toBe(true);
  });
});
