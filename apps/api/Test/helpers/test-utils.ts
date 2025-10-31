import { vi } from 'vitest';
import argon2 from 'argon2';
/**
 * モックPrismaクライアントを作成
 */
export function createMockPrisma() {
    return {
        user: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        post: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        comment: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
    };
}
/**
 * テスト用のユーザーデータ
 */
export const testUsers = {
    demo: {
        id: 1,
        username: 'demo',
        passwordHash: '', // 実際のハッシュは後で設定
    },
    testUser: {
        id: 2,
        username: 'testuser',
        passwordHash: '',
    },
};
/**
 * テスト用パスワードハッシュを生成
 */
export async function generateTestPasswordHash(password) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 10, // テスト用に軽量化
        timeCost: 2, // 最小値は2
        parallelism: 1,
    });
}
/**
 * テスト用ユーザーデータを初期化
 */
export async function initTestUsers() {
    testUsers.demo.passwordHash = await generateTestPasswordHash('demo1234');
    testUsers.testUser.passwordHash = await generateTestPasswordHash('password123');
}
/**
 * テスト用の投稿データ
 */
export const testPosts = [
    {
        id: 1,
        title: 'First Post',
        body: 'This is the first test post.',
        authorId: 1,
        createdAt: new Date('2025-01-01'),
        author: { id: 1, username: 'demo' },
    },
    {
        id: 2,
        title: 'Second Post',
        body: 'This is the second test post.',
        authorId: 1,
        createdAt: new Date('2025-01-02'),
        author: { id: 1, username: 'demo' },
    },
    {
        id: 3,
        title: 'Third Post',
        body: 'This is the third test post.',
        authorId: 2,
        createdAt: new Date('2025-01-03'),
        author: { id: 2, username: 'testuser' },
    },
];
/**
 * テスト用のコメントデータ
 */
export const testComments = [
    {
        id: 1,
        body: 'Great post!',
        postId: 1,
        authorId: 2,
        createdAt: new Date('2025-01-01T12:00:00'),
        author: { id: 2, username: 'testuser' },
    },
    {
        id: 2,
        body: 'Thanks for sharing.',
        postId: 1,
        authorId: 1,
        createdAt: new Date('2025-01-01T13:00:00'),
        author: { id: 1, username: 'demo' },
    },
];
/**
 * モックContextを作成
 */
export function createMockContext(userId = null, prisma = createMockPrisma(), jwtSecret = 'test-secret-key-for-testing-purposes-only') {
    return {
        userId,
        prisma: prisma,
        jwtSecret,
    };
}
/**
 * 環境変数をモック
 */
export function mockEnv(overrides = {}) {
    const defaults = {
        JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        NODE_ENV: 'test',
        RATE_LIMIT_TOKENS: '60',
        RATE_LIMIT_INTERVAL_MS: '60000',
        LOGIN_RATE_LIMIT_MAX: '10',
        LOGIN_RATE_LIMIT_WINDOW_MS: '900000',
    };
    const env = { ...defaults, ...overrides };
    Object.entries(env).forEach(([key, value]) => {
        process.env[key] = value;
    });
    return env;
}
/**
 * 環境変数をリセット
 */
export function resetEnv() {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
    delete process.env.RATE_LIMIT_TOKENS;
    delete process.env.RATE_LIMIT_INTERVAL_MS;
    delete process.env.LOGIN_RATE_LIMIT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
}
/**
 * 時間を進めるヘルパー（レート制限テスト用）
 */
export async function advanceTime(ms) {
    vi.advanceTimersByTime(ms);
    await new Promise((resolve) => setImmediate(resolve));
}
/**
 * XSS攻撃用の文字列
 */
export const xssStrings = {
    script: '<script>alert("XSS")</script>',
    iframe: '<iframe src="evil.com"></iframe>',
    onclick: '<div onclick="alert(1)">Click me</div>',
    javascript: '<a href="javascript:alert(1)">Link</a>',
    imgOnerror: '<img src=x onerror="alert(1)">',
};
/**
 * 制御文字を含む文字列
 */
export const controlCharStrings = {
    null: 'Hello\u0000World',
    backspace: 'Hello\u0008World',
    bell: 'Hello\u0007World',
    delete: 'Hello\u007FWorld',
};
/**
 * テスト用JWTトークンを生成
 */
export function createTestJWT(userId, secret = 'test-secret-key-for-testing-purposes-only') {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ sub: userId }, secret, {
        expiresIn: '1h',
        algorithm: 'HS256',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
    });
}
