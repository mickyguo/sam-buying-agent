import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { groupOrder, order, product } from '@/db/schema'
import { GroupStatus, OrderStatus } from '@/db/enums'
import { db } from '@/lib/db'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export async function getAdminDashboardStats() {
  const today = startOfToday()

  const [todayPaid] = await db
    .select({
      gmv: sql<number>`coalesce(sum(${order.amount}), 0)`,
      orderCount: count(),
    })
    .from(order)
    .where(
      and(
        gte(order.paidAt, today),
        inArray(order.status, [
          OrderStatus.PAID,
          OrderStatus.PURCHASING,
          OrderStatus.DELIVERING,
          OrderStatus.COMPLETED,
        ]),
      ),
    )

  const [groupStats] = await db
    .select({
      total: count(),
      filled: sql<number>`count(*) filter (where ${groupOrder.status} in ('FILLED', 'PURCHASING', 'COMPLETED'))`,
    })
    .from(groupOrder)

  const pendingOrders = await db
    .select({ count: count() })
    .from(order)
    .where(
      inArray(order.status, [
        OrderStatus.PENDING_PAY,
        OrderStatus.PAID,
        OrderStatus.PURCHASING,
        OrderStatus.DELIVERING,
      ]),
    )

  const topProducts = await db
    .select({
      productId: order.productId,
      productName: product.name,
      totalAmount: sql<number>`coalesce(sum(${order.amount}), 0)`,
      orderCount: count(),
    })
    .from(order)
    .innerJoin(product, eq(order.productId, product.id))
    .where(
      inArray(order.status, [
        OrderStatus.PAID,
        OrderStatus.PURCHASING,
        OrderStatus.DELIVERING,
        OrderStatus.COMPLETED,
      ]),
    )
    .groupBy(order.productId, product.name)
    .orderBy(desc(sql`sum(${order.amount})`))
    .limit(5)

  const funnel = await db
    .select({
      status: groupOrder.status,
      count: count(),
    })
    .from(groupOrder)
    .groupBy(groupOrder.status)

  const fillRate =
    groupStats.total > 0
      ? Math.round((Number(groupStats.filled) / Number(groupStats.total)) * 100)
      : 0

  return {
    todayGmv: Number(todayPaid.gmv),
    todayGmvYuan: (Number(todayPaid.gmv) / 100).toFixed(2),
    todayOrderCount: Number(todayPaid.orderCount),
    groupFillRate: fillRate,
    totalGroups: Number(groupStats.total),
    filledGroups: Number(groupStats.filled),
    pendingOrderCount: Number(pendingOrders[0]?.count ?? 0),
    topProducts: topProducts.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      totalAmount: Number(row.totalAmount),
      totalAmountYuan: (Number(row.totalAmount) / 100).toFixed(2),
      orderCount: Number(row.orderCount),
    })),
    groupFunnel: funnel.map((row) => ({
      status: row.status,
      count: Number(row.count),
    })),
    openGroupCount: funnel.find((row) => row.status === GroupStatus.OPEN)?.count ?? 0,
  }
}
