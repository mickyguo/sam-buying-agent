import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { saveNotifySubscription } from '@/lib/pickup'

import { NOTIFY_TYPES } from '@/lib/wechat-subscribe'

const VALID_TYPES = NOTIFY_TYPES

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as {
      types?: string[]
      type?: string
    }

    if (!user.openid) {
      return jsonError('请使用微信登录后订阅通知', 400)
    }

    const types = body.types ?? (body.type ? [body.type] : ['group_filled', 'pickup_ready'])
    const validTypes = types.filter((type) =>
      (VALID_TYPES as readonly string[]).includes(type),
    )

    if (validTypes.length === 0) {
      return jsonError('无效的订阅类型')
    }

    const savedTypes = await saveNotifySubscription({
      userId: user.id,
      openid: user.openid,
      types: validTypes,
    })

    return jsonOk({
      userId: user.id,
      types: savedTypes,
      message: '订阅成功，到货和拼单结果将通过微信通知您',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
