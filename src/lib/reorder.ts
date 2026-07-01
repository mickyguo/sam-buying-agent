import { and, desc, eq, sql } from 'drizzle-orm'
import { order, pickupSlot, product } from '@/db/schema'
import { OrderStatus, ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { calcSplitAmount } from '@/lib/utils'

export async function buildReorderItems(orderId: string, userId: string) {
  const orderRow = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: { product: true },
  })

  if (!orderRow || orderRow.userId !== userId) {
    throw new Error('订单不存在')
  }
  if (orderRow.product.status !== ProductStatus.ACTIVE) {
    throw new Error('商品已下架，无法再来一单')
  }

  const amount = orderRow.product.splittable
    ? calcSplitAmount(
        orderRow.product.price,
        orderRow.product.totalUnits ?? 1,
        orderRow.units,
      )
    : orderRow.product.price

  return {
    productId: orderRow.productId,
    productName: orderRow.product.name,
    productImage: orderRow.product.imageUrl,
    units: orderRow.units,
    mode: orderRow.product.splittable ? ('create' as const) : ('direct' as const),
    amountYuan: (amount / 100).toFixed(2),
    unitLabel: orderRow.product.unitLabel,
  }
}

export async function getFrequentItems(userId: string, limit = 6) {
  const rows = await db
    .select({
      productId: order.productId,
      totalUnits: sql<number>`sum(${order.units})::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(order)
    .where(
      and(eq(order.userId, userId), eq(order.status, OrderStatus.COMPLETED)),
    )
    .groupBy(order.productId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)

  const items = []
  for (const row of rows) {
    const productRow = await db.query.product.findFirst({
      where: eq(product.id, row.productId),
    })
    if (!productRow || productRow.status !== ProductStatus.ACTIVE) {
      continue
    }
    items.push({
      productId: productRow.id,
      name: productRow.name,
      imageUrl: productRow.imageUrl,
      priceYuan: (productRow.price / 100).toFixed(2),
      totalUnits: row.totalUnits,
      orderCount: row.orderCount,
      splittable: productRow.splittable,
    })
  }
  return items
}

export async function bookPickupSlot(slotId: string) {
  const slot = await db.query.pickupSlot.findFirst({
    where: eq(pickupSlot.id, slotId),
  })
  if (!slot) {
    throw new Error('时段不存在')
  }
  if (slot.bookedCount >= slot.capacity) {
    throw new Error('该时段已满')
  }

  await db
    .update(pickupSlot)
    .set({ bookedCount: slot.bookedCount + 1 })
    .where(eq(pickupSlot.id, slotId))

  return slot
}

export async function listAvailablePickupSlots(locationId?: string) {
  const today = new Date().toISOString().slice(0, 10)
  const allSlots = await db.query.pickupSlot.findMany({
    with: { location: true },
    orderBy: [pickupSlot.slotDate, pickupSlot.startTime],
  })

  return allSlots
    .filter(
      (s) =>
        s.bookedCount < s.capacity &&
        s.slotDate >= today &&
        (!locationId || s.pickupLocationId === locationId),
    )
    .map((s) => ({
      id: s.id,
      locationId: s.pickupLocationId,
      locationName: s.location.name,
      slotDate: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      remaining: s.capacity - s.bookedCount,
      label: `${s.slotDate} ${s.startTime}-${s.endTime}`,
    }))
}
