import { PrismaClient } from '@prisma/client'

// Bump when Prisma schema changes so dev server picks up a fresh client.
const PRISMA_CACHE_KEY = 'v5-checkout-batch'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaCacheKey: string | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && globalForPrisma.prismaCacheKey === PRISMA_CACHE_KEY) {
    return cached
  }

  if (cached) {
    void cached.$disconnect()
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
    globalForPrisma.prismaCacheKey = PRISMA_CACHE_KEY
  }
  return client
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? globalForPrisma.prisma ?? createPrismaClient()
    : getPrismaClient()

if (process.env.NODE_ENV === 'production' && !globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}
