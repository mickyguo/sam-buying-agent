import { NextRequest } from 'next/server'
import { getOrCreateReferralCode, getReferralStats } from '@/lib/referral'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'
import { getRequestOrigin } from '@/lib/request-origin'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const stats = await getReferralStats(user.id)
    const origin = getRequestOrigin(request)
    return jsonOk({
      ...stats,
      shareUrl: `${origin}/shop?ref=${stats.code}`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const code = await getOrCreateReferralCode(user.id)
    return jsonOk({ code })
  } catch (error) {
    return handleApiError(error)
  }
}
