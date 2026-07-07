import fs from 'node:fs'
import path from 'node:path'
import { inArray, like } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import {
  groupOrder,
  groupParticipation,
  order,
  product,
  schema,
} from '../../src/db/schema'

const SEED_STATE_PATH = path.join(process.cwd(), 'e2e/.seed-state.json')
export const E2E_EXTERNAL_ID_PREFIX = 'e2e-'

export interface E2eSeedState {
  directProductId: string
  splittableProductId: string
  productIds: string[]
}

function createDbClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for E2E tests')
  }

  const pool = new Pool({ connectionString })
  return { db: drizzle(pool, { schema }), pool }
}

export async function seedE2eProducts(): Promise<E2eSeedState> {
  const { db, pool } = createDbClient()

  try {
    await cleanupE2eData(db)

    const suffix = Date.now().toString(36)

    const [directProduct] = await db
      .insert(product)
      .values({
        name: `E2E 整件商品 ${suffix}`,
        imageUrl: 'https://example.com/e2e-direct.jpg',
        price: 9900,
        splittable: false,
        status: 'ACTIVE',
        externalId: `${E2E_EXTERNAL_ID_PREFIX}direct-${suffix}`,
        description: 'E2E 测试用整件代购商品',
      })
      .returning()

    const [splittableProduct] = await db
      .insert(product)
      .values({
        name: `E2E 拼单商品 ${suffix}`,
        imageUrl: 'https://example.com/e2e-split.jpg',
        price: 5990,
        splittable: true,
        totalUnits: 10,
        unitLabel: '块',
        status: 'ACTIVE',
        externalId: `${E2E_EXTERNAL_ID_PREFIX}split-${suffix}`,
        description: 'E2E 测试用可拆分商品',
      })
      .returning()

    const state: E2eSeedState = {
      directProductId: directProduct.id,
      splittableProductId: splittableProduct.id,
      productIds: [directProduct.id, splittableProduct.id],
    }

    fs.writeFileSync(SEED_STATE_PATH, JSON.stringify(state, null, 2))
    return state
  } finally {
    await pool.end()
  }
}

export function readE2eSeedState(): E2eSeedState {
  const raw = fs.readFileSync(SEED_STATE_PATH, 'utf8')
  return JSON.parse(raw) as E2eSeedState
}

export async function cleanupE2eData(
  db: ReturnType<typeof createDbClient>['db'],
) {
  const e2eProducts = await db
    .select({ id: product.id })
    .from(product)
    .where(like(product.externalId, `${E2E_EXTERNAL_ID_PREFIX}%`))

  const productIds = e2eProducts.map((row) => row.id)
  if (productIds.length === 0) {
    return
  }

  const e2eOrders = await db
    .select({ id: order.id, groupOrderId: order.groupOrderId })
    .from(order)
    .where(inArray(order.productId, productIds))

  const orderIds = e2eOrders.map((row) => row.id)
  const groupOrderIds = [
    ...new Set(
      e2eOrders
        .map((row) => row.groupOrderId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  if (orderIds.length > 0) {
    await db.delete(order).where(inArray(order.id, orderIds))
  }

  if (groupOrderIds.length > 0) {
    await db
      .delete(groupParticipation)
      .where(inArray(groupParticipation.groupOrderId, groupOrderIds))
    await db.delete(groupOrder).where(inArray(groupOrder.id, groupOrderIds))
  }

  await db.delete(product).where(inArray(product.id, productIds))
}

export async function cleanupE2eProducts() {
  const { db, pool } = createDbClient()
  try {
    await cleanupE2eData(db)
    if (fs.existsSync(SEED_STATE_PATH)) {
      fs.unlinkSync(SEED_STATE_PATH)
    }
  } finally {
    await pool.end()
  }
}
