import { and, eq, inArray } from 'drizzle-orm'
import { order, payBatch, product } from '@/db/schema'
import { OrderStatus, ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { markOrderPaid } from '@/lib/group-order'
import { generateOrderNo } from '@/lib/utils'
import {
  createJsapiPayment,
  isDevPaymentMode,
} from '@/lib/wxpay'

function generateMergeOutTradeNo() {
  return `MG${generateOrderNo().slice(3)}`
}

export async function createMergePayment(params: {
  userId: string
  openid: string
  orderIds: string[]
}) {
  const uniqueOrderIds = [...new Set(params.orderIds)]
  if (uniqueOrderIds.length === 0) {
    throw new Error('请选择要支付的订单')
  }

  const orders = await db.query.order.findMany({
    where: and(
      inArray(order.id, uniqueOrderIds),
      eq(order.userId, params.userId),
    ),
    with: { product: true },
  })

  if (orders.length !== uniqueOrderIds.length) {
    throw new Error('部分订单不存在')
  }

  for (const orderRow of orders) {
    if (orderRow.status !== OrderStatus.PENDING_PAY) {
      throw new Error(`订单 ${orderRow.orderNo} 状态不可支付`)
    }
    if (orderRow.product.status !== ProductStatus.ACTIVE) {
      throw new Error(`订单 ${orderRow.orderNo} 的商品已下架`)
    }
  }

  if (uniqueOrderIds.length === 1) {
    const orderRow = orders[0]
    const payment = await createJsapiPayment({
      description: orderRow.product.name,
      outTradeNo: orderRow.wxOutTradeNo ?? orderRow.orderNo,
      amount: orderRow.amount,
      openid: params.openid,
    })

    return {
      orderIds: uniqueOrderIds,
      outTradeNo: orderRow.wxOutTradeNo ?? orderRow.orderNo,
      amount: orderRow.amount,
      devMode: isDevPaymentMode(),
      payment,
    }
  }

  const totalAmount = orders.reduce((sum, orderRow) => sum + orderRow.amount, 0)
  const outTradeNo = generateMergeOutTradeNo()
  const description =
    orders.length <= 2
      ? orders.map((orderRow) => orderRow.product.name).join('、')
      : `${orders[0].product.name}等${orders.length}笔订单`

  await db.insert(payBatch).values({
    outTradeNo,
    userId: params.userId,
    orderIds: uniqueOrderIds,
    totalAmount,
  })

  const payment = await createJsapiPayment({
    description,
    outTradeNo,
    amount: totalAmount,
    openid: params.openid,
  })

  return {
    orderIds: uniqueOrderIds,
    outTradeNo,
    amount: totalAmount,
    devMode: isDevPaymentMode(),
    payment,
  }
}

export async function confirmMergePayment(
  outTradeNo: string,
  wxPayTxnId?: string,
) {
  const batch = await db.query.payBatch.findFirst({
    where: eq(payBatch.outTradeNo, outTradeNo),
  })

  if (batch) {
    for (const orderId of batch.orderIds) {
      await markOrderPaid(orderId, wxPayTxnId)
    }
    await db.delete(payBatch).where(eq(payBatch.id, batch.id))
    return { orderIds: batch.orderIds, batch: true }
  }

  const orderRow = await db.query.order.findFirst({
    where: eq(order.wxOutTradeNo, outTradeNo),
  })

  if (!orderRow) {
    throw new Error('支付记录不存在')
  }

  const paidOrder = await markOrderPaid(orderRow.id, wxPayTxnId)
  return { orderIds: [paidOrder.id], batch: false }
}
