import sqlite3 from "sqlite3";
import { inject, injectable } from "tsyringe";
import type { IDbService } from "../interfaces/IDbService.js";
import type { DbUser } from "../interfaces/IDbService.js";

@injectable()
export class DbService implements IDbService {
	constructor(@inject("Database") private db: sqlite3.Database) {}

	findUserByUsername(username: string): Promise<DbUser | undefined> {
		return new Promise((resolve, reject) => {
			this.db.get("SELECT * FROM users WHERE username = ?", [username], (err, row: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(row as DbUser | undefined);
				}
			});
		});
	}

	createUser(username: string, passwordHash: string): Promise<number> {
		return new Promise((resolve, reject) => {
			this.db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, passwordHash], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(Number(this.lastID));
				}
			});
		});
	}
}
