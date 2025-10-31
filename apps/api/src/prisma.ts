import { PrismaClient } from "@prisma/client";
import { logger } from "./modules/logger/core/logger.js";
import argon2 from "argon2";

export const prisma = new PrismaClient();

export async function ensureDemoUser() {
	const existing = await prisma.user.findUnique({ where: { username: "demo" } });
	if (!existing) {
		const hash = await argon2.hash("demo1234", {
			type: argon2.argon2id,
			memoryCost: 2 ** 15, // ~32MB
			timeCost: 3,
			parallelism: 1,
		});
		await prisma.user.create({ data: { username: "demo", passwordHash: hash } });
		logger.info("Demo user seeded", { username: "demo" });
	}
}
