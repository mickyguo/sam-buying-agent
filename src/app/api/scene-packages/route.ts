import { handleApiError, jsonOk } from '@/lib/api-response'
import { listScenePackages } from '@/lib/scene-package'

export async function GET() {
  try {
    const packages = await listScenePackages()
    return jsonOk(packages)
  } catch (error) {
    return handleApiError(error)
  }
}
