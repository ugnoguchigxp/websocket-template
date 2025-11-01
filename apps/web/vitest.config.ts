import path from "path"
import react from "@vitejs/plugin-react"
/// <reference types="vitest" />
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"e2e/",
				"**/*.d.ts",
				"**/*.config.*",
				"dist/",
				"coverage/",
			],
		},
		// Exclude E2E tests from Vitest
		exclude: ["node_modules/", "e2e/", "dist/", "**/*.config.*"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@logger": path.resolve(__dirname, "./src/modules/logger"),
		},
	},
})
