import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import {
  deleteProduct,
  serializeProduct,
  validateProductInput,
  type ProductInput,
} from '@/lib/product'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return jsonError('商品不存在', 404)
    }
    return jsonOk(serializeProduct(product))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const { id } = await context.params
    const body = (await request.json()) as ProductInput
    validateProductInput(body)

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name.trim(),
        imageUrl: body.imageUrl.trim(),
        price: body.price,
        splittable: body.splittable,
        totalUnits: body.splittable ? body.totalUnits : null,
        unitLabel: body.splittable ? body.unitLabel?.trim() : null,
        description: body.description?.trim() ?? null,
        status: body.status,
      },
    })

    return jsonOk(serializeProduct(product))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const { id } = await context.params
    const result = await deleteProduct(id)
    return jsonOk(result)
  } catch (error) {
    return handleApiError(error)
  }
}
