import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: {
      "@daily-tarot/common": path.resolve(__dirname, "../../packages/common/src")
    }
  }
});
