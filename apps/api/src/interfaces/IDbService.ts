export type DbUser = { id: number; username: string; password_hash: string };

export interface IDbService {
	findUserByUsername(username: string): DbUser | undefined;
	createUser(username: string, passwordHash: string): number;
}

export interface IDbInitializer {
	initialize(): Promise<void>;
}
