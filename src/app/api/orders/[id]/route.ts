import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { order } from '@/db/schema'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { getOrderTimeline } from '@/lib/order-timeline'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params

    const orderRow = await db.query.order.findFirst({
      where: eq(order.id, id),
      with: {
        product: true,
        purchaseProof: true,
      },
    })

    if (!orderRow || orderRow.userId !== user.id) {
      return jsonError('订单不存在', 404)
    }

    const timeline = await getOrderTimeline(id)

    return jsonOk({
      id: orderRow.id,
      orderNo: orderRow.orderNo,
      type: orderRow.type,
      units: orderRow.units,
      amount: orderRow.amount,
      amountYuan: (orderRow.amount / 100).toFixed(2),
      status: orderRow.status,
      groupOrderId: orderRow.groupOrderId,
      pickupCode: orderRow.pickupCode,
      createdAt: orderRow.createdAt.toISOString(),
      paidAt: orderRow.paidAt?.toISOString() ?? null,
      product: {
        id: orderRow.product.id,
        name: orderRow.product.name,
        imageUrl: orderRow.product.imageUrl,
        unitLabel: orderRow.product.unitLabel,
      },
      purchaseProof: orderRow.purchaseProof
        ? {
            imageUrl: orderRow.purchaseProof.imageUrl,
            note: orderRow.purchaseProof.note,
            createdAt: orderRow.purchaseProof.createdAt.toISOString(),
          }
        : null,
      timeline,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
