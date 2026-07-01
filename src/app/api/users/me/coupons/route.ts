import { NextRequest } from 'next/server'
import { getUserAvailableCoupons } from '@/lib/coupon'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const coupons = await getUserAvailableCoupons(user.id)
    return jsonOk(coupons)
  } catch (error) {
    return handleApiError(error)
  }
}
