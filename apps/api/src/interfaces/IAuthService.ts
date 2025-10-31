export interface IPasswordService {
	verify(hash: string, password: string): Promise<boolean>;
}

export interface IJwtService {
	sign(userId: number): string;
	verify(token: string): { userId: string } | null;
}

export interface IUserRepository {
	findByUsername(
		username: string
	): { id: number; username: string; password_hash: string } | undefined;
}

export interface IAuthService {
	signJwt(userId: number): string;
	verifyJwt(token: string): { userId: string } | null;
	authenticate(username: string, password: string): Promise<{ userId: number } | null>;
}
