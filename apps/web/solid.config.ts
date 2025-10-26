import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    preset: "node"
  },
  routeDir: "./src/routes",
  serviceWorker: {
    entry: "./src/service-worker.ts",
    strategies: {
      assets: "cache-first",
      routes: "network-first"
    }
  }
});
