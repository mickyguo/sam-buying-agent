import { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { product } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { verifyAdminPassword } from '@/lib/admin'
import {
  serializeProduct,
  validateProductInput,
  type ProductInput,
} from '@/lib/product'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('all') === '1'

    if (includeInactive && !verifyAdminPassword(request)) {
      return jsonError('管理员密码错误', 403)
    }

    const products = await db.query.product.findMany({
      where: includeInactive ? undefined : eq(product.status, ProductStatus.ACTIVE),
      orderBy: desc(product.createdAt),
    })

    return jsonOk(products.map(serializeProduct))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return jsonError('管理员密码错误', 403)
    }

    const body = (await request.json()) as ProductInput
    validateProductInput(body)

    if (body.externalId) {
      const existing = await db.query.product.findFirst({
        where: eq(product.externalId, body.externalId),
      })
      if (existing) {
        return jsonError('该山姆商品已入库，请使用重新同步或编辑', 409)
      }
    }

    const [productRow] = await db
      .insert(product)
      .values({
        name: body.name.trim(),
        imageUrl: body.imageUrl.trim(),
        price: body.price,
        splittable: body.splittable,
        totalUnits: body.splittable ? body.totalUnits : null,
        unitLabel: body.splittable ? body.unitLabel?.trim() : null,
        description: body.description?.trim() ?? null,
        sourceUrl: body.sourceUrl?.trim() ?? null,
        externalId: body.externalId?.trim() ?? null,
        lastSyncedAt: body.externalId ? new Date() : null,
        status: body.status ?? ProductStatus.ACTIVE,
      })
      .returning()

    return jsonOk(serializeProduct(productRow), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
