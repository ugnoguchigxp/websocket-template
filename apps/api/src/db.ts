import * as fs from "fs";
import * as path from "path";
import { logger } from "./modules/logger/core/logger.js";
import argon2 from "argon2";
import { DatabaseSync } from "node:sqlite";
import { container, injectable } from "tsyringe";
import type { IDbInitializer } from "./interfaces/IDbService.js";
import { DbService } from "./services/DbService.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL
);
`);

@injectable()
export class DbInitializer implements IDbInitializer {
	private db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	async initialize(): Promise<void> {
		// Seed demo user if missing
		const demoUser = this.db.prepare("SELECT id FROM users WHERE username = ?").get("demo");
		if (!demoUser) {
			const hash = await argon2.hash("demo1234");
			this.db
				.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
				.run("demo", hash);
			logger.info("Demo user seeded", { username: "demo" });
		}
	}
}

// Register DI implementations
const dbService = new DbService(db);
const dbInitializer = new DbInitializer(db);

container.register("DbService", { useValue: dbService });
container.register("DbInitializer", { useValue: dbInitializer });
container.register("Database", { useValue: db });

// Export convenience functions that maintain backward compatibility
export const findUserByUsername = (username: string) => dbService.findUserByUsername(username);
export const createUser = (username: string, passwordHash: string) =>
	dbService.createUser(username, passwordHash);

// Export types
export type { DbUser, IDbService, IDbInitializer } from "./interfaces/IDbService.js";

// Initialize database
dbInitializer.initialize().catch((e) => {
	logger.error("Database initialization failed", e);
});
