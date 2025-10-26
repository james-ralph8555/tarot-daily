import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";

const dirname = typeof __dirname === "string" ? __dirname : fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@daily-tarot/common": path.resolve(dirname, "../../packages/common/src")
    }
  },
  define: {
    __DEV__: process.env.NODE_ENV !== "production"
  }
});
