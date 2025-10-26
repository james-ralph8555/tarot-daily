import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@daily-tarot/common": "../../packages/common/src"
    }
  }
});