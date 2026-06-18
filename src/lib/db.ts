import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { schema } from '@/db/schema'

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  return new Pool({ connectionString })
}

function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool()
  }
  return globalForDb.pool
}

export const db = drizzle(getPool(), { schema })
