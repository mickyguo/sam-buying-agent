import { db } from '@/lib/db'
import { groupOrder, product } from '@/db/schema'

const PLACEHOLDER = 'esa-placeholder'

export async function listProductIdsForStaticExport(): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return [PLACEHOLDER]
  }

  try {
    const rows = await db.select({ id: product.id }).from(product)
    if (rows.length === 0) {
      return [PLACEHOLDER]
    }
    return rows.map((row) => row.id)
  } catch (error) {
    console.warn('[esa] 构建时无法读取商品列表，使用占位路径:', error)
    return [PLACEHOLDER]
  }
}

export async function listGroupIdsForStaticExport(): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return [PLACEHOLDER]
  }

  try {
    const rows = await db.select({ id: groupOrder.id }).from(groupOrder).limit(500)
    if (rows.length === 0) {
      return [PLACEHOLDER]
    }
    return rows.map((row) => row.id)
  } catch (error) {
    console.warn('[esa] 构建时无法读取拼单列表，使用占位路径:', error)
    return [PLACEHOLDER]
  }
}
