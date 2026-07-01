import { NextRequest } from 'next/server'
import { buildReorderItems } from '@/lib/reorder'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params
    const item = await buildReorderItems(id, user.id)
    return jsonOk({ item })
  } catch (error) {
    return handleApiError(error)
  }
}
