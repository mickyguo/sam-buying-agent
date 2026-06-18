import { NextRequest } from 'next/server'
import { count, eq } from 'drizzle-orm'
import { order } from '@/db/schema'
import { OrderStatus } from '@/db/enums'
import {
  cancelExpiredPendingOrders,
  expireOpenGroupOrders,
} from '@/lib/group-order'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret')
    if (
      process.env.CRON_SECRET &&
      cronSecret !== process.env.CRON_SECRET
    ) {
      return jsonError('无权限', 403)
    }

    const cancelledCount = await cancelExpiredPendingOrders()
    const expiredCount = await expireOpenGroupOrders()
    return jsonOk({ cancelledCount, expiredCount })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET() {
  const stats = await db
    .select({
      status: order.status,
      count: count(),
    })
    .from(order)
    .groupBy(order.status)

  return jsonOk({
    orders: stats,
    pendingPay:
      stats.find((item) => item.status === OrderStatus.PENDING_PAY)?.count ?? 0,
  })
}
