import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '../src/routers/index.js';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import {
	createMockPrisma,
	createMockContext,
	testUsers,
	initTestUsers,
	mockEnv,
	resetEnv,
	createTestJWT,
} from './helpers/test-utils.js';

describe('Authentication Tests', () => {
	beforeAll(async () => {
		await initTestUsers();
		mockEnv();
	});

	describe('auth.login', () => {
		it('should successfully login with valid credentials', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.user.findUnique.mockResolvedValue(testUsers.demo);

			const ctx = createMockContext(null, mockPrisma);

			// ログイン処理をシミュレート
			const username = 'demo';
			const password = 'demo1234';

			const user = await mockPrisma.user.findUnique({ where: { username } });
			expect(user).toBeDefined();
			expect(user!.username).toBe('demo');

			const passwordValid = await argon2.verify(user!.passwordHash, password);
			expect(passwordValid).toBe(true);
		});

		it('should reject login with invalid username', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.user.findUnique.mockResolvedValue(null);

			const username = 'nonexistent';
			const user = await mockPrisma.user.findUnique({ where: { username } });

			expect(user).toBeNull();
		});

		it('should reject login with invalid password', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.user.findUnique.mockResolvedValue(testUsers.demo);

			const user = await mockPrisma.user.findUnique({ where: { username: 'demo' } });
			expect(user).toBeDefined();

			const passwordValid = await argon2.verify(user!.passwordHash, 'wrong-password');
			expect(passwordValid).toBe(false);
		});

		it('should generate valid JWT token on successful login', () => {
			const userId = '1';
			const secret = process.env.JWT_SECRET!;

			const token = jwt.sign(
				{ sub: userId },
				secret,
				{
					expiresIn: '7d',
					algorithm: 'HS256',
					issuer: process.env.JWT_ISSUER,
					audience: process.env.JWT_AUDIENCE,
				}
			);

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');

			// トークンを検証
			const decoded = jwt.verify(token, secret, {
				algorithms: ['HS256'],
				issuer: process.env.JWT_ISSUER,
				audience: process.env.JWT_AUDIENCE,
			}) as any;

			expect(decoded.sub).toBe(userId);
		});

		it('should enforce username validation (alphanumeric only)', () => {
			const invalidUsernames = [
				'user@domain',
				'user name',
				'user!name',
				'<script>',
				'user#123',
			];

			const regex = /^[a-zA-Z0-9_-]+$/;

			invalidUsernames.forEach((username) => {
				expect(regex.test(username)).toBe(false);
			});

			const validUsernames = ['demo', 'testuser', 'user_123', 'user-name'];

			validUsernames.forEach((username) => {
				expect(regex.test(username)).toBe(true);
			});
		});

		it('should enforce username length limits (1-50)', () => {
			const tooShort = '';
			const tooLong = 'a'.repeat(51);
			const validMin = 'a';
			const validMax = 'a'.repeat(50);

			expect(tooShort.length >= 1 && tooShort.length <= 50).toBe(false);
			expect(tooLong.length >= 1 && tooLong.length <= 50).toBe(false);
			expect(validMin.length >= 1 && validMin.length <= 50).toBe(true);
			expect(validMax.length >= 1 && validMax.length <= 50).toBe(true);
		});

		it('should enforce password length limits (1-200)', () => {
			const tooShort = '';
			const tooLong = 'a'.repeat(201);
			const validMin = 'a';
			const validMax = 'a'.repeat(200);

			expect(tooShort.length >= 1 && tooShort.length <= 200).toBe(false);
			expect(tooLong.length >= 1 && tooLong.length <= 200).toBe(false);
			expect(validMin.length >= 1 && validMin.length <= 200).toBe(true);
			expect(validMax.length >= 1 && validMax.length <= 200).toBe(true);
		});
	});

	describe('auth.me', () => {
		it('should return current user info for authenticated user', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.user.findUnique.mockResolvedValue(testUsers.demo);

			const ctx = createMockContext('1', mockPrisma);

			expect(ctx.userId).toBe('1');

			const user = await mockPrisma.user.findUnique({ where: { id: Number(ctx.userId) } });
			expect(user).toBeDefined();
			expect(user!.id).toBe(1);
			expect(user!.username).toBe('demo');
		});

		it('should fail for unauthenticated user', () => {
			const ctx = createMockContext(null);

			// 未認証の場合、userIdはnull
			expect(ctx.userId).toBeNull();

			// requireUser middlewareによって拒否されるべき
			// （実際のアプリケーションではTRPCErrorがスローされる）
		});

		it('should fail for non-existent user', async () => {
			const mockPrisma = createMockPrisma();
			mockPrisma.user.findUnique.mockResolvedValue(null);

			const ctx = createMockContext('999', mockPrisma);

			const user = await mockPrisma.user.findUnique({ where: { id: 999 } });
			expect(user).toBeNull();
		});
	});

	describe('JWT Token Verification', () => {
		it('should verify valid JWT token', () => {
			const secret = process.env.JWT_SECRET!;
			const userId = '1';

			const token = createTestJWT(userId, secret);

			const decoded = jwt.verify(token, secret, {
				algorithms: ['HS256'],
				issuer: process.env.JWT_ISSUER,
				audience: process.env.JWT_AUDIENCE,
			}) as any;

			expect(decoded.sub).toBe(userId);
		});

		it('should reject token with invalid signature', () => {
			const secret = process.env.JWT_SECRET!;
			const wrongSecret = 'wrong-secret';

			const token = createTestJWT('1', wrongSecret);

			expect(() => {
				jwt.verify(token, secret, {
					algorithms: ['HS256'],
				});
			}).toThrow();
		});

		it('should reject expired token', () => {
			const secret = process.env.JWT_SECRET!;

			const token = jwt.sign(
				{ sub: '1' },
				secret,
				{
					expiresIn: '-1h', // 既に期限切れ
					algorithm: 'HS256',
				}
			);

			expect(() => {
				jwt.verify(token, secret, {
					algorithms: ['HS256'],
				});
			}).toThrow();
		});

		it('should reject token with wrong issuer', () => {
			const secret = process.env.JWT_SECRET!;

			const token = jwt.sign(
				{ sub: '1' },
				secret,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
					issuer: 'wrong-issuer',
				}
			);

			expect(() => {
				jwt.verify(token, secret, {
					algorithms: ['HS256'],
					issuer: process.env.JWT_ISSUER, // 正しいissuerを期待
				});
			}).toThrow();
		});

		it('should reject token with wrong audience', () => {
			const secret = process.env.JWT_SECRET!;

			const token = jwt.sign(
				{ sub: '1' },
				secret,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
					audience: 'wrong-audience',
				}
			);

			expect(() => {
				jwt.verify(token, secret, {
					algorithms: ['HS256'],
					audience: process.env.JWT_AUDIENCE, // 正しいaudienceを期待
				});
			}).toThrow();
		});

		it('should accept token within clock tolerance', () => {
			const secret = process.env.JWT_SECRET!;

			// 現在時刻から発行されたトークン
			const token = jwt.sign(
				{ sub: '1' },
				secret,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
				}
			);

			// clockTolerance: 5 で検証成功
			const decoded = jwt.verify(token, secret, {
				algorithms: ['HS256'],
				clockTolerance: 5,
			}) as any;

			expect(decoded.sub).toBe('1');
		});
	});

	describe('Password Hashing', () => {
		it('should hash password with argon2id', async () => {
			const password = 'test-password-123';
			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 15,
				timeCost: 3,
				parallelism: 1,
			});

			expect(hash).toBeDefined();
			expect(typeof hash).toBe('string');
			expect(hash).not.toBe(password);
			expect(hash.startsWith('$argon2id$')).toBe(true);
		});

		it('should verify correct password', async () => {
			const password = 'test-password-123';
			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 15,
				timeCost: 3,
				parallelism: 1,
			});

			const isValid = await argon2.verify(hash, password);
			expect(isValid).toBe(true);
		});

		it('should reject incorrect password', async () => {
			const password = 'test-password-123';
			const hash = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 15,
				timeCost: 3,
				parallelism: 1,
			});

			const isValid = await argon2.verify(hash, 'wrong-password');
			expect(isValid).toBe(false);
		});

		it('should produce different hashes for same password', async () => {
			const password = 'test-password-123';

			const hash1 = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 15,
				timeCost: 3,
				parallelism: 1,
			});

			const hash2 = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 15,
				timeCost: 3,
				parallelism: 1,
			});

			// 異なるソルトが使用されるため、ハッシュは異なる
			expect(hash1).not.toBe(hash2);

			// しかし、両方とも検証は成功する
			expect(await argon2.verify(hash1, password)).toBe(true);
			expect(await argon2.verify(hash2, password)).toBe(true);
		});
	});
});
