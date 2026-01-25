import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	plugins: [react(), tailwindcss()],
	root: ".",
	build: {
		outDir: "build",
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Vendor chunks for better caching
					if (id.includes("node_modules")) {
						if (id.includes("react-router")) {
							return "vendor-router";
						}
						if (
							id.includes("@headlessui") ||
							id.includes("@radix-ui") ||
							id.includes("@tabler/icons") ||
							id.includes("motion")
						) {
							return "vendor-ui";
						}
						if (id.includes("axios") || id.includes("clsx")) {
							return "vendor-utils";
						}
						// React and React-DOM go to main vendor chunk
						if (id.includes("react") || id.includes("react-dom")) {
							return "vendor-react";
						}
					}
				},
			},
		},
	},
	server: {
		port: 3000,
		// Enable HMR (Hot Module Replacement) for fast development
		hmr: {
			overlay: true,
		},
		// Proxy all API and auth requests to the backend
		proxy: {
			// Main API endpoints
			"/api": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// Authentication endpoints
			"/auth": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// Health check endpoints
			"/health": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// Anthropic registry API (v0.1)
			"/v0.1": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// Well-known discovery endpoints
			"/.well-known": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// MCP server endpoints
			"/mcp": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
			// Version endpoint
			"/version": {
				target: "http://localhost:7860",
				changeOrigin: true,
			},
		},
	},
});
