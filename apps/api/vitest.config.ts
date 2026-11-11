import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests run inside the Workers runtime (architecture.md 15.4).
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  // The first request into the Workers runtime can take several seconds on a cold start.
  test: { testTimeout: 20_000 },
});
