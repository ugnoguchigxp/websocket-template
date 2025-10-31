import { container } from "tsyringe";
import { findUserByUsername } from "./db.js";
import type { IAuthService } from "./interfaces/IAuthService.js";
import { AuthService } from "./services/AuthService.js";
import { JwtServiceImpl } from "./services/JwtServiceImpl.js";
import { PasswordServiceImpl } from "./services/PasswordServiceImpl.js";

// Register DI implementations
container.register("AuthService", { useClass: AuthService });
container.register("JwtService", { useClass: JwtServiceImpl });
container.register("PasswordService", { useClass: PasswordServiceImpl });
container.register("UserRepository", { useValue: { findByUsername: findUserByUsername } });

// Export convenience functions that use DI
export function signJwt(userId: number): string {
	const authService = container.resolve<IAuthService>("AuthService");
	return authService.signJwt(userId);
}

export function verifyJwt(token: string): { userId: string } | null {
	const authService = container.resolve<IAuthService>("AuthService");
	return authService.verifyJwt(token);
}

export async function authenticate(
	username: string,
	password: string
): Promise<{ userId: number } | null> {
	const authService = container.resolve<IAuthService>("AuthService");
	return authService.authenticate(username, password);
}

// Export types
export type {
	IAuthService,
	IJwtService,
	IPasswordService,
	IUserRepository,
} from "./interfaces/IAuthService.js";
export type { JwtClaims } from "./services/JwtServiceImpl.js";
