import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import {
  listOpenGroupsForHome,
  listPendingMatchIntents,
  submitGroupMatchIntent,
} from '@/lib/group-match'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')

    if (scope === 'mine') {
      const user = await requireAuthUser(request)
      const intents = await listPendingMatchIntents(user.id)
      return jsonOk(intents)
    }

    const groups = await listOpenGroupsForHome()
    return jsonOk(groups)
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
    }

    if (!body.productId || !body.wantUnits) {
      return jsonError('缺少商品或份数')
    }

    const result = await submitGroupMatchIntent({
      userId: user.id,
      productId: body.productId,
      wantUnits: body.wantUnits,
      maxWaitHours: body.maxWaitHours,
    })

    return jsonOk(result, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
