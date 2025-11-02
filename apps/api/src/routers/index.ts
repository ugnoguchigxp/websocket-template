import type { PrismaClient } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import argon2 from "argon2";
import superjson from "superjson";
import type { OpenApiMeta } from "trpc-openapi";
import { z } from "zod";
import type { AccessTokenClaims } from "../JwtService.js";
import { logger } from "../modules/logger/core/logger.js";
import { sanitizeText } from "../utils/sanitize.js";
import { createAuditMiddleware } from "../utils/audit.js";
import { createRateLimitMiddleware, startCleanupInterval } from "../utils/rateLimit.js";

// Log JWT environment variables on module load for verification
logger.debug("Routers module initialized", {
	OIDC_ISSUER: process.env.OIDC_ISSUER,
	OIDC_AUDIENCE: process.env.OIDC_AUDIENCE,
	hasIssuer: !!process.env.OIDC_ISSUER,
	hasAudience: !!process.env.OIDC_AUDIENCE,
});

export type ContextUser = {
	sub: string;
	localUserId: number;
	roles: string[];
	email?: string | null;
	preferredUsername?: string | null;
	name?: string | null;
	claims: AccessTokenClaims;
};

export type Context = {
	user: ContextUser | null;
	prisma: PrismaClient;
	accessToken: string | null;
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
	if (!ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next();
});

export const authed = base.use(requireUser);

// Start cleanup interval for rate limiting
startCleanupInterval();


const authMeOutput = z.object({
	id: z.number(),
	username: z.string(),
	role: z.string(),
	email: z.string().nullable(),
	displayName: z.string().nullable(),
	sub: z.string(),
	preferredUsername: z.string().nullable(),
	name: z.string().nullable(),
	roles: z.array(z.string()),
});

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
		me: authed
			.meta({
				openapi: {
					method: "GET",
					path: "/auth/me",
					protect: true,
					summary: "Current session user",
				},
			})
			.output(authMeOutput)
			.query(async ({ ctx }) => {
				if (!ctx.user) {
					throw new TRPCError({ code: "UNAUTHORIZED" });
				}
				const user = await ctx.prisma.user.findUnique({
					where: { id: ctx.user.localUserId },
				});
				if (!user) throw new TRPCError({ code: "NOT_FOUND" });
				return {
					id: user.id,
					username: user.username,
					role: user.role,
					email: user.email ?? null,
					displayName: user.displayName ?? null,
					sub: ctx.user.sub,
					preferredUsername: ctx.user.preferredUsername ?? null,
					name: ctx.user.name ?? null,
					roles: ctx.user.roles,
				};
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
						authorId: ctx.user!.localUserId,
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
								authorId: ctx.user!.localUserId,
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
