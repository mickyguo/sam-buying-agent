import { NextRequest } from 'next/server'
import { createWishPost, listWishWall } from '@/lib/wish-wall'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function GET() {
  try {
    const posts = await listWishWall()
    return jsonOk(posts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as {
      productId?: string
      wantUnits?: number
      maxWaitHours?: number
      note?: string
      pickupLocationId?: string
    }

    if (!body.productId || !body.wantUnits) {
      return jsonError('缺少商品或份数')
    }

    const result = await createWishPost({
      userId: user.id,
      productId: body.productId,
      wantUnits: body.wantUnits,
      maxWaitHours: body.maxWaitHours,
      note: body.note,
      pickupLocationId: body.pickupLocationId,
    })

    return jsonOk(result)
  } catch (error) {
    return handleApiError(error)
  }
}
