import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadRateLimiter() {
	vi.resetModules();
	return await import("../src/utils/rateLimit.js");
}

describe("rateLimit utilities", () => {
	beforeEach(() => {
		process.env.RATE_LIMIT_TOKENS = "3";
		process.env.RATE_LIMIT_INTERVAL_MS = "1000";
		vi.useFakeTimers();
	});

	afterEach(() => {
		delete process.env.RATE_LIMIT_TOKENS;
		delete process.env.RATE_LIMIT_INTERVAL_MS;
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it("allows requests up to the configured limit", async () => {
		const { allowRequest } = await loadRateLimiter();
		const key = "user-1";

		expect(allowRequest(key)).toBe(true);
		expect(allowRequest(key)).toBe(true);
		expect(allowRequest(key)).toBe(true);
		expect(allowRequest(key)).toBe(false);
	});

	it("refills tokens after the interval elapses", async () => {
		const { allowRequest } = await loadRateLimiter();
		const key = "user-2";

		allowRequest(key);
		allowRequest(key);
		allowRequest(key);
		expect(allowRequest(key)).toBe(false);

		vi.advanceTimersByTime(1100);
		expect(allowRequest(key)).toBe(true);
	});

	it("cleans up stale buckets", async () => {
		const { allowRequest, startCleanupInterval } = await loadRateLimiter();
		const interval = startCleanupInterval();
		const key = "user-3";

		// Deplete tokens and advance time past the cleanup window
		allowRequest(key);
		allowRequest(key);
		allowRequest(key);
		vi.advanceTimersByTime(61 * 60 * 1000);

		// Force cleanup tick
		vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

		// After cleanup the bucket should behave as a fresh one
		expect(allowRequest(key)).toBe(true);

		clearInterval(interval);
	});
});
