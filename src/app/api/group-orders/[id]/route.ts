import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { groupOrder } from '@/db/schema'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { serializeGroupOrder } from '@/lib/group-order'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const group = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, id),
      with: {
        product: true,
        participations: {
          with: { user: true },
        },
      },
    })

    if (!group) {
      return jsonError('拼单不存在', 404)
    }

    return jsonOk(serializeGroupOrder(group))
  } catch (error) {
    return handleApiError(error)
  }
}
