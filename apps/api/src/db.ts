import argon2 from "argon2";
import { injectable } from "tsyringe";
import type { IDbInitializer } from "./interfaces/IDbService.js";
import { logger } from "./modules/logger/core/logger.js";

@injectable()
export class DbInitializer implements IDbInitializer {
	constructor(private prisma: any) {}

	async initialize(): Promise<void> {
		// Seed admin user if missing
		const adminUser = await this.prisma.user.findUnique({ where: { username: "admin" } });
		if (!adminUser) {
			const hash = await argon2.hash("websocket3001");
			await this.prisma.user.create({
				data: {
					username: "admin",
					passwordHash: hash,
					role: "ADMIN",
				},
			});
			logger.info("Admin user seeded", { username: "admin", role: "ADMIN" });
		}
	}
}

// Export types
export type { IDbInitializer } from "./interfaces/IDbService.js";
