import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [
		react({
			jsxRuntime: "automatic",
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@logger": path.resolve(__dirname, "./src/modules/logger"),
			"@components": path.resolve(__dirname, "./src/components"),
			"@pages": path.resolve(__dirname, "./src/pages"),
			"@hooks": path.resolve(__dirname, "./src/hooks"),
			"@lib": path.resolve(__dirname, "./src/lib"),
		},
	},
	server: {
		host: true,
		port: 5173,
		headers: {
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"X-XSS-Protection": "1; mode=block",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"Permissions-Policy": "geolocation=(), microphone=(), camera=()",
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./Test/setup.ts", "./vitest.setup.mjs"],
		css: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/**",
				"dist/**",
				"**/*.d.ts",
				"**/*.test.ts",
				"**/*.test.tsx",
				"Test/**",
			],
		},
	},
})
