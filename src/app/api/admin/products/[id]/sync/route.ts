import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { verifyAdminPassword } from '@/lib/admin'
import { prisma } from '@/lib/db'
import { serializeProduct } from '@/lib/product'
import { syncSamsProductByExternalId } from '@/lib/sams/import'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!verifyAdminPassword(request)) {
      return jsonError('管理员密码错误', 403)
    }

    const { id } = await context.params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return jsonError('商品不存在', 404)
    }
    if (!product.externalId) {
      return jsonError('该商品没有关联的山姆 ID，无法同步', 400)
    }

    const synced = await syncSamsProductByExternalId(
      product.externalId,
      product.sourceUrl,
    )

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: synced.name,
        imageUrl: synced.imageUrl,
        price: synced.priceCents,
        description: synced.description ?? product.description,
        lastSyncedAt: new Date(),
      },
    })

    return jsonOk(serializeProduct(updated))
  } catch (error) {
    return handleApiError(error)
  }
}
