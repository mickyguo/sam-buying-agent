import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { product, productImportRequest } from '@/db/schema'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { sendSubscribeMessage } from '@/lib/wechat'

function checkAdmin(request: NextRequest) {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const requests = await db.query.productImportRequest.findMany({
      where: eq(productImportRequest.status, 'PENDING'),
      with: { user: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    })
    return jsonOk(requests)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const body = (await request.json()) as {
      id?: string
      status?: 'APPROVED' | 'REJECTED'
      productId?: string
      adminNote?: string
    }

    if (!body.id || !body.status) {
      return jsonError('缺少参数')
    }

    const req = await db.query.productImportRequest.findFirst({
      where: eq(productImportRequest.id, body.id),
      with: { user: true },
    })
    if (!req) {
      return jsonError('请求不存在', 404)
    }

    await db
      .update(productImportRequest)
      .set({
        status: body.status,
        productId: body.productId,
        adminNote: body.adminNote,
      })
      .where(eq(productImportRequest.id, body.id))

    if (body.status === 'APPROVED' && body.productId && req.user.openid) {
      const productRow = await db.query.product.findFirst({
        where: eq(product.id, body.productId),
      })
      if (productRow) {
        await sendSubscribeMessage({
          openid: req.user.openid,
          templateId: 'product_available',
          page: `/shop/products/${body.productId}`,
          data: {
            thing1: { value: productRow.name.slice(0, 20) },
            phrase2: { value: '已上架' },
          },
        }).catch(() => undefined)
      }
    }

    return jsonOk({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
