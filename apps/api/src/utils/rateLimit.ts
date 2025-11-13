/**
 * Rate limiting utilities
 */

import { TRPCError } from "@trpc/server";
import { logger } from "../modules/logger/core/logger.js";

// Rate limiting configuration constants
const RATE_LIMIT_TOKENS = Number.parseInt(process.env.RATE_LIMIT_TOKENS || "60", 10);
const RATE_LIMIT_INTERVAL_MS = Number.parseInt(process.env.RATE_LIMIT_INTERVAL_MS || "60000", 10);
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

// Periodic cleanup to prevent memory leaks
export function startCleanupInterval() {
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		// Clean up old rate limit buckets
		for (const [key, bucket] of buckets.entries()) {
			if (now - bucket.lastRefill > BUCKET_MAX_AGE_MS) {
				buckets.delete(key);
			}
		}
		logger.debug("Periodic cleanup completed", {
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

interface RateLimitContextUser {
	sub: string;
	localUserId: number;
}

interface RateLimitContext {
	user?: RateLimitContextUser | null;
}

interface RateLimitMiddlewareParams {
	ctx: RateLimitContext;
	next: () => unknown;
}

export function createRateLimitMiddleware() {
	return ({ ctx, next }: RateLimitMiddlewareParams) => {
		const key = (ctx.user && (ctx.user.sub || String(ctx.user.localUserId ?? ""))) || "anon";
		if (!allowRequest(key)) {
			throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
		}
		// biome-ignore lint/suspicious/noExplicitAny: tRPC middleware integration
		return next() as any;
	};
}
