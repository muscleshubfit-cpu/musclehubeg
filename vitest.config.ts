import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // foods.ts imports "server-only" (bundle law, audit 2026-09-05).
      // Under Next that resolves via the react-server condition; vitest
      // runs under browser conditions where the package THROWS. Alias it
      // to an empty stub so unit tests can import the data modules.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
