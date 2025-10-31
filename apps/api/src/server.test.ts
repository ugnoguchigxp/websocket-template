import { beforeAll, describe, expect, it } from "vitest";
import "reflect-metadata";
import { container } from "tsyringe";
import { ServerApp } from "./server";

const mockPrisma = {} as any;

describe("ServerApp", () => {
	beforeAll(() => {
		// 環境変数を設定
		process.env.ALLOWED_WS_ORIGIN = "http://localhost:5173";
		process.env.JWT_ISSUER = "test-issuer";
		process.env.JWT_AUDIENCE = "test-audience";

		container.reset();
		container.register("Prisma", { useValue: mockPrisma });
		container.register("JWT_SECRET", { useValue: "test-secret" });
	});

	it('constructs and starts without throwing', async () => {
		// 直接インスタンス化
		const app = new ServerApp(
			{} as any, // prisma mock
			'test-secret', // JWT_SECRET
			{} as any // jwtService mock
		);
		// Pick random high port; we only assert that start does not throw immediately.
		await expect(app.start(0)).resolves.toBeUndefined();
	});
});
