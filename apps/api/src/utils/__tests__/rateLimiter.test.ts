/**
 * Rate Limiter Tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import { RateLimiter } from "../rateLimiter.js";

describe("RateLimiter", () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter({
			windowMs: 1000, // 1 second
			maxRequests: 5,
		});
	});

	it("should allow requests within limit", () => {
		const result = rateLimiter.checkLimit("user1");
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it("should deny requests when limit exceeded", () => {
		// Use up all allowed requests
		for (let i = 0; i < 5; i++) {
			rateLimiter.checkLimit("user1");
		}

		// Next request should be denied
		const result = rateLimiter.checkLimit("user1");
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it("should reset after window expires", async () => {
		// Use up all allowed requests
		for (let i = 0; i < 5; i++) {
			rateLimiter.checkLimit("user1");
		}

		// Wait for window to reset
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Should allow requests again
		const result = rateLimiter.checkLimit("user1");
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it("should handle multiple users independently", () => {
		// User 1 uses up all requests
		for (let i = 0; i < 5; i++) {
			rateLimiter.checkLimit("user1");
		}

		// User 1 should be denied
		expect(rateLimiter.checkLimit("user1").allowed).toBe(false);

		// User 2 should still be allowed
		expect(rateLimiter.checkLimit("user2").allowed).toBe(true);
	});

	it("should provide correct status", () => {
		rateLimiter.checkLimit("user1");
		rateLimiter.checkLimit("user1");

		const status = rateLimiter.getStatus("user1");
		expect(status).toBeDefined();
		expect(status?.remaining).toBe(3);
		expect(status?.totalHits).toBe(2);
	});

	it("should reset specific user", () => {
		// Use some requests
		rateLimiter.checkLimit("user1");
		rateLimiter.checkLimit("user1");

		// Reset user
		rateLimiter.reset("user1");

		// Should be back to full limit
		const result = rateLimiter.checkLimit("user1");
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it("should use custom key generator", () => {
		const customLimiter = new RateLimiter({
			windowMs: 1000,
			maxRequests: 3,
			keyGenerator: (id) => `prefix:${id}`,
		});

		customLimiter.checkLimit("user1");
		const status = customLimiter.getStatus("user1");
		expect(status).toBeDefined();
		expect(status?.remaining).toBe(2);
	});

	it("should provide stats", () => {
		rateLimiter.checkLimit("user1");
		rateLimiter.checkLimit("user2");

		const stats = rateLimiter.getStats();
		expect(stats.totalEntries).toBe(2);
		expect(stats.activeEntries).toBe(2);
		expect(stats.memoryUsage).toBeGreaterThan(0);
	});

	it("should cleanup expired entries", async () => {
		rateLimiter.checkLimit("user1");

		// Wait for entries to expire
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Trigger cleanup
		rateLimiter.cleanup();

		const stats = rateLimiter.getStats();
		expect(stats.activeEntries).toBe(0);
	});

	it("should shutdown cleanly", () => {
		rateLimiter.checkLimit("user1");

		expect(() => rateLimiter.shutdown()).not.toThrow();

		const stats = rateLimiter.getStats();
		expect(stats.totalEntries).toBe(0);
	});
});
