import { defineConfig } from "vite";
export default defineConfig({
  base: "/commerce-test/",
  build: {
    outDir: ".local/harness",
    emptyOutDir: true,
    rollupOptions: { input: "harness/index.html" },
  },
});
