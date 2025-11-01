import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client";
import { loggerLink } from "@trpc/client/links/loggerLink";
import superjson from "superjson";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { AppRouter } from "../src/routers/index.js";

describe("Login API Test with jose", () => {
	it("should successfully login with admin credentials", async () => {
		// Create WebSocket client
		const wsClient = createWSClient({
			url: "ws://localhost:3001",
			WebSocket: WebSocket as any,
		});

		// Create tRPC client
		const client = createTRPCProxyClient<AppRouter>({
			transformer: superjson,
			links: [loggerLink({ enabled: () => false }), wsLink({ client: wsClient })],
		});

		// Test login
		const result = await client.auth.login.mutate({
			username: "admin",
			password: "websocket3001",
		});

		// Verify response
		expect(result).toHaveProperty("accessToken");
		expect(result).toHaveProperty("refreshToken");
		expect(typeof result.accessToken).toBe("string");
		expect(typeof result.refreshToken).toBe("string");
		expect(result.accessToken.length).toBeGreaterThan(0);
		expect(result.refreshToken.length).toBeGreaterThan(0);

		console.log("✅ Login successful!");
		console.log("Access Token:", result.accessToken.substring(0, 50) + "...");
		console.log("Refresh Token:", result.refreshToken.substring(0, 50) + "...");

		// Cleanup
		wsClient.close();
	}, 10000);

	it("should fetch user data with valid token", async () => {
		// First, login to get token
		const wsClient1 = createWSClient({
			url: "ws://localhost:3001",
			WebSocket: WebSocket as any,
		});

		const client1 = createTRPCProxyClient<AppRouter>({
			transformer: superjson,
			links: [loggerLink({ enabled: () => false }), wsLink({ client: wsClient1 })],
		});

		const loginResult = await client1.auth.login.mutate({
			username: "admin",
			password: "websocket3001",
		});

		wsClient1.close();

		// Create authenticated client with token
		const wsClient2 = createWSClient({
			url: "ws://localhost:3001",
			WebSocket: class extends WebSocket {
				constructor(url: string) {
					super(url, ["bearer", loginResult.accessToken]);
				}
			} as any,
		});

		const client2 = createTRPCProxyClient<AppRouter>({
			transformer: superjson,
			links: [loggerLink({ enabled: () => false }), wsLink({ client: wsClient2 })],
		});

		// Test auth.me
		const user = await client2.auth.me.query();

		// Verify user data
		expect(user).toHaveProperty("id");
		expect(user).toHaveProperty("username");
		expect(user).toHaveProperty("role");
		expect(user.username).toBe("admin");

		console.log("✅ User data fetched successfully!");
		console.log("User:", user);

		// Cleanup
		wsClient2.close();
	}, 10000);
});
