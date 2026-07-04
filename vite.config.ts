import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    // Phaser is the browser game runtime and is required before the first
    // scene starts, so the initial bundle intentionally exceeds Vite's 500 kB
    // generic web-app warning threshold.
    chunkSizeWarningLimit: 1_500,
  },
});
