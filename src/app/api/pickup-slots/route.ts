import { NextRequest } from 'next/server'
import { listAvailablePickupSlots } from '@/lib/reorder'
import { handleApiError, jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId') ?? undefined
    const slots = await listAvailablePickupSlots(locationId)
    return jsonOk(slots)
  } catch (error) {
    return handleApiError(error)
  }
}
