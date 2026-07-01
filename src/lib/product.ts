import { count, eq } from 'drizzle-orm'
import { groupOrder, order, product } from '@/db/schema'
import { ProductStatus, type ProductStatus as ProductStatusType } from '@/db/enums'
import { db } from '@/lib/db'
import { normalizeImageUrl } from '@/lib/utils'

export interface ProductInput {
  name: string
  imageUrl: string
  price: number
  splittable: boolean
  totalUnits?: number | null
  unitLabel?: string | null
  description?: string | null
  status?: ProductStatusType
  sourceUrl?: string | null
  externalId?: string | null
}

export function serializeProduct(productRow: {
  id: string
  name: string
  imageUrl: string
  price: number
  splittable: boolean
  totalUnits: number | null
  unitLabel: string | null
  description: string | null
  status: ProductStatusType
  sourceUrl?: string | null
  externalId?: string | null
  lastSyncedAt?: Date | null
}) {
  return {
    id: productRow.id,
    name: productRow.name,
    imageUrl: normalizeImageUrl(productRow.imageUrl),
    price: productRow.price,
    priceYuan: (productRow.price / 100).toFixed(2),
    splittable: productRow.splittable,
    totalUnits: productRow.totalUnits,
    unitLabel: productRow.unitLabel,
    description: productRow.description,
    status: productRow.status,
    sourceUrl: productRow.sourceUrl ?? null,
    externalId: productRow.externalId ?? null,
    lastSyncedAt: productRow.lastSyncedAt?.toISOString() ?? null,
    unitPrice:
      productRow.splittable && productRow.totalUnits
        ? Math.round(productRow.price / productRow.totalUnits)
        : productRow.price,
  }
}

export async function deleteProduct(id: string) {
  const [productRow] = await db
    .select()
    .from(product)
    .where(eq(product.id, id))
    .limit(1)

  if (!productRow) {
    throw new Error('NOT_FOUND')
  }

  const [orderCountRow] = await db
    .select({ count: count() })
    .from(order)
    .where(eq(order.productId, id))
  const [groupOrderCountRow] = await db
    .select({ count: count() })
    .from(groupOrder)
    .where(eq(groupOrder.productId, id))

  const hasReferences =
    (orderCountRow?.count ?? 0) > 0 || (groupOrderCountRow?.count ?? 0) > 0

  if (hasReferences) {
    await db
      .update(product)
      .set({ status: ProductStatus.INACTIVE })
      .where(eq(product.id, id))
    return { id, mode: 'deactivated' as const }
  }

  await db.delete(product).where(eq(product.id, id))
  return { id, mode: 'deleted' as const }
}

export function validateProductInput(input: ProductInput) {
  if (!input.name?.trim()) {
    throw new Error('商品名称不能为空')
  }
  if (!input.imageUrl?.trim()) {
    throw new Error('商品图片不能为空')
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error('商品价格无效')
  }
  if (input.splittable) {
    if (!input.totalUnits || input.totalUnits <= 1) {
      throw new Error('可拆分商品总份数必须大于 1')
    }
    if (!input.unitLabel?.trim()) {
      throw new Error('可拆分商品需要填写单位')
    }
  }
}
