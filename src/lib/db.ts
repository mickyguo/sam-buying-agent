import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const PRISMA_CACHE_KEY = 'v6-driver-adapter'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaCacheKey: string | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
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
  globalForPrisma.prisma = client
  globalForPrisma.prismaCacheKey = PRISMA_CACHE_KEY
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
