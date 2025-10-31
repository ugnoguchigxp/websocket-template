import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JwtService } from './JwtService.js'
import jwt from 'jsonwebtoken'

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

// Mock logger
vi.mock('./modules/logger/core/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('JwtService', () => {
  let jwtService: JwtService
  const testSecret = 'test-secret-key-at-least-32-characters-long'

  beforeEach(() => {
    vi.clearAllMocks()
    jwtService = new JwtService(testSecret)
  })

  describe('constructor', () => {
    it('should initialize with provided secret', () => {
      expect(jwtService).toBeDefined()
    })
  })

  describe('sign', () => {
    const mockUserId = 'user123'

    it('should generate JWT token', () => {
      const expectedToken = 'mock-jwt-token'
      const mockSign = (jwt as any).sign
      mockSign.mockReturnValue(expectedToken)

      const token = jwtService.sign(mockUserId)

      expect(mockSign).toHaveBeenCalledWith(
        { sub: mockUserId },
        testSecret,
        expect.objectContaining({
          expiresIn: '7d',
          algorithm: 'HS256',
        })
      )
      expect(token).toBe(expectedToken)
    })

    it('should include issuer and audience when provided', () => {
      process.env.JWT_ISSUER = 'test-issuer'
      process.env.JWT_AUDIENCE = 'test-audience'
      
      const service = new JwtService(testSecret)
      const mockSign = (jwt as any).sign
      mockSign.mockReturnValue('token')

      service.sign(mockUserId)

      expect(mockSign).toHaveBeenCalledWith(
        { sub: mockUserId },
        testSecret,
        expect.objectContaining({
          expiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'test-issuer',
          audience: 'test-audience',
        })
      )

      delete process.env.JWT_ISSUER
      delete process.env.JWT_AUDIENCE
    })
  })

  describe('verify', () => {
    const mockToken = 'valid.jwt.token'

    it('should verify valid token', () => {
      const mockDecoded = { sub: '123' }
      const mockVerify = (jwt as any).verify
      mockVerify.mockReturnValue(mockDecoded)

      const result = jwtService.verify(mockToken)

      expect(mockVerify).toHaveBeenCalledWith(
        mockToken,
        testSecret,
        expect.objectContaining({
          algorithms: ['HS256'],
          clockTolerance: 5,
        })
      )
      expect(result).toBe('123')
    })

    it('should include issuer and audience in verification when provided', () => {
      process.env.JWT_ISSUER = 'test-issuer'
      process.env.JWT_AUDIENCE = 'test-audience'
      
      const service = new JwtService(testSecret)
      const mockVerify = (jwt as any).verify
      mockVerify.mockReturnValue({ sub: '123' })

      service.verify(mockToken)

      expect(mockVerify).toHaveBeenCalledWith(
        mockToken,
        testSecret,
        expect.objectContaining({
          algorithms: ['HS256'],
          clockTolerance: 5,
          issuer: 'test-issuer',
          audience: 'test-audience',
        })
      )

      delete process.env.JWT_ISSUER
      delete process.env.JWT_AUDIENCE
    })

    it('should return null for invalid token', () => {
      const mockError = new Error('Invalid token')
      const mockVerify = (jwt as any).verify
      mockVerify.mockImplementation(() => {
        throw mockError
      })

      const result = jwtService.verify(mockToken)

      expect(result).toBeNull()
    })

    it('should return null for token without sub', () => {
      const mockVerify = (jwt as any).verify
      mockVerify.mockReturnValue({})

      const result = jwtService.verify(mockToken)

      expect(result).toBeNull()
    })
  })
})
