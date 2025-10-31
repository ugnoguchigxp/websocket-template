import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { container } from 'tsyringe'
import { signJwt, verifyJwt, authenticate } from './auth.js'
import type { IAuthService } from './interfaces/IAuthService.js'

// Mock dependencies
vi.mock('./db.js', () => ({
  findUserByUsername: vi.fn(),
}))

vi.mock('./services/AuthService.js', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    signJwt: vi.fn(),
    verifyJwt: vi.fn(),
    authenticate: vi.fn(),
  })),
}))

vi.mock('./services/JwtServiceImpl.js', () => ({
  JwtServiceImpl: vi.fn(),
}))

vi.mock('./services/PasswordServiceImpl.js', () => ({
  PasswordServiceImpl: vi.fn(),
}))

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    container.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('signJwt', () => {
    it('should sign JWT using authService', () => {
      const mockAuthService = {
        signJwt: vi.fn().mockReturnValue('mock-token'),
      }
      container.register('AuthService', { useValue: mockAuthService })

      const result = signJwt(123)

      expect(mockAuthService.signJwt).toHaveBeenCalledWith(123)
      expect(result).toBe('mock-token')
    })
  })

  describe('verifyJwt', () => {
    it('should verify JWT using authService', () => {
      const mockAuthService = {
        verifyJwt: vi.fn().mockReturnValue({ userId: '123' }),
      }
      container.register('AuthService', { useValue: mockAuthService })

      const result = verifyJwt('test-token')

      expect(mockAuthService.verifyJwt).toHaveBeenCalledWith('test-token')
      expect(result).toEqual({ userId: '123' })
    })

    it('should return null when verification fails', () => {
      const mockAuthService = {
        verifyJwt: vi.fn().mockReturnValue(null),
      }
      container.register('AuthService', { useValue: mockAuthService })

      const result = verifyJwt('invalid-token')

      expect(mockAuthService.verifyJwt).toHaveBeenCalledWith('invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('authenticate', () => {
    it('should authenticate using authService', async () => {
      const mockAuthService = {
        authenticate: vi.fn().mockResolvedValue({ userId: 123 }),
      }
      container.register('AuthService', { useValue: mockAuthService })

      const result = await authenticate('testuser', 'password')

      expect(mockAuthService.authenticate).toHaveBeenCalledWith('testuser', 'password')
      expect(result).toEqual({ userId: 123 })
    })

    it('should return null when authentication fails', async () => {
      const mockAuthService = {
        authenticate: vi.fn().mockResolvedValue(null),
      }
      container.register('AuthService', { useValue: mockAuthService })

      const result = await authenticate('wronguser', 'wrongpass')

      expect(mockAuthService.authenticate).toHaveBeenCalledWith('wronguser', 'wrongpass')
      expect(result).toBeNull()
    })
  })
})
