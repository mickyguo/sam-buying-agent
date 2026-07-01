import { NextRequest } from 'next/server'
import { getGroupForecast } from '@/lib/group-forecast'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const forecast = await getGroupForecast(id)
    return jsonOk(forecast)
  } catch (error) {
    return handleApiError(error)
  }
}
