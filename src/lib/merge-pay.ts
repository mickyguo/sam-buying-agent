import { OrderStatus, ProductStatus } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
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

  const orders = await prisma.order.findMany({
    where: {
      id: { in: uniqueOrderIds },
      userId: params.userId,
    },
    include: { product: true },
  })

  if (orders.length !== uniqueOrderIds.length) {
    throw new Error('部分订单不存在')
  }

  for (const order of orders) {
    if (order.status !== OrderStatus.PENDING_PAY) {
      throw new Error(`订单 ${order.orderNo} 状态不可支付`)
    }
    if (order.product.status !== ProductStatus.ACTIVE) {
      throw new Error(`订单 ${order.orderNo} 的商品已下架`)
    }
  }

  if (uniqueOrderIds.length === 1) {
    const order = orders[0]
    const payment = await createJsapiPayment({
      description: order.product.name,
      outTradeNo: order.wxOutTradeNo ?? order.orderNo,
      amount: order.amount,
      openid: params.openid,
    })

    return {
      orderIds: uniqueOrderIds,
      outTradeNo: order.wxOutTradeNo ?? order.orderNo,
      amount: order.amount,
      devMode: isDevPaymentMode(),
      payment,
    }
  }

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)
  const outTradeNo = generateMergeOutTradeNo()
  const description =
    orders.length <= 2
      ? orders.map((order) => order.product.name).join('、')
      : `${orders[0].product.name}等${orders.length}笔订单`

  await prisma.payBatch.create({
    data: {
      outTradeNo,
      userId: params.userId,
      orderIds: uniqueOrderIds,
      totalAmount,
    },
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
  const batch = await prisma.payBatch.findUnique({
    where: { outTradeNo },
  })

  if (batch) {
    for (const orderId of batch.orderIds) {
      await markOrderPaid(orderId, wxPayTxnId)
    }
    await prisma.payBatch.delete({ where: { id: batch.id } })
    return { orderIds: batch.orderIds, batch: true }
  }

  const order = await prisma.order.findUnique({
    where: { wxOutTradeNo: outTradeNo },
  })

  if (!order) {
    throw new Error('支付记录不存在')
  }

  const paidOrder = await markOrderPaid(order.id, wxPayTxnId)
  return { orderIds: [paidOrder.id], batch: false }
}
