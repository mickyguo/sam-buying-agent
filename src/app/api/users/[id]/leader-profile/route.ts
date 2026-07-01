import { NextRequest } from 'next/server'
import { getLeaderProfile } from '@/lib/group-leader'
import { handleApiError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const profile = await getLeaderProfile(id)
    return jsonOk(profile)
  } catch (error) {
    return handleApiError(error)
  }
}
