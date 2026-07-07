import { inArray } from 'drizzle-orm'
import { groupOrder, groupParticipation, order, product, user } from '@/db/schema'
import { db } from '@/lib/db'

export interface TestContext {
  userIds: string[]
  productIds: string[]
  groupOrderIds: string[]
  orderIds: string[]
}

export function createTestContext(): TestContext {
  return {
    userIds: [],
    productIds: [],
    groupOrderIds: [],
    orderIds: [],
  }
}

function randomSuffix() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export async function createTestUser() {
  const suffix = randomSuffix()
  const [row] = await db
    .insert(user)
    .values({
      name: `Test User ${suffix}`,
      email: `test-${suffix}@example.com`,
      phone: `1${suffix.slice(0, 10).padEnd(10, '0')}`,
      openid: `openid_${suffix}`,
    })
    .returning()

  return row
}

export async function createSplittableProduct(
  overrides: Partial<{
    price: number
    totalUnits: number
    unitLabel: string
    name: string
  }> = {},
) {
  const suffix = randomSuffix()
  const [row] = await db
    .insert(product)
    .values({
      name: overrides.name ?? `测试拼单商品 ${suffix}`,
      imageUrl: 'https://example.com/test-product.jpg',
      price: overrides.price ?? 5990,
      splittable: true,
      totalUnits: overrides.totalUnits ?? 10,
      unitLabel: overrides.unitLabel ?? '块',
      status: 'ACTIVE',
      externalId: `test-${suffix}`,
    })
    .returning()

  return row
}

export async function cleanupTestContext(ctx: TestContext) {
  if (ctx.groupOrderIds.length > 0) {
    await db
      .delete(groupParticipation)
      .where(inArray(groupParticipation.groupOrderId, ctx.groupOrderIds))
  }
  if (ctx.orderIds.length > 0) {
    await db.delete(order).where(inArray(order.id, ctx.orderIds))
  }
  if (ctx.groupOrderIds.length > 0) {
    await db.delete(groupOrder).where(inArray(groupOrder.id, ctx.groupOrderIds))
  }
  if (ctx.productIds.length > 0) {
    await db.delete(product).where(inArray(product.id, ctx.productIds))
  }
  if (ctx.userIds.length > 0) {
    await db.delete(user).where(inArray(user.id, ctx.userIds))
  }
}
