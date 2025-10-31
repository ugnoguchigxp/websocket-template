import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { container } from "tsyringe";
import { ServerApp } from "./server.js";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";

// Mock WebSocket
vi.mock("ws", () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
  })),
  WebSocket: vi.fn().mockImplementation(() => ({
    readyState: 1,
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    isAlive: true,
  })),
}));

// Mock @trpc/server/adapters/ws
vi.mock("@trpc/server/adapters/ws", () => ({
  applyWSSHandler: vi.fn().mockReturnValue({
    broadcastReconnectNotification: vi.fn(),
  }),
}));

// Mock routers
vi.mock("./routers/index.js", () => ({
  appRouter: {},
}));

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  $disconnect: vi.fn().mockResolvedValue(undefined),
} as any;

const mockJwtService = {
  verifyToken: vi.fn(),
  extractTokenFromSubprotocol: vi.fn(),
  extractTokenFromQuery: vi.fn(),
  verify: vi.fn(),
} as any;

describe("ServerApp", () => {
  let serverApp: ServerApp;

  beforeAll(() => {
    // 環境変数を設定
    process.env.ALLOWED_WS_ORIGIN = "http://localhost:5173";
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";

    container.reset();
    container.register("Prisma", { useValue: mockPrisma });
    container.register("JWT_SECRET", { useValue: "test-secret-32-characters-long" });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    serverApp = new ServerApp(mockPrisma, "test-secret-32-characters-long", mockJwtService);
  });

  afterEach(async () => {
    if (serverApp && typeof serverApp.stop === 'function') {
      try {
        await serverApp.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it("constructs and starts without throwing", async () => {
    await expect(serverApp.start(0)).resolves.toBeUndefined();
  });

  it("should validate allowed origins", async () => {
    const allowedOrigin = process.env.ALLOWED_WS_ORIGIN;
    expect(allowedOrigin).toBe("http://localhost:5173");
  });

  it("should throw error when ALLOWED_WS_ORIGIN is not set", async () => {
    delete process.env.ALLOWED_WS_ORIGIN;
    
    await expect(serverApp.start(0)).rejects.toThrow("ALLOWED_WS_ORIGIN must be set");
    
    // Restore for other tests
    process.env.ALLOWED_WS_ORIGIN = "http://localhost:5173";
  });

  it("should extract token from WebSocket subprotocol header", () => {
    const mockReq = {
      headers: {
        "sec-websocket-protocol": "bearer, test-token-123",
      },
    } as any;

    // Access private method through type assertion
    const token = (serverApp as any).extractToken(mockReq);
    expect(token).toBe("test-token-123");
  });

  it("should extract token from URL query parameter as fallback", () => {
    const mockReq = {
      headers: {},
      url: "ws://localhost:3000?token=test-token-query",
    } as any;

    const token = (serverApp as any).extractToken(mockReq);
    expect(token).toBe("test-token-query");
  });

  it("should return empty string when no token found", () => {
    const mockReq = {
      headers: {},
      url: "ws://localhost:3000",
    } as any;

    const token = (serverApp as any).extractToken(mockReq);
    expect(token).toBe("");
  });

  it("should create context with authenticated user", () => {
    const mockReq = {
      headers: {
        "sec-websocket-protocol": "bearer, valid-token",
      },
    } as any;

    mockJwtService.verify.mockReturnValue("user-123");

    const context = (serverApp as any).createContextFromReq(mockReq);

    expect(mockJwtService.verify).toHaveBeenCalledWith("valid-token");
    expect(context).toEqual({
      userId: "user-123",
      prisma: mockPrisma,
      jwtSecret: "test-secret-32-characters-long",
    });
  });

  it("should create context with null userId for unauthenticated request", () => {
    const mockReq = {
      headers: {},
      url: "ws://localhost:3000",
    } as any;

    const context = (serverApp as any).createContextFromReq(mockReq);

    expect(context).toEqual({
      userId: null,
      prisma: mockPrisma,
      jwtSecret: "test-secret-32-characters-long",
    });
  });
});
