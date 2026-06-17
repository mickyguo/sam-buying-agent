import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { joinGroupOrder } from '@/lib/group-order'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params
    const body = (await request.json()) as {
      units?: number
      checkoutBatchId?: string
    }

    if (!body.units) {
      return jsonError('缺少份数')
    }

    const result = await joinGroupOrder({
      userId: user.id,
      groupOrderId: id,
      units: body.units,
      checkoutBatchId: body.checkoutBatchId,
    })

    return jsonOk({
      groupOrderId: result.groupOrder.id,
      orderId: result.order.id,
      amount: result.amount,
      outTradeNo: result.order.wxOutTradeNo,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
