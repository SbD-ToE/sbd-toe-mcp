import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Explicit isolation (belt-and-braces): one ported suite mutates
    // SBD_TOE_APP_ROOT mid-file; worker reuse across files must never leak it.
    pool: "forks",
    isolate: true,
    // The working copy lives on a shared G-DRIVE volume; ~40 concurrent forks
    // reading the bundle JSONs produce rare partial-read flakes (declared_gap /
    // traceability one-offs observed 2026-08-31, never reproducible in small
    // runs). Cap the IO storm — infra mitigation, not a product change.
    maxWorkers: 4
  }
});
