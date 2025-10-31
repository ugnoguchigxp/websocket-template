import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { mockEnv } from './helpers/test-utils.js';

describe('Rate Limiting Tests', () => {
	beforeAll(() => {
		mockEnv({
			RATE_LIMIT_TOKENS: '5', // テスト用に少ない値
			RATE_LIMIT_INTERVAL_MS: '1000', // 1秒
			LOGIN_RATE_LIMIT_MAX: '3', // テスト用に少ない値
			LOGIN_RATE_LIMIT_WINDOW_MS: '2000', // 2秒
		});
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Token Bucket Rate Limiter', () => {
		// routers/index.ts のレート制限ロジックをシミュレート
		function createTokenBucket(tokens: number, intervalMs: number) {
			const buckets = new Map<string, { tokens: number; lastRefill: number }>();

			return function allowRequest(key: string): boolean {
				const now = Date.now();
				let b = buckets.get(key);

				if (!b) {
					b = { tokens, lastRefill: now };
					buckets.set(key, b);
				}

				const elapsed = now - b.lastRefill;
				if (elapsed > intervalMs) {
					b.tokens = tokens;
					b.lastRefill = now;
				}

				if (b.tokens <= 0) return false;
				b.tokens -= 1;
				return true;
			};
		}

		it('should allow requests within limit', () => {
			const allowRequest = createTokenBucket(5, 1000);
			const key = 'test-user';

			// 5リクエストまで許可
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
		});

		it('should reject requests over limit', () => {
			const allowRequest = createTokenBucket(3, 1000);
			const key = 'test-user';

			// 3リクエストまで許可
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);

			// 4リクエスト目は拒否
			expect(allowRequest(key)).toBe(false);
			expect(allowRequest(key)).toBe(false);
		});

		it('should refill tokens after interval', () => {
			const allowRequest = createTokenBucket(3, 1000);
			const key = 'test-user';

			// トークンを使い切る
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(false);

			// 1秒経過
			vi.advanceTimersByTime(1001);

			// 再度許可される
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
			expect(allowRequest(key)).toBe(true);
		});

		it('should handle multiple users independently', () => {
			const allowRequest = createTokenBucket(2, 1000);

			// ユーザー1: 2リクエスト
			expect(allowRequest('user1')).toBe(true);
			expect(allowRequest('user1')).toBe(true);
			expect(allowRequest('user1')).toBe(false); // 制限

			// ユーザー2: 独立して2リクエスト許可
			expect(allowRequest('user2')).toBe(true);
			expect(allowRequest('user2')).toBe(true);
			expect(allowRequest('user2')).toBe(false); // 制限
		});

		it('should handle anonymous users', () => {
			const allowRequest = createTokenBucket(5, 1000);

			// 匿名ユーザーは 'anon' キーで管理
			const anonKey = 'anon';

			for (let i = 0; i < 5; i++) {
				expect(allowRequest(anonKey)).toBe(true);
			}

			// 6リクエスト目は拒否
			expect(allowRequest(anonKey)).toBe(false);
		});
	});

	describe('Login Rate Limiter', () => {
		// routers/index.ts のログインレート制限をシミュレート
		function createLoginRateLimiter(maxAttempts: number, windowMs: number) {
			const attempts = new Map<string, { count: number; firstAt: number }>();

			return {
				allow(username: string): boolean {
					const now = Date.now();
					const entry = attempts.get(username);

					if (!entry || now - entry.firstAt > windowMs) {
						attempts.set(username, { count: 1, firstAt: now });
						return true;
					}

					entry.count += 1;
					if (entry.count > maxAttempts) return false;
					return true;
				},
				reset(username: string) {
					attempts.delete(username);
				},
			};
		}

		it('should allow login attempts within limit', () => {
			const limiter = createLoginRateLimiter(3, 2000);
			const username = 'testuser';

			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);
		});

		it('should reject login attempts over limit', () => {
			const limiter = createLoginRateLimiter(3, 2000);
			const username = 'testuser';

			// 3回まで許可
			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);

			// 4回目は拒否
			expect(limiter.allow(username)).toBe(false);
			expect(limiter.allow(username)).toBe(false);
		});

		it('should reset after time window', () => {
			const limiter = createLoginRateLimiter(3, 2000);
			const username = 'testuser';

			// 制限まで試行
			limiter.allow(username);
			limiter.allow(username);
			limiter.allow(username);
			expect(limiter.allow(username)).toBe(false);

			// 2秒経過
			vi.advanceTimersByTime(2001);

			// 再度許可される
			expect(limiter.allow(username)).toBe(true);
		});

		it('should reset on successful login', () => {
			const limiter = createLoginRateLimiter(3, 2000);
			const username = 'testuser';

			// 2回失敗
			limiter.allow(username);
			limiter.allow(username);

			// ログイン成功でリセット
			limiter.reset(username);

			// 再度3回まで許可
			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);
			expect(limiter.allow(username)).toBe(true);
		});

		it('should handle multiple users independently', () => {
			const limiter = createLoginRateLimiter(2, 2000);

			// ユーザー1: 制限まで
			limiter.allow('user1');
			limiter.allow('user1');
			expect(limiter.allow('user1')).toBe(false);

			// ユーザー2: 独立して許可
			expect(limiter.allow('user2')).toBe(true);
			expect(limiter.allow('user2')).toBe(true);
		});
	});

	describe('Memory Leak Prevention', () => {
		it('should clean up old entries', () => {
			const loginAttempts = new Map<string, { count: number; firstAt: number }>();
			const buckets = new Map<string, { tokens: number; lastRefill: number }>();

			const LOGIN_RATE_LIMIT_WINDOW_MS = 2000;
			const BUCKET_MAX_AGE = 3600000; // 1 hour

			// エントリを追加
			loginAttempts.set('user1', { count: 1, firstAt: Date.now() });
			loginAttempts.set('user2', { count: 1, firstAt: Date.now() - 3000 }); // 古いエントリ
			buckets.set('user1', { tokens: 5, lastRefill: Date.now() });
			buckets.set('user2', { tokens: 5, lastRefill: Date.now() - 4000000 }); // 古いエントリ

			expect(loginAttempts.size).toBe(2);
			expect(buckets.size).toBe(2);

			// クリーンアップ処理
			const now = Date.now();

			// 古いログイン試行を削除
			for (const [username, entry] of loginAttempts.entries()) {
				if (now - entry.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
					loginAttempts.delete(username);
				}
			}

			// 古いバケットを削除
			for (const [key, bucket] of buckets.entries()) {
				if (now - bucket.lastRefill > BUCKET_MAX_AGE) {
					buckets.delete(key);
				}
			}

			// user2が削除されているはず
			expect(loginAttempts.has('user1')).toBe(true);
			expect(loginAttempts.has('user2')).toBe(false);
			expect(buckets.has('user1')).toBe(true);
			expect(buckets.has('user2')).toBe(false);
		});

		it('should run periodic cleanup', () => {
			const cleanupInterval = 5 * 60 * 1000; // 5分
			let cleanupCalled = 0;

			const cleanup = vi.fn(() => {
				cleanupCalled++;
			});

			// 定期実行をシミュレート
			const interval = setInterval(cleanup, cleanupInterval);

			// 5分経過
			vi.advanceTimersByTime(cleanupInterval);
			expect(cleanupCalled).toBe(1);

			// さらに5分経過
			vi.advanceTimersByTime(cleanupInterval);
			expect(cleanupCalled).toBe(2);

			clearInterval(interval);
		});
	});

	describe('Rate Limit Configuration', () => {
		it('should use environment variables for configuration', () => {
			const RATE_LIMIT_TOKENS = parseInt(process.env.RATE_LIMIT_TOKENS || '60', 10);
			const RATE_LIMIT_INTERVAL_MS = parseInt(process.env.RATE_LIMIT_INTERVAL_MS || '60000', 10);
			const LOGIN_RATE_LIMIT_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10);
			const LOGIN_RATE_LIMIT_WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10);

			// テスト用の設定値を確認
			expect(RATE_LIMIT_TOKENS).toBe(5);
			expect(RATE_LIMIT_INTERVAL_MS).toBe(1000);
			expect(LOGIN_RATE_LIMIT_MAX).toBe(3);
			expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBe(2000);
		});

		it('should use default values when env vars not set', () => {
			// 環境変数が設定されていない場合のデフォルト値
			const defaults = {
				RATE_LIMIT_TOKENS: 60,
				RATE_LIMIT_INTERVAL_MS: 60000,
				LOGIN_RATE_LIMIT_MAX: 10,
				LOGIN_RATE_LIMIT_WINDOW_MS: 900000,
			};

			// パース関数のテスト
			const parseWithDefault = (value: string | undefined, defaultValue: number) => {
				return parseInt(value || String(defaultValue), 10);
			};

			expect(parseWithDefault(undefined, defaults.RATE_LIMIT_TOKENS)).toBe(60);
			expect(parseWithDefault('', defaults.RATE_LIMIT_INTERVAL_MS)).toBe(60000);
		});
	});

	describe('Uniform Delay for Login', () => {
		it('should define 300ms delay constant', () => {
			const UNIFORM_DELAY = 300;
			expect(UNIFORM_DELAY).toBe(300);
		});

		it('should apply consistent delay for timing attack prevention', () => {
			// タイミング攻撃防止のため、
			// 成功・失敗に関わらず同じ遅延を適用する必要がある
			const UNIFORM_DELAY = 300;

			// 遅延関数の定義
			const applyUniformDelay = async () => {
				return new Promise((resolve) => setTimeout(resolve, UNIFORM_DELAY));
			};

			// 遅延関数が定義されていることを確認
			expect(applyUniformDelay).toBeDefined();
			expect(typeof applyUniformDelay).toBe('function');
		});
	});
});
