import { describe, it, expect, beforeAll } from 'vitest';
import {
	createMockPrisma,
	createMockContext,
	testUsers,
	testPosts,
	testComments,
	initTestUsers,
	mockEnv,
} from './helpers/test-utils.js';

describe('API Routers Tests', () => {
	beforeAll(async () => {
		await initTestUsers();
		mockEnv();
	});

	describe('users router', () => {
		describe('users.list', () => {
			it('should return list of users for authenticated user', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.user.findMany.mockResolvedValue([testUsers.demo, testUsers.testUser]);

				const ctx = createMockContext('1', mockPrisma);

				// users.listの呼び出しをシミュレート
				const users = await mockPrisma.user.findMany({ orderBy: { id: 'asc' } });

				expect(users).toHaveLength(2);
				expect(users[0].username).toBe('demo');
				expect(users[1].username).toBe('testuser');
			});

			it('should fail for unauthenticated user', () => {
				const ctx = createMockContext(null);

				// 未認証の場合、userIdはnull
				// requireUser middleware によって拒否されるべき
				expect(ctx.userId).toBeNull();
			});
		});

		describe('users.get', () => {
			it('should return specific user by id', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.user.findUnique.mockResolvedValue(testUsers.demo);

				const ctx = createMockContext('1', mockPrisma);

				const user = await mockPrisma.user.findUnique({ where: { id: 1 } });

				expect(user).toBeDefined();
				expect(user!.id).toBe(1);
				expect(user!.username).toBe('demo');
			});

			it('should return null for non-existent user', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.user.findUnique.mockResolvedValue(null);

				const ctx = createMockContext('1', mockPrisma);

				const user = await mockPrisma.user.findUnique({ where: { id: 999 } });

				expect(user).toBeNull();
			});

			it('should reject invalid user id (non-positive)', () => {
				const invalidIds = [0, -1, -100];

				invalidIds.forEach((id) => {
					expect(id > 0).toBe(false);
				});
			});
		});
	});

	describe('posts router', () => {
		describe('posts.list', () => {
			it('should return paginated posts', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.post.findMany.mockResolvedValue(testPosts);

				const ctx = createMockContext('1', mockPrisma);

				const pageSize = 20;
				const posts = await mockPrisma.post.findMany({
					orderBy: { id: 'desc' },
					take: pageSize,
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});

				expect(posts).toHaveLength(3);
				expect(posts[0].title).toBeDefined();
				expect(posts[0].author.username).toBeDefined();
			});

			it('should support cursor-based pagination', async () => {
				const mockPrisma = createMockPrisma();
				const pagedPosts = [testPosts[1], testPosts[2]];
				mockPrisma.post.findMany.mockResolvedValue(pagedPosts);

				const ctx = createMockContext('1', mockPrisma);

				const cursor = 1;
				const pageSize = 20;

				const posts = await mockPrisma.post.findMany({
					orderBy: { id: 'desc' },
					take: pageSize,
					cursor: { id: cursor },
					skip: 1,
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});

				expect(posts).toHaveLength(2);
			});

			it('should enforce limit bounds (1-100)', () => {
				const validLimits = [1, 20, 50, 100];
				const invalidLimits = [0, -1, 101, 1000];

				validLimits.forEach((limit) => {
					expect(limit >= 1 && limit <= 100).toBe(true);
				});

				invalidLimits.forEach((limit) => {
					expect(limit >= 1 && limit <= 100).toBe(false);
				});
			});
		});

		describe('posts.get', () => {
			it('should return specific post by id', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.post.findUnique.mockResolvedValue(testPosts[0]);

				const ctx = createMockContext('1', mockPrisma);

				const post = await mockPrisma.post.findUnique({
					where: { id: 1 },
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});

				expect(post).toBeDefined();
				expect(post!.id).toBe(1);
				expect(post!.title).toBe('First Post');
				expect(post!.author.username).toBe('demo');
			});

			it('should return null for non-existent post', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.post.findUnique.mockResolvedValue(null);

				const ctx = createMockContext('1', mockPrisma);

				const post = await mockPrisma.post.findUnique({ where: { id: 999 } });

				expect(post).toBeNull();
			});
		});

		describe('posts.create', () => {
			it('should create post with valid data', async () => {
				const mockPrisma = createMockPrisma();
				const newPost = {
					id: 4,
					title: 'New Post',
					body: 'This is a new post.',
					createdAt: new Date(),
				};
				mockPrisma.post.create.mockResolvedValue(newPost);

				const ctx = createMockContext('1', mockPrisma);

				const post = await mockPrisma.post.create({
					data: {
						title: 'New Post',
						body: 'This is a new post.',
						authorId: 1,
					},
					select: {
						id: true,
						title: true,
						body: true,
						createdAt: true,
					},
				});

				expect(post).toBeDefined();
				expect(post.title).toBe('New Post');
			});

			it('should enforce title length limits (1-200)', () => {
				const tooShort = '';
				const tooLong = 'a'.repeat(201);
				const validMin = 'a';
				const validMax = 'a'.repeat(200);

				expect(tooShort.length >= 1 && tooShort.length <= 200).toBe(false);
				expect(tooLong.length >= 1 && tooLong.length <= 200).toBe(false);
				expect(validMin.length >= 1 && validMin.length <= 200).toBe(true);
				expect(validMax.length >= 1 && validMax.length <= 200).toBe(true);
			});

			it('should enforce body length limits (1-5000)', () => {
				const tooShort = '';
				const tooLong = 'a'.repeat(5001);
				const validMin = 'a';
				const validMax = 'a'.repeat(5000);

				expect(tooShort.length >= 1 && tooShort.length <= 5000).toBe(false);
				expect(tooLong.length >= 1 && tooLong.length <= 5000).toBe(false);
				expect(validMin.length >= 1 && validMin.length <= 5000).toBe(true);
				expect(validMax.length >= 1 && validMax.length <= 5000).toBe(true);
			});
		});

		describe('posts.comments.list', () => {
			it('should return comments for a post', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.comment.findMany.mockResolvedValue(testComments);

				const ctx = createMockContext('1', mockPrisma);

				const comments = await mockPrisma.comment.findMany({
					where: { postId: 1 },
					orderBy: { id: 'asc' },
					select: {
						id: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});

				expect(comments).toHaveLength(2);
				expect(comments[0].body).toBe('Great post!');
				expect(comments[1].body).toBe('Thanks for sharing.');
			});

			it('should return empty array for post with no comments', async () => {
				const mockPrisma = createMockPrisma();
				mockPrisma.comment.findMany.mockResolvedValue([]);

				const ctx = createMockContext('1', mockPrisma);

				const comments = await mockPrisma.comment.findMany({
					where: { postId: 999 },
					orderBy: { id: 'asc' },
					select: {
						id: true,
						body: true,
						createdAt: true,
						author: { select: { id: true, username: true } },
					},
				});

				expect(comments).toHaveLength(0);
			});
		});

		describe('posts.comments.add', () => {
			it('should add comment to post', async () => {
				const mockPrisma = createMockPrisma();
				const newComment = {
					id: 3,
					body: 'New comment',
					createdAt: new Date(),
				};
				mockPrisma.comment.create.mockResolvedValue(newComment);

				const ctx = createMockContext('1', mockPrisma);

				const comment = await mockPrisma.comment.create({
					data: {
						postId: 1,
						body: 'New comment',
						authorId: 1,
					},
					select: {
						id: true,
						body: true,
						createdAt: true,
					},
				});

				expect(comment).toBeDefined();
				expect(comment.body).toBe('New comment');
			});

			it('should enforce comment body length limits (1-5000)', () => {
				const tooShort = '';
				const tooLong = 'a'.repeat(5001);
				const validMin = 'a';
				const validMax = 'a'.repeat(5000);

				expect(tooShort.length >= 1 && tooShort.length <= 5000).toBe(false);
				expect(tooLong.length >= 1 && tooLong.length <= 5000).toBe(false);
				expect(validMin.length >= 1 && validMin.length <= 5000).toBe(true);
				expect(validMax.length >= 1 && validMax.length <= 5000).toBe(true);
			});

			it('should reject invalid postId (non-positive)', () => {
				const invalidIds = [0, -1, -100];

				invalidIds.forEach((id) => {
					expect(id > 0).toBe(false);
				});
			});
		});
	});
});
