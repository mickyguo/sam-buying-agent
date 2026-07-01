import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { order } from '@/db/schema'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { handleApiError, jsonError } from '@/lib/api-response'
import { generateOrderShareCardSvg } from '@/lib/poster'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params

    const orderRow = await db.query.order.findFirst({
      where: eq(order.id, id),
      with: { product: true },
    })

    if (!orderRow || orderRow.userId !== user.id) {
      return jsonError('订单不存在', 404)
    }

    const svg = await generateOrderShareCardSvg({
      productName: orderRow.product.name,
      productImageUrl: orderRow.product.imageUrl,
    })

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
