import { NextRequest } from 'next/server'
import { getFrequentItems } from '@/lib/reorder'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const items = await getFrequentItems(user.id)
    return jsonOk(items)
  } catch (error) {
    return handleApiError(error)
  }
}
