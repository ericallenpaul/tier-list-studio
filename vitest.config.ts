import { defineConfig } from "vitest/config";
import { transformWithEsbuild } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "transform-cts-sources",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith(".cts")) {
          return undefined;
        }

        return transformWithEsbuild(code, id, {
          format: "esm",
          loader: "ts"
        });
      }
    }
  ],
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/integration/**/*.test.tsx"
    ]
  }
});
