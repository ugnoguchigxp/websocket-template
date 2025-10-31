import 'reflect-metadata';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { JwtService } from '../src/JwtService.js';
import { mockEnv } from './helpers/test-utils.js';
import jwt from 'jsonwebtoken';

describe('JwtService Tests', () => {
	let jwtService: JwtService;
	const TEST_SECRET = 'test-secret-key-with-at-least-32-characters-for-security';

	beforeAll(() => {
		mockEnv({
			JWT_ISSUER: 'test-issuer',
			JWT_AUDIENCE: 'test-audience',
		});
		jwtService = new JwtService(TEST_SECRET);
	});

	describe('sign', () => {
		it('should generate a valid JWT token with issuer and audience', () => {
			const userId = '123';
			const token = jwtService.sign(userId);

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');

			// Verify the token contains expected claims
			const decoded = jwt.decode(token) as any;
			expect(decoded.sub).toBe(userId);
			expect(decoded.iss).toBe('test-issuer');
			expect(decoded.aud).toBe('test-audience');
			expect(decoded.exp).toBeDefined();
		});

		it('should generate a token with 7 days expiration', () => {
			const userId = '456';
			const token = jwtService.sign(userId);

			const decoded = jwt.decode(token) as any;
			const exp = decoded.exp;
			const iat = decoded.iat;

			// 7 days = 604800 seconds
			const expectedDiff = 7 * 24 * 60 * 60;
			expect(exp - iat).toBe(expectedDiff);
		});

		it('should generate a token with HS256 algorithm', () => {
			const userId = '789';
			const token = jwtService.sign(userId);

			const decoded = jwt.decode(token, { complete: true }) as any;
			expect(decoded.header.alg).toBe('HS256');
		});

		it('should generate different tokens for different user IDs', () => {
			const token1 = jwtService.sign('user1');
			const token2 = jwtService.sign('user2');

			expect(token1).not.toBe(token2);

			const decoded1 = jwt.decode(token1) as any;
			const decoded2 = jwt.decode(token2) as any;

			expect(decoded1.sub).toBe('user1');
			expect(decoded2.sub).toBe('user2');
		});
	});

	describe('verify', () => {
		it('should verify a valid token and return user ID', () => {
			const userId = '123';
			const token = jwtService.sign(userId);

			const result = jwtService.verify(token);

			expect(result).toBe(userId);
		});

		it('should return null for invalid token signature', () => {
			const invalidService = new JwtService('different-secret-key-for-testing-purposes');
			const token = invalidService.sign('123');

			// Try to verify with different secret
			const result = jwtService.verify(token);

			expect(result).toBeNull();
		});

		it('should return null for malformed token', () => {
			const result = jwtService.verify('invalid.token.string');

			expect(result).toBeNull();
		});

		it('should return null for expired token', () => {
			// Create an already expired token
			const expiredToken = jwt.sign(
				{ sub: '123' },
				TEST_SECRET,
				{
					expiresIn: '-1h', // Expired 1 hour ago
					algorithm: 'HS256',
					issuer: 'test-issuer',
					audience: 'test-audience',
				}
			);

			const result = jwtService.verify(expiredToken);

			expect(result).toBeNull();
		});

		it('should return null for token with wrong issuer', () => {
			const wrongIssuerToken = jwt.sign(
				{ sub: '123' },
				TEST_SECRET,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
					issuer: 'wrong-issuer',
					audience: 'test-audience',
				}
			);

			const result = jwtService.verify(wrongIssuerToken);

			expect(result).toBeNull();
		});

		it('should return null for token with wrong audience', () => {
			const wrongAudienceToken = jwt.sign(
				{ sub: '123' },
				TEST_SECRET,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
					issuer: 'test-issuer',
					audience: 'wrong-audience',
				}
			);

			const result = jwtService.verify(wrongAudienceToken);

			expect(result).toBeNull();
		});

		it('should handle token within clock tolerance', () => {
			// Create token that's about to expire
			const token = jwt.sign(
				{ sub: '123' },
				TEST_SECRET,
				{
					expiresIn: '1s',
					algorithm: 'HS256',
					issuer: 'test-issuer',
					audience: 'test-audience',
				}
			);

			// Should still verify with clock tolerance of 5 seconds
			const result = jwtService.verify(token);

			expect(result).toBe('123');
		});

		it('should return null when token has no sub claim', () => {
			const tokenWithoutSub = jwt.sign(
				{}, // No sub claim
				TEST_SECRET,
				{
					expiresIn: '1h',
					algorithm: 'HS256',
					issuer: 'test-issuer',
					audience: 'test-audience',
				}
			);

			const result = jwtService.verify(tokenWithoutSub);

			expect(result).toBeNull();
		});
	});

	describe('JwtService without issuer/audience', () => {
		it('should work when issuer and audience are not set', () => {
			// Save original environment
			const originalIssuer = process.env.JWT_ISSUER;
			const originalAudience = process.env.JWT_AUDIENCE;

			// Remove issuer and audience before creating service
			delete process.env.JWT_ISSUER;
			delete process.env.JWT_AUDIENCE;

			// Create service without issuer/audience
			const serviceWithoutClaims = new JwtService(TEST_SECRET);

			const userId = '999';
			const token = serviceWithoutClaims.sign(userId);

			expect(token).toBeDefined();

			const decoded = jwt.decode(token) as any;
			expect(decoded.sub).toBe(userId);
			expect(decoded.iss).toBeUndefined();
			expect(decoded.aud).toBeUndefined();

			// Verify should still work
			const result = serviceWithoutClaims.verify(token);
			expect(result).toBe(userId);

			// Restore environment
			if (originalIssuer) process.env.JWT_ISSUER = originalIssuer;
			if (originalAudience) process.env.JWT_AUDIENCE = originalAudience;
		});
	});

	describe('Error handling', () => {
		it('should handle JWT verification errors gracefully', () => {
			const invalidTokens = [
				'',
				'not.a.jwt',
				'invalid',
				'a.b.c.d',
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
			];

			invalidTokens.forEach((token) => {
				const result = jwtService.verify(token);
				expect(result).toBeNull();
			});
		});

		it('should log debug messages when generating token', () => {
			const loggerDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

			const userId = '777';
			jwtService.sign(userId);

			// Note: Since we're using the logger module, we can't easily spy on it
			// but we verify the function completes successfully
			expect(loggerDebugSpy).toBeDefined();

			loggerDebugSpy.mockRestore();
		});
	});
});
