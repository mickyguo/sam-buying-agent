import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { priceHistory, product } from '@/db/schema'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { verifyAdminPassword } from '@/lib/admin'
import { db } from '@/lib/db'
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
    const productRow = await db.query.product.findFirst({
      where: eq(product.id, id),
    })
    if (!productRow) {
      return jsonError('商品不存在', 404)
    }
    if (!productRow.externalId) {
      return jsonError('该商品没有关联的山姆 ID，无法同步', 400)
    }

    const synced = await syncSamsProductByExternalId(
      productRow.externalId,
      productRow.sourceUrl,
    )

    const [updated] = await db
      .update(product)
      .set({
        name: synced.name,
        imageUrl: synced.imageUrl,
        price: synced.priceCents,
        description: synced.description ?? productRow.description,
        lastSyncedAt: new Date(),
      })
      .where(eq(product.id, id))
      .returning()

    if (updated.price !== productRow.price) {
      await db.insert(priceHistory).values({
        productId: updated.id,
        price: updated.price,
      })
      const { notifyPriceDrop } = await import('@/lib/price-alert')
      await notifyPriceDrop(updated.id, productRow.price, updated.price)
    }

    return jsonOk(serializeProduct(updated))
  } catch (error) {
    return handleApiError(error)
  }
}
