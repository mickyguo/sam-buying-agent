import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { getAdminDashboardStats } from '@/lib/admin-stats'

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const stats = await getAdminDashboardStats()
    return jsonOk(stats)
  } catch (error) {
    return handleApiError(error)
  }
}
