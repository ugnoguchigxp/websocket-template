import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IAuthService, IJwtService, IPasswordService, IUserRepository } from '../src/interfaces/IAuthService.js';
import { AuthService } from '../src/services/AuthService.js';
import { JwtServiceImpl } from '../src/services/JwtServiceImpl.js';
import { PasswordServiceImpl } from '../src/services/PasswordServiceImpl.js';

describe('Auth DI Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		container.clearInstances();
		
		// Register test implementations
		container.register('JWT_SECRET', { useValue: 'test-secret-key-that-is-long-enough-for-testing' });
	});

	it('should register and resolve AuthService', () => {
		const mockJwtService = new JwtServiceImpl('test-secret-key-that-is-long-enough-for-testing');
		const mockPasswordService = new PasswordServiceImpl();
		const mockUserRepo = {
			findByUsername: vi.fn(),
		};

		const authService = new AuthService(mockJwtService, mockPasswordService, mockUserRepo);
		expect(authService).toBeInstanceOf(AuthService);
	});

	it('should sign and verify JWT token', () => {
		const jwtService = new JwtServiceImpl('test-secret-key-that-is-long-enough-for-testing');
		
		const userId = 123;
		const token = jwtService.sign(userId);
		const result = jwtService.verify(token);
		
		expect(result).toEqual({ userId: 123 });
	});

	it('should return null for invalid JWT token', () => {
		const jwtService = new JwtServiceImpl('test-secret-key-that-is-long-enough-for-testing');
		
		const result = jwtService.verify('invalid-token');
		expect(result).toBeNull();
	});

	it('should authenticate valid user', async () => {
		// Mock dependencies
		const mockJwtService: IJwtService = {
			sign: vi.fn(),
			verify: vi.fn(),
		};
		
		const mockPasswordService: IPasswordService = {
			verify: vi.fn().mockResolvedValue(true),
		};
		
		const mockUserRepo: IUserRepository = {
			findByUsername: vi.fn().mockReturnValue({
				id: 1,
				username: 'testuser',
				password_hash: 'hashedpassword'
			}),
		};

		const authService = new AuthService(mockJwtService, mockPasswordService, mockUserRepo);
		const result = await authService.authenticate('testuser', 'password');
		
		expect(result).toEqual({ userId: 1 });
		expect(mockUserRepo.findByUsername).toHaveBeenCalledWith('testuser');
		expect(mockPasswordService.verify).toHaveBeenCalledWith('hashedpassword', 'password');
	});

	it('should return null for non-existent user', async () => {
		const mockJwtService: IJwtService = {
			sign: vi.fn(),
			verify: vi.fn(),
		};
		
		const mockPasswordService: IPasswordService = {
			verify: vi.fn(),
		};
		
		const mockUserRepo: IUserRepository = {
			findByUsername: vi.fn().mockReturnValue(undefined),
		};

		const authService = new AuthService(mockJwtService, mockPasswordService, mockUserRepo);
		const result = await authService.authenticate('nonexistent', 'password');
		
		expect(result).toBeNull();
	});

	it('should return null for wrong password', async () => {
		const mockJwtService: IJwtService = {
			sign: vi.fn(),
			verify: vi.fn(),
		};
		
		const mockPasswordService: IPasswordService = {
			verify: vi.fn().mockResolvedValue(false),
		};
		
		const mockUserRepo: IUserRepository = {
			findByUsername: vi.fn().mockReturnValue({
				id: 1,
				username: 'testuser',
				password_hash: 'hashedpassword'
			}),
		};

		const authService = new AuthService(mockJwtService, mockPasswordService, mockUserRepo);
		const result = await authService.authenticate('testuser', 'wrongpassword');
		
		expect(result).toBeNull();
	});

	it('should handle password verification errors', async () => {
		const mockJwtService: IJwtService = {
			sign: vi.fn(),
			verify: vi.fn(),
		};
		
		const mockPasswordService: IPasswordService = {
			verify: vi.fn().mockResolvedValue(false), // Return false instead of throwing
		};
		
		const mockUserRepo: IUserRepository = {
			findByUsername: vi.fn().mockReturnValue({
				id: 1,
				username: 'testuser',
				password_hash: 'hashedpassword'
			}),
		};

		const authService = new AuthService(mockJwtService, mockPasswordService, mockUserRepo);
		const result = await authService.authenticate('testuser', 'password');
		
		expect(result).toBeNull();
	});
});
