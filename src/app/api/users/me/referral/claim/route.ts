import { NextRequest } from 'next/server'
import { recordReferralOnSignup } from '@/lib/referral'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as { code?: string }

    if (!body.code?.trim()) {
      return jsonError('缺少邀请码')
    }

    const invite = await recordReferralOnSignup(user.id, body.code.trim())
    if (!invite) {
      return jsonError('邀请码无效或已使用过邀请')
    }

    return jsonOk({ message: '邀请关系已记录' })
  } catch (error) {
    return handleApiError(error)
  }
}
