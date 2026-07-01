import { NextRequest } from 'next/server'
import { getProductPriceHistory } from '@/lib/price-alert'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const data = await getProductPriceHistory(id)
    return jsonOk(data)
  } catch (error) {
    return handleApiError(error)
  }
}
