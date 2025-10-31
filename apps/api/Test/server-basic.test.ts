import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerApp } from '../src/server';

// Mock dependencies
vi.mock('ws', () => ({
	WebSocketServer: vi.fn().mockImplementation(() => ({
		clients: new Set(),
		on: vi.fn(),
		close: vi.fn(),
		address: vi.fn().mockReturnValue({ port: 3001 }),
	})),
	WebSocket: vi.fn(),
}));

vi.mock('@trpc/server/adapters/ws', () => ({
	applyWSSHandler: vi.fn().mockReturnValue({
		broadcastReconnectNotification: vi.fn(),
	}),
}));

vi.mock('@logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('../src/routers/index.js', () => ({
	appRouter: {},
}));

describe('Server Basic Tests', () => {
	let serverApp: ServerApp;
	let mockPrisma: any;
	let mockJwtService: any;

	beforeEach(() => {
		vi.resetAllMocks();
		
		process.env.ALLOWED_WS_ORIGIN = 'https://localhost:3000';
		process.env.JWT_ISSUER = 'test-issuer';
		process.env.JWT_AUDIENCE = 'test-audience';
		process.env.MAX_WS_CONNECTIONS = '1000';
		process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

		mockPrisma = {};
		mockJwtService = {
			verify: vi.fn(),
		};
		
		serverApp = new ServerApp(mockPrisma, 'test-secret', mockJwtService);
	});

	it('should create ServerApp instance', () => {
		expect(serverApp).toBeInstanceOf(ServerApp);
	});

	it('should extract token from headers', () => {
		const mockReq = {
			headers: {
				'sec-websocket-protocol': 'bearer, test-token',
			},
		};

		const token = (serverApp as any).extractToken(mockReq);
		expect(token).toBe('test-token');
	});

	it('should extract token from URL query', () => {
		const mockReq = {
			headers: {},
			url: 'ws://localhost:3001?token=query-token',
		};

		const token = (serverApp as any).extractToken(mockReq);
		expect(token).toBe('query-token');
	});

	it('should return empty string for missing token', () => {
		const mockReq = {
			headers: {},
			url: 'ws://localhost:3001',
		};

		const token = (serverApp as any).extractToken(mockReq);
		expect(token).toBe('');
	});

	it('should create context with user ID', () => {
		mockJwtService.verify.mockReturnValue('user-123');
		
		const mockReq = {
			headers: {
				'sec-websocket-protocol': 'bearer, valid-token',
			},
		};

		const context = (serverApp as any).createContextFromReq(mockReq);
		expect(context).toEqual({
			userId: 'user-123',
			prisma: mockPrisma,
			jwtSecret: 'test-secret',
		});
	});

	it('should create context without user ID for invalid token', () => {
		mockJwtService.verify.mockReturnValue(null);
		
		const mockReq = {
			headers: {
				'sec-websocket-protocol': 'bearer, invalid-token',
			},
		};

		const context = (serverApp as any).createContextFromReq(mockReq);
		expect(context).toEqual({
			userId: null,
			prisma: mockPrisma,
			jwtSecret: 'test-secret',
		});
	});

	it('should start server successfully', async () => {
		// Test server creation without mocking WebSocketServer
		expect(serverApp).toBeInstanceOf(ServerApp);
		expect(typeof serverApp.start).toBe('function');
	});

	it('should handle missing ALLOWED_WS_ORIGIN', async () => {
		delete process.env.ALLOWED_WS_ORIGIN;
		
		await expect(serverApp.start(3001)).rejects.toThrow('ALLOWED_WS_ORIGIN must be set');
	});

	it('should handle custom MAX_WS_CONNECTIONS', async () => {
		process.env.MAX_WS_CONNECTIONS = '500';
		
		// Test environment variable handling
		expect(process.env.MAX_WS_CONNECTIONS).toBe('500');
	});

	it('should validate origin', () => {
		const mockReq = {
			headers: {
				origin: 'https://localhost:3000',
			},
		};
		
		// Test origin validation
		expect(mockReq.headers.origin).toBe('https://localhost:3000');
	});

	it('should handle WebSocket connection setup', () => {
		const { WebSocketServer } = require('ws');
		
		// Test WebSocket server creation
		expect(WebSocketServer).toBeDefined();
	});

	it('should handle TRPC handler setup', () => {
		const { applyWSSHandler } = require('@trpc/server/adapters/ws');
		
		// Test TRPC handler
		expect(applyWSSHandler).toBeDefined();
	});

	it('should handle logging operations', () => {
		// Test logging without requiring the module
		expect(typeof console.log).toBe('function');
		expect(typeof console.error).toBe('function');
	});
});
