import { NextRequest } from 'next/server'
import { subscribePriceAlert } from '@/lib/price-alert'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params
    const body = (await request.json()) as { targetPrice?: number }
    const alertId = await subscribePriceAlert({
      userId: user.id,
      productId: id,
      targetPrice: body.targetPrice,
    })
    return jsonOk({ alertId, message: '降价提醒已开启' })
  } catch (error) {
    return handleApiError(error)
  }
}
