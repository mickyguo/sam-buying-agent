import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { order, priceAlert, priceHistory, product } from '@/db/schema'
import { OrderStatus, ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { notifySubscribedUsers } from '@/lib/pickup'

export async function getProductPriceHistory(productId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const history = await db.query.priceHistory.findMany({
    where: and(
      eq(priceHistory.productId, productId),
      gt(priceHistory.recordedAt, since),
    ),
    orderBy: desc(priceHistory.recordedAt),
  })

  const [productRow] = await db
    .select()
    .from(product)
    .where(eq(product.id, productId))
    .limit(1)

  const prices = history.map((h) => h.price)
  const minPrice = prices.length > 0 ? Math.min(...prices) : productRow?.price

  return {
    currentPrice: productRow?.price ?? 0,
    currentPriceYuan: productRow ? (productRow.price / 100).toFixed(2) : '0',
    minPrice30d: minPrice ?? null,
    minPrice30dYuan: minPrice ? (minPrice / 100).toFixed(2) : null,
    isLowest: productRow && minPrice ? productRow.price <= minPrice : false,
    history: history.map((h) => ({
      price: h.price,
      priceYuan: (h.price / 100).toFixed(2),
      recordedAt: h.recordedAt.toISOString(),
    })),
  }
}

export async function subscribePriceAlert(params: {
  userId: string
  productId: string
  targetPrice?: number
}) {
  const existing = await db.query.priceAlert.findFirst({
    where: and(
      eq(priceAlert.userId, params.userId),
      eq(priceAlert.productId, params.productId),
    ),
  })

  if (existing) {
    await db
      .update(priceAlert)
      .set({ active: true, targetPrice: params.targetPrice ?? null })
      .where(eq(priceAlert.id, existing.id))
    return existing.id
  }

  const [row] = await db
    .insert(priceAlert)
    .values({
      userId: params.userId,
      productId: params.productId,
      targetPrice: params.targetPrice,
    })
    .returning()

  return row.id
}

export async function notifyPriceDrop(productId: string, oldPrice: number, newPrice: number) {
  if (newPrice >= oldPrice) {
    return
  }

  const [productRow] = await db
    .select()
    .from(product)
    .where(eq(product.id, productId))
    .limit(1)
  if (!productRow) {
    return
  }

  const alerts = await db.query.priceAlert.findMany({
    where: and(eq(priceAlert.productId, productId), eq(priceAlert.active, true)),
    with: { user: true },
  })

  const dropYuan = ((oldPrice - newPrice) / 100).toFixed(2)

  for (const alert of alerts) {
    if (alert.targetPrice && newPrice > alert.targetPrice) {
      continue
    }
    if (!alert.user.openid) {
      continue
    }
    const { sendSubscribeMessage } = await import('@/lib/wechat')
    await sendSubscribeMessage({
      openid: alert.user.openid,
      templateId: 'price_drop',
      page: `/shop/products/${productId}`,
      data: {
        thing1: { value: productRow.name.slice(0, 20) },
        amount2: { value: `¥${(newPrice / 100).toFixed(2)}` },
        thing3: { value: `降价¥${dropYuan}` },
      },
    }).catch(() => undefined)
  }

  await notifySubscribedUsers('price_drop', `/shop/products/${productId}`, {
    thing1: { value: productRow.name.slice(0, 20) },
    amount2: { value: `¥${(newPrice / 100).toFixed(2)}` },
    thing3: { value: `降价¥${dropYuan}` },
  }).catch(() => undefined)
}

export async function recordInitialPrice(productId: string, price: number) {
  await db.insert(priceHistory).values({ productId, price })
}
