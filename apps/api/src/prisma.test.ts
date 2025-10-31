import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock argon2
vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-demo-password'),
    argon2id: 'argon2id',
  },
}))

// Mock logger
vi.mock('./modules/logger/core/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Prisma Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create PrismaClient instance', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const { prisma } = await import('./prisma.js')
    
    expect(PrismaClient).toHaveBeenCalled()
    expect(prisma).toBeDefined()
    expect(prisma.user).toBeDefined()
  })

  it('should create demo user if not exists', async () => {
    const { prisma } = await import('./prisma.js')
    const { ensureDemoUser } = await import('./prisma.js')
    const argon2 = await import('argon2')
    const { logger } = await import('./modules/logger/core/logger.js')
    
    // Mock demo user not found
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 1, username: 'demo' })
    
    await ensureDemoUser()
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'demo' } })
    expect(argon2.default.hash).toHaveBeenCalledWith('demo1234', {
      type: argon2.default.argon2id,
      memoryCost: 2 ** 15,
      timeCost: 3,
      parallelism: 1,
    })
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { username: 'demo', passwordHash: 'hashed-demo-password' }
    })
    expect(logger.info).toHaveBeenCalledWith('Demo user seeded', { username: 'demo' })
  })

  it('should not create demo user if already exists', async () => {
    const { prisma } = await import('./prisma.js')
    const { ensureDemoUser } = await import('./prisma.js')
    const argon2 = await import('argon2')
    const { logger } = await import('./modules/logger/core/logger.js')
    
    // Mock demo user exists
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, username: 'demo' })
    
    await ensureDemoUser()
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'demo' } })
    expect(argon2.default.hash).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('./prisma.js')
    const { ensureDemoUser } = await import('./prisma.js')
    
    // Mock database error
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'))
    
    await expect(ensureDemoUser()).rejects.toThrow('Database connection failed')
  })

  it('should hash password with argon2id when creating user', async () => {
    const { prisma } = await import('./prisma.js')
    const { ensureDemoUser } = await import('./prisma.js')
    const argon2 = await import('argon2')
    
    // Mock demo user not found
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 1, username: 'demo' })
    
    await ensureDemoUser()
    
    expect(argon2.default.hash).toHaveBeenCalledWith('demo1234', {
      type: argon2.default.argon2id,
      memoryCost: 32768, // 2^15
      timeCost: 3,
      parallelism: 1,
    })
  })
})
