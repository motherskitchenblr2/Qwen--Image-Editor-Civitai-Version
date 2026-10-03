import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "frontend/**",
      "backend/**",
      "**/.git/**",
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ["default"],
    isolate: true,
    passWithNoTests: false,
  },
});
