import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    // Scope to convex/'s and src/'s unit tests — without the explicit
    // globs, vitest also picks up e2e/*.spec.ts (Playwright tests), which
    // fail hard under vitest (Playwright's test.describe() isn't valid
    // outside its own runner).
    include: ["convex/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
  },
});
