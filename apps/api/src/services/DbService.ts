import { DatabaseSync } from "node:sqlite";
import { inject, injectable } from "tsyringe";
import type { IDbService } from "../interfaces/IDbService.js";
import type { DbUser } from "../interfaces/IDbService.js";

@injectable()
export class DbService implements IDbService {
	constructor(@inject("Database") private db: DatabaseSync) {}

	findUserByUsername(username: string): DbUser | undefined {
		return this.db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
			| DbUser
			| undefined;
	}

	createUser(username: string, passwordHash: string): number {
		const res = this.db
			.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
			.run(username, passwordHash);
		return Number(res.lastInsertRowid);
	}
}
