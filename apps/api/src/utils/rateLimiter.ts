/**
 * Rate Limiting Utility
 * Provides configurable rate limiting for various operations
 */

export interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	keyGenerator?: (identifier: string) => string;
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: Date;
	totalHits: number;
}

interface RateLimitEntry {
	count: number;
	resetTime: Date;
	lastAccess: Date;
}

export class RateLimiter {
	private storage = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;
	readonly config: RateLimitConfig;

	constructor(config: RateLimitConfig) {
		this.config = config;
		// Clean up expired entries every minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60 * 1000);
	}

	/**
	 * Check if a request is allowed
	 */
	checkLimit(identifier: string): RateLimitResult {
		const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
		const now = new Date();

		let entry = this.storage.get(key);

		// Create new entry if doesn't exist or is expired
		if (!entry || now > entry.resetTime) {
			entry = {
				count: 0,
				resetTime: new Date(now.getTime() + this.config.windowMs),
				lastAccess: now,
			};
			this.storage.set(key, entry);
		}

		// Increment counter
		entry.count++;
		entry.lastAccess = now;

		const remaining = Math.max(0, this.config.maxRequests - entry.count);
		const allowed = entry.count <= this.config.maxRequests;

		return {
			allowed,
			remaining,
			resetTime: entry.resetTime,
			totalHits: entry.count,
		};
	}

	/**
	 * Reset rate limit for a specific identifier
	 */
	reset(identifier: string): void {
		const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
		this.storage.delete(key);
	}

	/**
	 * Get current rate limit status without incrementing
	 */
	getStatus(identifier: string): RateLimitResult | null {
		const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier;
		const entry = this.storage.get(key);

		if (!entry) {
			return null;
		}

		const now = new Date();
		if (now > entry.resetTime) {
			this.storage.delete(key);
			return null;
		}

		const remaining = Math.max(0, this.config.maxRequests - entry.count);

		return {
			allowed: entry.count <= this.config.maxRequests,
			remaining,
			resetTime: entry.resetTime,
			totalHits: entry.count,
		};
	}

	/**
	 * Clean up expired entries
	 */
	cleanup(): void {
		const now = new Date();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.storage.entries()) {
			if (now > entry.resetTime) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.storage.delete(key);
		}
	}

	/**
	 * Get statistics
	 */
	getStats(): {
		totalEntries: number;
		activeEntries: number;
		memoryUsage: number;
	} {
		const now = new Date();
		let activeEntries = 0;

		for (const entry of this.storage.values()) {
			if (now <= entry.resetTime) {
				activeEntries++;
			}
		}

		return {
			totalEntries: this.storage.size,
			activeEntries,
			memoryUsage: this.storage.size * 200, // Approximate bytes per entry
		};
	}

	/**
	 * Shutdown rate limiter
	 */
	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.storage.clear();
	}
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const RateLimitPresets = {
	// AI Generation: 10 requests per minute
	aiGeneration: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10,
	}),

	// Queue Operations: 100 requests per minute
	queueOperations: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100,
	}),

	// Chat Messages: 30 messages per minute
	chatMessages: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30,
	}),

	// WebSocket Connections: 5 connections per minute
	websocketConnections: new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5,
		keyGenerator: (identifier: string) => `ws:${identifier}`,
	}),
};

interface RateLimitContext {
	res: {
		setHeader(name: string, value: string | number): void;
		statusCode?: number;
	};
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
	limiter: RateLimiter,
	identifierExtractor: (ctx: RateLimitContext) => string
) {
	return async (ctx: RateLimitContext, next: () => Promise<void>) => {
		const identifier = identifierExtractor(ctx);
		const result = limiter.checkLimit(identifier);

		// Add rate limit headers
		ctx.res.setHeader("X-RateLimit-Limit", limiter.config.maxRequests);
		ctx.res.setHeader("X-RateLimit-Remaining", result.remaining);
		ctx.res.setHeader("X-RateLimit-Reset", result.resetTime.getTime());

		if (!result.allowed) {
			ctx.res.statusCode = 429;
			ctx.res.setHeader("Retry-After", Math.ceil((result.resetTime.getTime() - Date.now()) / 1000));
			throw new Error(`Rate limit exceeded. Try again after ${result.resetTime.toISOString()}`);
		}

		await next();
	};
}
