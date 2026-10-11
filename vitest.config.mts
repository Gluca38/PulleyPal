import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Versteht den Import-Kurzweg "@/..." aus tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    // Unit-Tests liegen neben dem Code als *.test.ts(x)
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
