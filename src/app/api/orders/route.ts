import { NextRequest } from 'next/server'
import { OrderStatus, OrderType, ProductStatus } from '@/generated/prisma/client'
import { requireAuthUser } from '@/lib/shop-auth'
import { prisma } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { generateOrderNo } from '@/lib/utils'

function serializeOrder(order: {
  id: string
  orderNo: string
  type: OrderType
  units: number
  amount: number
  status: OrderStatus
  groupOrderId: string | null
  checkoutBatchId: string | null
  createdAt: Date
  paidAt: Date | null
  product: {
    id: string
    name: string
    imageUrl: string
    unitLabel: string | null
    splittable: boolean
    status: ProductStatus
  }
}) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    type: order.type,
    units: order.units,
    amount: order.amount,
    amountYuan: (order.amount / 100).toFixed(2),
    status: order.status,
    groupOrderId: order.groupOrderId,
    checkoutBatchId: order.checkoutBatchId,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    product: {
      id: order.product.id,
      name: order.product.name,
      imageUrl: order.product.imageUrl,
      unitLabel: order.product.unitLabel,
      splittable: order.product.splittable,
      status: order.product.status,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })

    return jsonOk(orders.map(serializeOrder))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as {
      productId?: string
      checkoutBatchId?: string
    }

    if (!body.productId) {
      return jsonError('缺少商品 ID')
    }

    const product = await prisma.product.findUnique({
      where: { id: body.productId },
    })

    if (!product || product.status !== ProductStatus.ACTIVE) {
      return jsonError('商品不存在或已下架', 404)
    }
    if (product.splittable) {
      return jsonError('可拆分商品请使用拼单功能')
    }

    const orderNo = generateOrderNo()
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: user.id,
        type: OrderType.DIRECT,
        productId: product.id,
        units: 1,
        amount: product.price,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: body.checkoutBatchId,
      },
      include: { product: true },
    })

    return jsonOk(
      {
        orderId: order.id,
        amount: order.amount,
        outTradeNo: order.wxOutTradeNo,
        order: serializeOrder(order),
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}
