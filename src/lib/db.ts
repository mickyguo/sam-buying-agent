import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { schema } from '@/db/schema'

type Db = NodePgDatabase<typeof schema>

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  db: Db | undefined
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

function getDb(): Db {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getPool(), { schema })
  }
  return globalForDb.db
}

/** 懒加载，避免 Cloud Function 在 import 阶段因缺少 DATABASE_URL 直接崩溃 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const client = getDb()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
