import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as {
      type?: 'group_filled' | 'group_expired'
    }

    return jsonOk({
      userId: user.id,
      type: body.type ?? 'group_filled',
      message: '订阅消息将在微信模板配置完成后发送',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
