/**
 * Rate limiting utilities
 */

import { TRPCError } from "@trpc/server";
import { logger } from "../modules/logger/core/logger.js";

// Rate limiting configuration constants
const RATE_LIMIT_TOKENS = Number.parseInt(process.env.RATE_LIMIT_TOKENS || "60", 10);
const RATE_LIMIT_INTERVAL_MS = Number.parseInt(process.env.RATE_LIMIT_INTERVAL_MS || "60000", 10);
const LOGIN_RATE_LIMIT_MAX = Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX || "10", 10);
const LOGIN_RATE_LIMIT_WINDOW_MS = Number.parseInt(
	process.env.LOGIN_RATE_LIMIT_WINDOW_MS || "900000",
	10
); // 15 min default
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BUCKET_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Simple token bucket rate limiter per identity (userId or "anon")
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

export function allowRequest(key: string) {
	const now = Date.now();
	let b = buckets.get(key);
	if (!b) {
		b = { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
		buckets.set(key, b);
	}
	const elapsed = now - b.lastRefill;
	if (elapsed > RATE_LIMIT_INTERVAL_MS) {
		b.tokens = RATE_LIMIT_TOKENS;
		b.lastRefill = now;
	}
	if (b.tokens <= 0) return false;
	b.tokens -= 1;
	return true;
}

// Simple in-memory rate limiter for login: configurable attempts per window
const loginAttempts = new Map<string, { count: number; firstAt: number }>();

export function rateLimitLogin(username: string) {
	const now = Date.now();
	const entry = loginAttempts.get(username);
	if (!entry || now - entry.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
		loginAttempts.set(username, { count: 1, firstAt: now });
		return true;
	}
	entry.count += 1;
	if (entry.count > LOGIN_RATE_LIMIT_MAX) return false;
	return true;
}

export function resetLoginAttempts(username: string) {
	loginAttempts.delete(username);
}

// Periodic cleanup to prevent memory leaks
export function startCleanupInterval() {
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		// Clean up old login attempts
		for (const [username, entry] of loginAttempts.entries()) {
			if (now - entry.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
				loginAttempts.delete(username);
			}
		}
		// Clean up old rate limit buckets
		for (const [key, bucket] of buckets.entries()) {
			if (now - bucket.lastRefill > BUCKET_MAX_AGE_MS) {
				buckets.delete(key);
			}
		}
		logger.debug("Periodic cleanup completed", {
			loginAttemptsSize: loginAttempts.size,
			bucketsSize: buckets.size,
		});
	}, CLEANUP_INTERVAL_MS);

	// Clean up interval on process termination
	process.on("SIGTERM", () => {
		clearInterval(cleanupInterval);
		logger.debug("Cleanup interval cleared");
	});

	process.on("SIGINT", () => {
		clearInterval(cleanupInterval);
		logger.debug("Cleanup interval cleared");
	});

	return cleanupInterval;
}

export function createRateLimitMiddleware() {
	return ({ ctx, next }: any) => {
		const key = ctx.userId ?? "anon";
		if (!allowRequest(key)) {
			throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
		}
		return next();
	};
}

const LOGIN_DELAY_MS = 300; // Uniform delay for login attempts

export { LOGIN_DELAY_MS };
