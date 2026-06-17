import { NextRequest } from 'next/server'
import { ProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
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

    const products = await prisma.product.findMany({
      where: includeInactive ? undefined : { status: ProductStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
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
      const existing = await prisma.product.findUnique({
        where: { externalId: body.externalId },
      })
      if (existing) {
        return jsonError('该山姆商品已入库，请使用重新同步或编辑', 409)
      }
    }

    const product = await prisma.product.create({
      data: {
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
      },
    })

    return jsonOk(serializeProduct(product), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
