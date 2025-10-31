import 'reflect-metadata';
import { describe, it, expect, beforeAll, beforeEach, vi, afterAll } from 'vitest';
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '../src/routers/index.js';
import { appRouter } from '../src/routers/index.js';
import { createMockPrisma, testUsers, testPosts, testComments, mockEnv } from './helpers/test-utils.js';
import { container } from 'tsyringe';
import { JwtService } from '../src/JwtService.js';

describe('Router Integration Tests (with actual router execution)', () => {
	beforeAll(async () => {
		mockEnv();

		// Register JwtService in container
		container.reset();
		container.register('JWT_SECRET', { useValue: process.env.JWT_SECRET! });

		const JwtServiceClass = (await import('../src/JwtService.js')).JwtService;
		container.registerSingleton(JwtServiceClass);
	});

	describe('posts.comments.list', () => {
		it('should execute router handler and return sanitized comments', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.comment.findMany.mockResolvedValue([
				{
					id: 1,
					body: 'Comment with <script>alert("xss")</script> content',
					createdAt: new Date(),
					author: { id: 1, username: 'demo' },
				},
				{
					id: 2,
					body: 'Normal comment',
					createdAt: new Date(),
					author: { id: 2, username: 'testuser' },
				},
			]);

			const ctx: Context = {
				userId: '1',
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			// Create a caller to actually execute the router
			const caller = appRouter.createCaller(ctx);

			// Call the actual router handler
			const result = await caller.posts.comments.list({ postId: 1 });

			// Verify the handler was executed
			expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
				where: { postId: 1 },
				orderBy: { id: 'asc' },
				select: {
					id: true,
					body: true,
					createdAt: true,
					author: { select: { id: true, username: true } },
				},
			});

			// Verify results are sanitized (script tags removed)
			expect(result).toHaveLength(2);
			expect(result[0].body).not.toContain('<script>');
			expect(result[0].body).not.toContain('alert');
			expect(result[1].body).toBe('Normal comment');
		});

		it('should handle empty comment list', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.comment.findMany.mockResolvedValue([]);

			const ctx: Context = {
				userId: '1',
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);
			const result = await caller.posts.comments.list({ postId: 999 });

			expect(result).toHaveLength(0);
		});

		it('should sanitize various XSS patterns in comments', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.comment.findMany.mockResolvedValue([
				{
					id: 1,
					body: '<iframe src="evil.com"></iframe>Test',
					createdAt: new Date(),
					author: { id: 1, username: 'demo' },
				},
				{
					id: 2,
					body: '<div onclick="alert(1)">Click me</div>',
					createdAt: new Date(),
					author: { id: 1, username: 'demo' },
				},
				{
					id: 3,
					body: '<a href="javascript:alert(1)">Link</a>',
					createdAt: new Date(),
					author: { id: 1, username: 'demo' },
				},
			]);

			const ctx: Context = {
				userId: '1',
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);
			const result = await caller.posts.comments.list({ postId: 1 });

			// Verify all XSS patterns are removed
			expect(result[0].body).not.toContain('<iframe');
			expect(result[0].body).not.toContain('</iframe>');
			expect(result[1].body).not.toContain('onclick');
			expect(result[2].body).not.toContain('javascript:');
		});
	});

	describe('posts.comments.add', () => {
		it('should execute router handler and create sanitized comment', async () => {
			const mockPrisma = createMockPrisma();
			const createdComment = {
				id: 3,
				body: 'New clean comment',
				createdAt: new Date(),
			};
			mockPrisma.comment.create.mockResolvedValue(createdComment);

			const ctx: Context = {
				userId: '1',
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);

			const result = await caller.posts.comments.add({
				postId: 1,
				body: 'New comment with <script>alert("xss")</script> content',
			});

			// Verify the create was called with sanitized body
			expect(mockPrisma.comment.create).toHaveBeenCalledWith({
				data: {
					postId: 1,
					body: expect.not.stringContaining('<script>'),
					authorId: 1,
				},
				select: {
					id: true,
					body: true,
					createdAt: true,
				},
			});

			expect(result).toEqual(createdComment);
		});

		it('should sanitize comment body before creating', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.comment.create.mockResolvedValue({
				id: 4,
				body: 'Test comment',
				createdAt: new Date(),
			});

			const ctx: Context = {
				userId: '1',
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);

			await caller.posts.comments.add({
				postId: 1,
				body: '<iframe src="evil.com"></iframe>Test comment',
			});

			// Verify sanitization was applied
			const createCall = mockPrisma.comment.create.mock.calls[0][0];
			expect(createCall.data.body).not.toContain('<iframe');
			expect(createCall.data.body).not.toContain('</iframe>');
		});

		it('should use authenticated user ID as author', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.comment.create.mockResolvedValue({
				id: 5,
				body: 'Comment',
				createdAt: new Date(),
			});

			const ctx: Context = {
				userId: '42', // Different user
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);

			await caller.posts.comments.add({
				postId: 1,
				body: 'Test comment',
			});

			// Verify authorId is set to the authenticated user
			const createCall = mockPrisma.comment.create.mock.calls[0][0];
			expect(createCall.data.authorId).toBe(42);
		});

		it('should reject if unauthenticated', async () => {
			const mockPrisma = createMockPrisma();

			const ctx: Context = {
				userId: null, // Not authenticated
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.posts.comments.add({
					postId: 1,
					body: 'Test comment',
				})
			).rejects.toThrow();
		});
	});

	describe('posts.list', () => {
		it('should execute router handler with pagination', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.post.findMany.mockResolvedValue([
				{
					id: 1,
					title: 'Post 1',
					body: 'Body 1',
					createdAt: new Date(),
					author: { id: 1, username: 'demo' },
				},
			]);

			const ctx: Context = {
				userId: '1', // Authenticated user required
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);
			const result = await caller.posts.list({ limit: 20 });

			expect(mockPrisma.post.findMany).toHaveBeenCalled();
			expect(result.items).toHaveLength(1);
		});
	});

	describe('posts.get', () => {
		it('should execute router handler and return single post', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.post.findUnique.mockResolvedValue({
				id: 1,
				title: 'Test Post',
				body: 'Test Body',
				createdAt: new Date(),
				author: { id: 1, username: 'demo' },
			});

			const ctx: Context = {
				userId: '1', // Authenticated user required
				prisma: mockPrisma as any,
				jwtSecret: process.env.JWT_SECRET!,
			};

			const caller = appRouter.createCaller(ctx);
			const result = await caller.posts.get({ id: 1 });

			expect(result).toBeDefined();
			expect(result.title).toBe('Test Post');
		});
	});
});
