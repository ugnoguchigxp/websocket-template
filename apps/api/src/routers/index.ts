import { logger } from "../modules/logger/core/logger.js";
import type { PrismaClient } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { container } from "tsyringe";
import { z } from "zod";
import { JwtService } from "../JwtService.js";
import argon2 from "argon2";
import type { OpenApiMeta } from "trpc-openapi";

// Log JWT environment variables on module load for verification
logger.debug("Routers module initialized", {
	JWT_ISSUER: process.env.JWT_ISSUER,
	JWT_AUDIENCE: process.env.JWT_AUDIENCE,
	hasIssuer: !!process.env.JWT_ISSUER,
	hasAudience: !!process.env.JWT_AUDIENCE,
});

export type Context = {
	userId: string | null;
	prisma: PrismaClient;
	jwtSecret: string;
};

// Type definitions for API responses
type UserResponse = {
	id: number;
	username: string;
};

type PostWithAuthor = {
	id: number;
	title: string;
	body: string;
	createdAt: Date;
	author: UserResponse;
};

type CommentWithAuthor = {
	id: number;
	body: string;
	createdAt: Date;
	author: UserResponse;
};

type PostResponse = {
	id: number;
	title: string;
	body: string;
	createdAt: Date;
};

const t = initTRPC.meta<OpenApiMeta>().context<Context>().create({ transformer: superjson });

// Rate limiting configuration constants
const RATE_LIMIT_TOKENS = Number.parseInt(process.env.RATE_LIMIT_TOKENS || "60", 10);
const RATE_LIMIT_INTERVAL_MS = Number.parseInt(process.env.RATE_LIMIT_INTERVAL_MS || "60000", 10);
const LOGIN_RATE_LIMIT_MAX = Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX || "10", 10);
const LOGIN_RATE_LIMIT_WINDOW_MS = Number.parseInt(
	process.env.LOGIN_RATE_LIMIT_WINDOW_MS || "900000",
	10
); // 15 min default
const LOGIN_DELAY_MS = 300; // Uniform delay for login attempts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BUCKET_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Simple token bucket rate limiter per identity (userId or "anon")
const buckets = new Map<string, { tokens: number; lastRefill: number }>();
function allowRequest(key: string) {
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

const rateLimit = t.middleware(({ ctx, next }) => {
	const key = ctx.userId ?? "anon";
	if (!allowRequest(key)) {
		throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
	}
	return next();
});

function redactInput(path: string, input: unknown) {
	if (!input) return undefined;
	try {
		if (
			path === "auth.login" &&
			typeof input === "object" &&
			input !== null &&
			"username" in input
		) {
			const { username } = input as { username: string; password: string };
			return { username, password: "***" };
		}
		return input;
	} catch {
		return undefined;
	}
}

function safeStringify(obj: unknown, max = 2000) {
	try {
		const s = JSON.stringify(obj);
		return s.length > max ? s.slice(0, max) + "…" : s;
	} catch {
		return undefined;
	}
}

const audit = t.middleware(async ({ ctx, path, type, next, rawInput }) => {
	const start = Date.now();
	const redacted = redactInput(path, rawInput);
	try {
		const res = await next();
		logger.info("RPC call succeeded", {
			userId: ctx.userId ?? "anon",
			path,
			type,
			input: redacted,
			duration: Date.now() - start,
		});
		return res;
	} catch (e: unknown) {
		// Log full error details for debugging
		const errorCode = e && typeof e === "object" && "code" in e ? String(e.code) : "ERROR";
		const message =
			e && typeof e === "object" && "message" in e ? String(e.message) : "Unknown error";
		logger.error("RPC call failed", {
			userId: ctx.userId ?? "anon",
			path,
			type,
			input: redacted,
			duration: Date.now() - start,
			errorCode,
			message,
		});

		// Don't leak internal error details to client
		if (e instanceof TRPCError) {
			throw e;
		}
		// Wrap unknown errors
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" });
	}
});

// Remove control chars except tab/newline; trim and collapse whitespace
// Also remove potential XSS vectors
function sanitizeText(input: string): string {
	return input
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
		.replace(/\s{2,}/g, " ")
		.replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
		.replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframes
		.replace(/on\w+\s*=/gi, "") // Remove event handlers
		.replace(/javascript:/gi, "") // Remove javascript: protocol
		.trim();
}

const base = t.procedure.use(rateLimit).use(audit);

const requireUser = t.middleware(({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next();
});

export const authed = base.use(requireUser);

// Simple in-memory rate limiter for login: configurable attempts per window
const loginAttempts = new Map<string, { count: number; firstAt: number }>();

function rateLimitLogin(username: string) {
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
function resetLoginAttempts(username: string) {
	loginAttempts.delete(username);
}

// Periodic cleanup to prevent memory leaks
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

export const appRouter = t.router({
	auth: t.router({
		login: base
			.meta({
				openapi: {
					method: "POST",
					path: "/auth/login",
					protect: false,
					summary: "Login and return JWT",
				},
			})
			.input(
				z.object({
					username: z
						.string()
						.min(1)
						.max(50)
						.regex(/^[a-zA-Z0-9_-]+$/, "Username must be alphanumeric")
						.describe("ユーザ名"),
					password: z.string().min(1).max(200).describe("パスワード"),
				})
			)
			.output(z.object({ token: z.string().describe("JWT") }))
			.mutation(async ({ input, ctx }) => {
				await new Promise((r) => setTimeout(r, LOGIN_DELAY_MS)); // Uniform delay
				if (!rateLimitLogin(input.username)) {
					throw new TRPCError({
						code: "TOO_MANY_REQUESTS",
						message: "Too many attempts. Please try again later.",
					});
				}
				const user = await ctx.prisma.user.findUnique({ where: { username: input.username } });
				if (!user) {
					throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials." });
				}
				const ok = await argon2.verify(user.passwordHash, input.password);
				if (!ok) {
					throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials." });
				}
				resetLoginAttempts(input.username);
				// Use JwtService from DI container to sign token
				const jwtService = container.resolve(JwtService);
				const token = jwtService.sign(String(user.id));
				logger.info("Login successful", { userId: user.id, username: user.username });
				return { token };
			}),
		me: authed
			.meta({
				openapi: {
					method: "GET",
					path: "/auth/me",
					protect: true,
					summary: "Current session user",
				},
			})
			.output(z.object({ id: z.number(), username: z.string() }))
			.query(async ({ ctx }) => {
				const id = Number(ctx.userId);
				const user = await ctx.prisma.user.findUnique({ where: { id } });
				if (!user) throw new TRPCError({ code: "NOT_FOUND" });
				return { id: user.id, username: user.username };
			}),
	}),
	users: t.router({
		get: authed
			.meta({ openapi: { method: "GET", path: "/users/{id}", protect: true } })
			.input(z.object({ id: z.number().int().positive() }))
			.output(z.object({ id: z.number(), username: z.string() }))
			.query(async ({ input, ctx }) => {
				const user = await ctx.prisma.user.findUnique({ where: { id: input.id } });
				if (!user) throw new TRPCError({ code: "NOT_FOUND" });
				return { id: user.id, username: user.username };
			}),
		list: authed
			.meta({ openapi: { method: "GET", path: "/users", protect: true } })
			.output(z.array(z.object({ id: z.number(), username: z.string() })))
			.query(async ({ ctx }) => {
				const users = await ctx.prisma.user.findMany({ orderBy: { id: "asc" } });
				return users.map((u) => ({ id: u.id, username: u.username }));
			}),
	}),
	posts: t.router({
		list: authed
			.meta({ openapi: { method: "GET", path: "/posts", protect: true } })
			.input(
				z
					.object({
						limit: z.number().int().min(1).max(100).optional(),
						cursor: z.number().int().optional(),
					})
					.optional()
			)
			.output(
				z.object({
					items: z.array(
						z.object({
							id: z.number(),
							title: z.string(),
							body: z.string(),
							createdAt: z.date(),
							author: z.object({ id: z.number(), username: z.string() }),
						})
					),
					nextCursor: z.number().optional(),
				})
			)
			.query(async ({ input, ctx }) => {
				const pageSize = input?.limit ?? 20;
				const posts = await ctx.prisma.post.findMany({
					orderBy: { id: "desc" },
					take: pageSize,
					cursor: input?.cursor ? { id: input.cursor } : undefined,
					skip: input?.cursor ? 1 : 0,
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});
				const nextCursor = posts.length === pageSize ? posts[posts.length - 1]?.id : undefined;
				return { items: posts, nextCursor };
			}),
		get: authed
			.meta({ openapi: { method: "GET", path: "/posts/{id}", protect: true } })
			.input(z.object({ id: z.number().int().positive() }))
			.output(
				z.object({
					id: z.number(),
					title: z.string(),
					body: z.string(),
					createdAt: z.date(),
					author: z.object({ id: z.number(), username: z.string() }),
				})
			)
			.query(async ({ input, ctx }): Promise<PostWithAuthor> => {
				const p = await ctx.prisma.post.findUnique({
					where: { id: input.id },
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});
				if (!p) throw new TRPCError({ code: "NOT_FOUND" });
				return p;
			}),
		create: authed
			.meta({ openapi: { method: "POST", path: "/posts", protect: true } })
			.input(
				z.object({
					title: z.string().min(1).max(200).describe("タイトル"),
					body: z.string().min(1).max(5000).describe("本文"),
				})
			)
			.output(
				z.object({ id: z.number(), title: z.string(), body: z.string(), createdAt: z.date() })
			)
			.mutation(async ({ input, ctx }): Promise<PostResponse> => {
				const post = await ctx.prisma.post.create({
					data: {
						title: sanitizeText(input.title),
						body: sanitizeText(input.body),
						authorId: Number(ctx.userId),
					},
					select: { id: true, title: true, body: true, createdAt: true },
				});
				return post;
			}),
		comments: t.router({
			list: authed
				.meta({ openapi: { method: "GET", path: "/posts/{postId}/comments", protect: true } })
				.input(z.object({ postId: z.number().int().positive() }))
				.output(
					z.array(
						z.object({
							id: z.number(),
							body: z.string(),
							createdAt: z.date(),
							author: z.object({ id: z.number(), username: z.string() }),
						})
					)
				)
				.query(async ({ input, ctx }): Promise<CommentWithAuthor[]> => {
					const comments = await ctx.prisma.comment.findMany({
						where: { postId: input.postId },
						orderBy: { id: "asc" },
						select: {
							id: true,
							body: true,
							createdAt: true,
							author: { select: { id: true, username: true } },
						},
					});
					return comments.map((c) => ({ ...c, body: sanitizeText(c.body) }));
				}),
			add: authed
				.meta({ openapi: { method: "POST", path: "/posts/{postId}/comments", protect: true } })
				.input(z.object({ postId: z.number().int().positive(), body: z.string().min(1).max(5000) }))
				.output(z.object({ id: z.number(), body: z.string(), createdAt: z.date() }))
				.mutation(
					async ({ input, ctx }): Promise<{ id: number; body: string; createdAt: Date }> => {
						const c = await ctx.prisma.comment.create({
							data: {
								postId: input.postId,
								body: sanitizeText(input.body),
								authorId: Number(ctx.userId),
							},
							select: { id: true, body: true, createdAt: true },
						});
						return c;
					}
				),
		}),
	}),
});

export type AppRouter = typeof appRouter;
