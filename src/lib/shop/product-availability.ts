export type ProductAvailability = 'available' | 'inactive' | 'missing'

export function getProductAvailabilityLabel(
  availability: ProductAvailability,
): string | null {
  if (availability === 'inactive') {
    return '商品已下架'
  }
  if (availability === 'missing') {
    return '商品不存在'
  }
  return null
}

export function isProductUnavailable(
  availability: ProductAvailability | undefined,
): boolean {
  return availability !== undefined && availability !== 'available'
}

export async function fetchProductAvailability(
  productId: string,
): Promise<ProductAvailability> {
  try {
    const response = await fetch(`/api/products/${productId}`)
    const result = (await response.json()) as {
      success: boolean
      data?: { status: string }
    }
    if (!response.ok || !result.success || !result.data) {
      return 'missing'
    }
    if (result.data.status !== 'ACTIVE') {
      return 'inactive'
    }
    return 'available'
  } catch {
    return 'missing'
  }
}

export async function fetchProductAvailabilityMap(
  productIds: string[],
): Promise<Record<string, ProductAvailability>> {
  const uniqueIds = [...new Set(productIds)]
  const entries = await Promise.all(
    uniqueIds.map(
      async (id) => [id, await fetchProductAvailability(id)] as const,
    ),
  )
  return Object.fromEntries(entries)
}
