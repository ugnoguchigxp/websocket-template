export type DbUser = { id: number; username: string; password_hash: string };

export interface IDbService {
	findUserByUsername(username: string): Promise<DbUser | undefined>;
	createUser(username: string, passwordHash: string): Promise<number>;
}

export interface IDbInitializer {
	initialize(): Promise<void>;
}
