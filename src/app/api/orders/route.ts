import { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { order, product } from '@/db/schema'
import { OrderStatus, OrderType, ProductStatus, type OrderStatus as OrderStatusType, type OrderType as OrderTypeType, type ProductStatus as ProductStatusType } from '@/db/enums'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { generateOrderNo } from '@/lib/utils'

function serializeOrder(orderRow: {
  id: string
  orderNo: string
  type: OrderTypeType
  units: number
  amount: number
  status: OrderStatusType
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
    status: ProductStatusType
  }
}) {
  return {
    id: orderRow.id,
    orderNo: orderRow.orderNo,
    type: orderRow.type,
    units: orderRow.units,
    amount: orderRow.amount,
    amountYuan: (orderRow.amount / 100).toFixed(2),
    status: orderRow.status,
    groupOrderId: orderRow.groupOrderId,
    checkoutBatchId: orderRow.checkoutBatchId,
    createdAt: orderRow.createdAt.toISOString(),
    paidAt: orderRow.paidAt?.toISOString() ?? null,
    product: {
      id: orderRow.product.id,
      name: orderRow.product.name,
      imageUrl: orderRow.product.imageUrl,
      unitLabel: orderRow.product.unitLabel,
      splittable: orderRow.product.splittable,
      status: orderRow.product.status,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const userRow = await requireAuthUser(request)
    const orders = await db.query.order.findMany({
      where: eq(order.userId, userRow.id),
      with: { product: true },
      orderBy: desc(order.createdAt),
    })

    return jsonOk(orders.map(serializeOrder))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRow = await requireAuthUser(request)
    const body = (await request.json()) as {
      productId?: string
      checkoutBatchId?: string
    }

    if (!body.productId) {
      return jsonError('缺少商品 ID')
    }

    const [productRow] = await db
      .select()
      .from(product)
      .where(eq(product.id, body.productId))
      .limit(1)

    if (!productRow || productRow.status !== ProductStatus.ACTIVE) {
      return jsonError('商品不存在或已下架', 404)
    }
    if (productRow.splittable) {
      return jsonError('可拆分商品请使用拼单功能')
    }

    const orderNo = generateOrderNo()
    const [orderRow] = await db
      .insert(order)
      .values({
        orderNo,
        userId: userRow.id,
        type: OrderType.DIRECT,
        productId: productRow.id,
        units: 1,
        amount: productRow.price,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: body.checkoutBatchId,
      })
      .returning()

    const orderWithProduct = await db.query.order.findFirst({
      where: eq(order.id, orderRow.id),
      with: { product: true },
    })

    if (!orderWithProduct) {
      return jsonError('订单创建失败', 500)
    }

    return jsonOk(
      {
        orderId: orderWithProduct.id,
        amount: orderWithProduct.amount,
        outTradeNo: orderWithProduct.wxOutTradeNo,
        order: serializeOrder(orderWithProduct),
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}
