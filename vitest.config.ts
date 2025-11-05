import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environmentMatchGlobs: [
      // Client-side tests with React components use jsdom
      ["tests/unit/client/**", "jsdom"],
      ["**/*.test.tsx", "jsdom"],
      // Server-side and integration tests use node
      ["tests/unit/**", "node"],
      ["tests/integration/**", "node"],
      // Default to node for TypeScript test files
      ["**/*.test.ts", "node"],
    ],
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "tests/e2e/**"],
    setupFiles: ["./tests/setup.ts", "./config/vitest-setup.ts"], // Setup files for test utilities
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.ts",
        "**/*.config.js",
        "**/*.d.ts",
        "tests/e2e/**",
        "tests/integration/helpers/**",
        "api/",
        "**/*.stories.tsx",
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "client/src/main.tsx",
        "client/src/index.css",
        "server/index.ts",
      ],
      include: ["server/**/*.ts", "client/src/**/*.{ts,tsx}", "shared/**/*.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      all: true,
      skipFull: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@config": path.resolve(__dirname, "config"),
    },
  },
});
