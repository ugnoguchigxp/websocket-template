import argon2 from "argon2";
import { injectable } from "tsyringe";
import type { IPasswordService } from "../interfaces/IAuthService.js";

@injectable()
export class PasswordServiceImpl implements IPasswordService {
	async verify(hash: string, password: string): Promise<boolean> {
		try {
			return await argon2.verify(hash, password);
		} catch {
			return false;
		}
	}
}
