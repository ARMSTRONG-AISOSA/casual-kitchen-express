import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests run inside the Workers runtime (architecture.md 15.4).
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  // The first request into the Workers runtime can take several seconds on a cold start.
  // Test files share the local database (through Hyperdrive's local proxy), and running them at
  // the same time stalled requests, so they run one after another.
  // Each request opens its own database connection through the local proxy, which is slow in
  // tests, so a test making a dozen requests gets a minute.
  test: { testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false },
});
