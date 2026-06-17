import { NextRequest } from 'next/server'
import { OrderStatus } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import {
  cancelExpiredPendingOrders,
  expireOpenGroupOrders,
} from '@/lib/group-order'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

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
  const stats = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  })

  return jsonOk({
    orders: stats,
    pendingPay: stats.find((item) => item.status === OrderStatus.PENDING_PAY)?._count ?? 0,
  })
}
