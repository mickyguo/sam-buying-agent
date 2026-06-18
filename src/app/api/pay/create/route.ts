import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { order } from '@/db/schema'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { confirmMergePayment, createMergePayment } from '@/lib/merge-pay'
import { isDevPaymentMode } from '@/lib/wxpay'
import { getRequestOrigin } from '@/lib/request-origin'

export async function POST(request: NextRequest) {
  try {
    const userRow = await requireAuthUser(request)
    const body = (await request.json()) as { orderId?: string }

    if (!body.orderId) {
      return jsonError('缺少订单 ID')
    }

    const orderRow = await db.query.order.findFirst({
      where: and(eq(order.id, body.orderId), eq(order.userId, userRow.id)),
    })

    if (!orderRow) {
      return jsonError('订单不存在', 404)
    }

    if (!userRow.openid) {
      return jsonError('请先使用微信登录后再支付')
    }

    const notifyUrl = `${getRequestOrigin(request)}/api/pay/notify`
    const result = await createMergePayment({
      userId: userRow.id,
      openid: userRow.openid,
      orderIds: [body.orderId],
      notifyUrl: isDevPaymentMode() ? undefined : notifyUrl,
    })

    return jsonOk({
      orderId: body.orderId,
      orderIds: result.orderIds,
      outTradeNo: result.outTradeNo,
      amount: result.amount,
      devMode: result.devMode,
      payment: result.payment,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuthUser(request)
    const body = (await request.json()) as { outTradeNo?: string }

    if (!body.outTradeNo) {
      return jsonError('缺少 outTradeNo')
    }
    if (!isDevPaymentMode()) {
      return jsonError('仅开发模式可模拟支付', 403)
    }

    const result = await confirmMergePayment(
      body.outTradeNo,
      `mock_txn_${Date.now()}`,
    )
    return jsonOk(result)
  } catch (error) {
    return handleApiError(error)
  }
}
