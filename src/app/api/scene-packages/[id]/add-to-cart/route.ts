import { NextRequest } from 'next/server'
import { resolveScenePackageCartItems } from '@/lib/scene-package'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const items = await resolveScenePackageCartItems(id)
    if (items.length === 0) {
      return jsonError('套餐内无可用商品')
    }
    return jsonOk({ items })
  } catch (error) {
    return handleApiError(error)
  }
}
