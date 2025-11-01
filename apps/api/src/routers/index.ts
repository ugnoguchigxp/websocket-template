import type { PrismaClient } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import argon2 from "argon2";
import superjson from "superjson";
import type { OpenApiMeta } from "trpc-openapi";
import { container } from "tsyringe";
import { z } from "zod";
import { JwtService } from "../JwtService.js";
import { logger } from "../modules/logger/core/logger.js";
import { sanitizeText } from "../utils/sanitize.js";
import { createAuditMiddleware } from "../utils/audit.js";
import { 
	createRateLimitMiddleware, 
	rateLimitLogin, 
	resetLoginAttempts, 
	startCleanupInterval, 
	LOGIN_DELAY_MS 
} from "../utils/rateLimit.js";

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


const rateLimit = createRateLimitMiddleware();
const audit = createAuditMiddleware();

const base = t.procedure.use(rateLimit).use(audit);

const requireUser = t.middleware(({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next();
});

export const authed = base.use(requireUser);

// Start cleanup interval for rate limiting
startCleanupInterval();


export const appRouter = t.router({
	// Health check endpoint (no authentication required)
	health: base
		.meta({
			openapi: {
				method: "GET",
				path: "/health",
				protect: false,
				summary: "Health check endpoint",
			},
		})
		.output(z.object({ status: z.string(), timestamp: z.string() }))
		.query(async () => {
			return {
				status: "healthy",
				timestamp: new Date().toISOString(),
			};
		}),
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
			.output(z.object({ id: z.number(), username: z.string(), role: z.string() }))
			.query(async ({ ctx }) => {
				const id = Number(ctx.userId);
				const user = await ctx.prisma.user.findUnique({ where: { id } });
				if (!user) throw new TRPCError({ code: "NOT_FOUND" });
				return { id: user.id, username: user.username, role: user.role };
			}),
	}),
	users: t.router({
		get: authed
			.meta({ openapi: { method: "GET", path: "/users/{id}", protect: true } })
			.input(z.object({ id: z.number().int().positive() }))
			.output(z.object({ id: z.number(), username: z.string(), createdAt: z.date() }))
			.query(async ({ input, ctx }) => {
				const user = await ctx.prisma.user.findUnique({ where: { id: input.id } });
				if (!user) throw new TRPCError({ code: "NOT_FOUND" });
				return { id: user.id, username: user.username, createdAt: user.createdAt };
			}),
		list: authed
			.meta({ openapi: { method: "GET", path: "/users", protect: true } })
			.output(z.array(z.object({ id: z.number(), username: z.string(), role: z.string(), createdAt: z.date() })))
			.query(async ({ ctx }) => {
				const users = await ctx.prisma.user.findMany({ orderBy: { id: "asc" } });
				return users.map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }));
			}),
		create: authed
			.meta({ openapi: { method: "POST", path: "/users", protect: true } })
			.input(z.object({ 
				username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
				password: z.string().min(1).max(200),
				role: z.enum(["USER", "ADMIN"]).default("USER")
			}))
			.output(z.object({ id: z.number(), username: z.string(), role: z.string(), createdAt: z.date() }))
			.mutation(async ({ input, ctx }) => {
				// Check if username already exists
				const existingUser = await ctx.prisma.user.findUnique({ where: { username: input.username } });
				if (existingUser) {
					throw new TRPCError({ 
						code: "CONFLICT", 
						message: "Username already exists" 
					});
				}
				
				// Hash password
				const passwordHash = await argon2.hash(input.password);
				
				const user = await ctx.prisma.user.create({
					data: {
						username: input.username,
						passwordHash,
						role: input.role,
					},
				});
				
				return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
			}),
		update: authed
			.meta({ openapi: { method: "PUT", path: "/users/{id}", protect: true } })
			.input(z.object({ 
				id: z.number().int().positive(),
				username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
				password: z.string().min(1).max(200).optional(),
				role: z.enum(["USER", "ADMIN"]).optional()
			}))
			.output(z.object({ id: z.number(), username: z.string(), role: z.string(), createdAt: z.date() }))
			.mutation(async ({ input, ctx }) => {
				// Check if user exists
				const existingUser = await ctx.prisma.user.findUnique({ where: { id: input.id } });
				if (!existingUser) {
					throw new TRPCError({ code: "NOT_FOUND" });
				}
				
				// Check if username is taken by another user
				const usernameTaken = await ctx.prisma.user.findFirst({ 
					where: { 
						username: input.username,
						id: { not: input.id }
					} 
				});
				if (usernameTaken) {
					throw new TRPCError({ 
						code: "CONFLICT", 
						message: "Username already exists" 
					});
				}
				
				const updateData: any = { username: input.username };
				if (input.password) {
					updateData.passwordHash = await argon2.hash(input.password);
				}
				if (input.role !== undefined) {
					updateData.role = input.role;
				}
				
				const user = await ctx.prisma.user.update({
					where: { id: input.id },
					data: updateData,
				});
				
				return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
			}),
		delete: authed
			.meta({ openapi: { method: "DELETE", path: "/users/{id}", protect: true } })
			.input(z.object({ id: z.number().int().positive() }))
			.output(z.object({ success: z.boolean() }))
			.mutation(async ({ input, ctx }) => {
				// Check if user exists
				const existingUser = await ctx.prisma.user.findUnique({ where: { id: input.id } });
				if (!existingUser) {
					throw new TRPCError({ code: "NOT_FOUND" });
				}
				
				// Delete user (this will also delete related posts and comments due to cascade)
				await ctx.prisma.user.delete({
					where: { id: input.id },
				});
				
				return { success: true };
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
