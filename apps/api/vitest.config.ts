import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["./Test/setup.ts"],
		include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
		transformMode: {
			web: [/\.[jt]sx?$/],
			ssr: [/\.test.[jt]s?$/],
		},
		deps: {
			inline: ["tsyringe", "reflect-metadata"],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@logger": path.resolve(__dirname, "./src/modules/logger"),
			"@modules": path.resolve(__dirname, "./src/modules"),
			"@middleware": path.resolve(__dirname, "./src/middleware"),
			"@routes": path.resolve(__dirname, "./src/routes"),
			"@routers": path.resolve(__dirname, "./src/routers"),
		},
	},
	optimizeDeps: {
		include: ["reflect-metadata", "tsyringe"],
		force: true,
	},
	ssr: {
		noExternal: ["reflect-metadata", "tsyringe"],
	},
});
