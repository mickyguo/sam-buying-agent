import { NextRequest } from 'next/server'
import { matchWishPost } from '@/lib/wish-wall'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request)
    const { id } = await context.params
    const result = await matchWishPost(id, user.id)
    return jsonOk(result)
  } catch (error) {
    return handleApiError(error)
  }
}
