import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { container } from 'tsyringe'
import { AppService } from './AppService.js'
import type { IEnvironmentService } from '../interfaces/IAppService.js'
import type { IDbInitializer } from '../interfaces/IDbService.js'
import { logger } from '../modules/logger/core/logger.js'

// Mock dependencies
vi.mock('../modules/logger/core/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('../server.js', () => ({
  ServerApp: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('AppService', () => {
  let service: AppService
  let mockEnvironmentService: IEnvironmentService
  let mockDbInitializer: IDbInitializer

  beforeEach(() => {
    vi.clearAllMocks()
    container.reset()

    mockEnvironmentService = {
      loadEnvironment: vi.fn().mockReturnValue({}),
      validateEnvironment: vi.fn(),
      getPort: vi.fn().mockReturnValue(3001),
    }

    mockDbInitializer = {
      initialize: vi.fn().mockResolvedValue(undefined),
    }

    container.register('EnvironmentService', { useValue: mockEnvironmentService })
    container.register('DbInitializer', { useValue: mockDbInitializer })

    service = new AppService(mockEnvironmentService, mockDbInitializer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('start', () => {
    it('should start application successfully', async () => {
      const { ServerApp } = await import('../server.js')
      const mockServerApp = {
        start: vi.fn().mockResolvedValue(undefined),
      }
      ServerApp.mockImplementation(() => mockServerApp)

      await service.start()

      expect(mockEnvironmentService.loadEnvironment).toHaveBeenCalled()
      expect(mockEnvironmentService.validateEnvironment).toHaveBeenCalled()
      expect(mockDbInitializer.initialize).toHaveBeenCalled()
      expect(mockServerApp.start).toHaveBeenCalledWith(3001)
    })

    it('should handle startup errors and exit process', async () => {
      const mockError = new Error('Startup failed')
      
      mockEnvironmentService.validateEnvironment.mockImplementation(() => {
        throw mockError
      })

      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(service.start()).rejects.toThrow('process.exit called')

      expect(logger.error).toHaveBeenCalledWith('Fatal error during startup', mockError)
      expect(processExitSpy).toHaveBeenCalledWith(1)

      processExitSpy.mockRestore()
    })
  })
})
