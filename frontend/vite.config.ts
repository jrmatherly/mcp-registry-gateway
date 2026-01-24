import { codecovVitePlugin } from "@codecov/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    // Codecov Bundle Analysis - must be last plugin
    // Only enabled when CODECOV_TOKEN is available (CI environment)
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "mcp-gateway-frontend",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
  root: ".",
  build: {
    outDir: "build",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:7860",
        changeOrigin: true,
      },
    },
  },
});
