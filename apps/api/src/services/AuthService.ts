import { inject, injectable } from "tsyringe";
import type {
	IAuthService,
	IJwtService,
	IPasswordService,
	IUserRepository,
} from "../interfaces/IAuthService.js";

@injectable()
export class AuthService implements IAuthService {
	constructor(
		@inject("JwtService") private jwtService: IJwtService,
		@inject("PasswordService") private passwordService: IPasswordService,
		@inject("UserRepository") private userRepository: IUserRepository
	) {}

	signJwt(userId: number): string {
		return this.jwtService.sign(userId);
	}

	verifyJwt(token: string): { userId: string } | null {
		return this.jwtService.verify(token);
	}

	async authenticate(username: string, password: string): Promise<{ userId: number } | null> {
		const user = this.userRepository.findByUsername(username);
		if (!user) return null;

		const isValid = await this.passwordService.verify(user.password_hash, password);
		if (!isValid) return null;

		return { userId: user.id };
	}
}
