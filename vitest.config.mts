import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The database tests create real users and talk to Supabase over the network.
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
