import { NextRequest } from 'next/server'
import { productImportRequest } from '@/db/schema'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as { sourceUrl?: string }

    if (!body.sourceUrl?.trim()) {
      return jsonError('请粘贴山姆商品链接')
    }

    const [row] = await db
      .insert(productImportRequest)
      .values({
        userId: user.id,
        sourceUrl: body.sourceUrl.trim(),
      })
      .returning()

    return jsonOk({ id: row.id, message: '已提交，审核通过后将上架通知您' }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
