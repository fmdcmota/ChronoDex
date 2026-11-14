/**
 * Vitest configuration: unit tests for pure logic (MASTER.md section 8.3).
 *
 * Owner: Agent 1 (Core). Tests live next to the code as `*.test.ts`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the path aliases in tsconfig.json.
    alias: {
      "@fixtures": path.resolve(root, "fixtures"),
      "@": path.resolve(root, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "fixtures/**/*.test.ts"],
    exclude: ["node_modules/**", "spikes/**", ".next/**"],
  },
});
