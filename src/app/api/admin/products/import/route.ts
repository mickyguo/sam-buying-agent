import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { verifyAdminPassword } from '@/lib/admin'
import { importSamsProductFromUrl } from '@/lib/sams/import'

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return jsonError('管理员密码错误', 403)
    }

    const body = (await request.json()) as { url?: string }
    if (!body.url?.trim()) {
      return jsonError('请提供山姆商品链接', 400)
    }

    const preview = await importSamsProductFromUrl(body.url.trim())
    return jsonOk(preview)
  } catch (error) {
    return handleApiError(error)
  }
}
