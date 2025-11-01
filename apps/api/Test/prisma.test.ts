import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockEnv } from "./helpers/test-utils.js";

describe("Prisma Module Tests", () => {
	beforeEach(() => {
		mockEnv();
		vi.resetModules();
	});

	describe("ensureDemoUser", () => {
		it("should create demo user if not exists", async () => {
			// Mock Prisma client
			const mockFindUnique = vi.fn().mockResolvedValue(null);
			const mockCreate = vi.fn().mockResolvedValue({ id: 1, username: "demo" });

			// Mock the prisma module
			vi.doMock("@prisma/client", () => ({
				PrismaClient: vi.fn().mockImplementation(() => ({
					user: {
						findUnique: mockFindUnique,
						create: mockCreate,
					},
				})),
			}));

			// Import after mocking
			const { ensureDemoUser } = await import("../src/prisma.js");

			await ensureDemoUser();

			// Verify demo user was checked
			expect(mockFindUnique).toHaveBeenCalledWith({
				where: { username: "demo" },
			});

			// Verify demo user was created
			expect(mockCreate).toHaveBeenCalledWith({
				data: {
					username: "demo",
					passwordHash: expect.any(String),
				},
			});
		});

		it("should not create demo user if already exists", async () => {
			// Mock Prisma client
			const mockFindUnique = vi.fn().mockResolvedValue({
				id: 1,
				username: "demo",
				passwordHash: "existing-hash",
			});
			const mockCreate = vi.fn();

			// Mock the prisma module
			vi.doMock("@prisma/client", () => ({
				PrismaClient: vi.fn().mockImplementation(() => ({
					user: {
						findUnique: mockFindUnique,
						create: mockCreate,
					},
				})),
			}));

			// Import after mocking
			const { ensureDemoUser } = await import("../src/prisma.js");

			await ensureDemoUser();

			// Verify demo user was checked
			expect(mockFindUnique).toHaveBeenCalledWith({
				where: { username: "demo" },
			});

			// Verify demo user was NOT created (since it already exists)
			expect(mockCreate).not.toHaveBeenCalled();
		});

		it("should hash password with argon2id when creating user", async () => {
			// Mock Prisma client
			const mockFindUnique = vi.fn().mockResolvedValue(null);
			const mockCreate = vi.fn().mockResolvedValue({ id: 1, username: "demo" });

			// Mock the prisma module
			vi.doMock("@prisma/client", () => ({
				PrismaClient: vi.fn().mockImplementation(() => ({
					user: {
						findUnique: mockFindUnique,
						create: mockCreate,
					},
				})),
			}));

			// Import after mocking
			const { ensureDemoUser } = await import("../src/prisma.js");

			await ensureDemoUser();

			// Verify password hash was created with proper format
			const createCall = mockCreate.mock.calls[0][0];
			const passwordHash = createCall.data.passwordHash;

			expect(passwordHash).toBeDefined();
			expect(typeof passwordHash).toBe("string");
			expect(passwordHash.startsWith("$argon2id$")).toBe(true);
		});
	});

	describe("PrismaClient initialization", () => {
		it("should export a PrismaClient instance", async () => {
			vi.resetModules();

			const { prisma } = await import("../src/prisma.js");

			expect(prisma).toBeDefined();
			expect(typeof prisma).toBe("object");
		});
	});
});
