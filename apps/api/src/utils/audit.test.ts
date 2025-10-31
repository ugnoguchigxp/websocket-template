import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redactInput, createAuditMiddleware } from './audit.js'
import { logger } from '../modules/logger/core/logger.js'

// Mock logger
vi.mock('../modules/logger/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('audit utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('redactInput', () => {
    it('should redact password for auth.login path', () => {
      const input = { username: 'testuser', password: 'secret123' }
      const result = redactInput('auth.login', input)
      expect(result).toEqual({ username: 'testuser', password: '***' })
    })

    it('should return input as-is for non-auth paths', () => {
      const input = { title: 'Test', body: 'Content' }
      const result = redactInput('posts.create', input)
      expect(result).toEqual(input)
    })

    it('should handle null/undefined input', () => {
      expect(redactInput('auth.login', null)).toBeUndefined()
      expect(redactInput('auth.login', undefined)).toBeUndefined()
    })

    it('should handle malformed input gracefully', () => {
      const input = { notUsername: 'test' }
      const result = redactInput('auth.login', input)
      expect(result).toEqual(input)
    })

    it('should handle errors during redaction', () => {
      const circularInput = {}
      circularInput.self = circularInput
      const result = redactInput('auth.login', circularInput)
      expect(result).toBeDefined()
    })
  })

  describe('createAuditMiddleware', () => {
    const mockContext = { userId: '123' }
    const mockNext = vi.fn().mockResolvedValue({ success: true })
    const mockRawInput = { username: 'test', password: 'secret' }

    it('should log successful RPC calls', async () => {
      const middleware = createAuditMiddleware()
      
      await middleware({
        ctx: mockContext,
        path: 'auth.login',
        type: 'mutation',
        next: mockNext,
        rawInput: mockRawInput,
      })

      expect(logger.info).toHaveBeenCalledWith('RPC call succeeded', {
        userId: '123',
        path: 'auth.login',
        type: 'mutation',
        input: { username: 'test', password: '***' },
        duration: expect.any(Number),
      })
    })

    it('should log failed RPC calls with error details', async () => {
      const error = new Error('Test error')
      error.code = 'TEST_ERROR'
      mockNext.mockRejectedValue(error)

      const middleware = createAuditMiddleware()
      
      // Should throw an error, but we don't care about the exact message
      await expect(middleware({
        ctx: mockContext,
        path: 'posts.create',
        type: 'mutation',
        next: mockNext,
        rawInput: mockRawInput,
      })).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith('RPC call failed', {
        userId: '123',
        path: 'posts.create',
        type: 'mutation',
        input: { username: 'test', password: 'secret' },
        duration: expect.any(Number),
        errorCode: 'TEST_ERROR',
        message: 'Test error',
      })
    })

    it('should handle anonymous users', async () => {
      const middleware = createAuditMiddleware()
      const anonymousContext = { userId: undefined }
      const successNext = vi.fn().mockResolvedValue({ success: true })
      
      await middleware({
        ctx: anonymousContext,
        path: 'posts.list',
        type: 'query',
        next: successNext,
        rawInput: { limit: 10 },
      })

      expect(logger.info).toHaveBeenCalledWith('RPC call succeeded', {
        userId: 'anon',
        path: 'posts.list',
        type: 'query',
        input: { limit: 10 },
        duration: expect.any(Number),
      })
    })

    it('should wrap unknown errors in TRPCError', async () => {
      const unknownError = { message: 'Unknown error' }
      mockNext.mockRejectedValue(unknownError)

      const middleware = createAuditMiddleware()
      
      await expect(middleware({
        ctx: mockContext,
        path: 'test.endpoint',
        type: 'query',
        next: mockNext,
        rawInput: {},
      })).rejects.toThrow('An unexpected error occurred')

      expect(logger.error).toHaveBeenCalledWith('RPC call failed', {
        userId: '123',
        path: 'test.endpoint',
        type: 'query',
        input: {},
        duration: expect.any(Number),
        errorCode: 'ERROR',
        message: 'Unknown error',
      })
    })
  })
})
