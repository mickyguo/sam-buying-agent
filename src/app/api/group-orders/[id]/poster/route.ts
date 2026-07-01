import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { groupOrder } from '@/db/schema'
import { db } from '@/lib/db'
import { handleApiError, jsonError } from '@/lib/api-response'
import { generateGroupPosterSvg } from '@/lib/poster'
import { getRequestOrigin } from '@/lib/request-origin'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const group = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, id),
      with: { product: true },
    })

    if (!group) {
      return jsonError('拼单不存在', 404)
    }

    const committed = group.filledUnits + group.reservedUnits
    const remaining = group.totalUnits - committed
    const origin = getRequestOrigin(request)
    const svg = await generateGroupPosterSvg({
      productName: group.product.name,
      productImageUrl: group.product.imageUrl,
      committedUnits: committed,
      totalUnits: group.totalUnits,
      unitLabel: group.product.unitLabel ?? '份',
      remainingUnits: Math.max(0, remaining),
      groupUrl: `${origin}/shop/groups/${group.id}`,
    })

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
