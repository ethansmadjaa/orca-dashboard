import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tests run on Node; Bun-only modules (exec.ts, index.ts) are kept out of the unit-tested code.
// Component tests opt into jsdom with a `// @vitest-environment jsdom` pragma.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    restoreMocks: true,
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/server/index.ts",
        "src/server/exec.ts",
        "src/client/main.tsx",
        "src/test/**",
      ],
    },
  },
});
