import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Explicit isolation (belt-and-braces): one ported suite mutates
    // SBD_TOE_APP_ROOT mid-file; worker reuse across files must never leak it
    // (order-dependent flakes observed 2026-08-31).
    pool: "forks",
    isolate: true
  }
});
