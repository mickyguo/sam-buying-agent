import { ProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface ProductInput {
  name: string
  imageUrl: string
  price: number
  splittable: boolean
  totalUnits?: number | null
  unitLabel?: string | null
  description?: string | null
  status?: ProductStatus
  sourceUrl?: string | null
  externalId?: string | null
}

export function serializeProduct(product: {
  id: string
  name: string
  imageUrl: string
  price: number
  splittable: boolean
  totalUnits: number | null
  unitLabel: string | null
  description: string | null
  status: ProductStatus
  sourceUrl?: string | null
  externalId?: string | null
  lastSyncedAt?: Date | null
}) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    priceYuan: (product.price / 100).toFixed(2),
    splittable: product.splittable,
    totalUnits: product.totalUnits,
    unitLabel: product.unitLabel,
    description: product.description,
    status: product.status,
    sourceUrl: product.sourceUrl ?? null,
    externalId: product.externalId ?? null,
    lastSyncedAt: product.lastSyncedAt?.toISOString() ?? null,
    unitPrice:
      product.splittable && product.totalUnits
        ? Math.round(product.price / product.totalUnits)
        : product.price,
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: { orders: true, groupOrders: true },
      },
    },
  })

  if (!product) {
    throw new Error('NOT_FOUND')
  }

  const hasReferences =
    product._count.orders > 0 || product._count.groupOrders > 0

  if (hasReferences) {
    await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
    })
    return { id, mode: 'deactivated' as const }
  }

  await prisma.product.delete({ where: { id } })
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
