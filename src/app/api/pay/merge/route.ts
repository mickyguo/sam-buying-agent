import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import {
  confirmMergePayment,
  createMergePayment,
} from '@/lib/merge-pay'
import { isDevPaymentMode } from '@/lib/wxpay'
import { getRequestOrigin } from '@/lib/request-origin'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as { orderIds?: string[] }

    if (!body.orderIds?.length) {
      return jsonError('缺少订单 ID')
    }

    if (!user.openid) {
      return jsonError('请先使用微信登录后再支付')
    }

    const notifyUrl = `${getRequestOrigin(request)}/api/pay/notify`
    const result = await createMergePayment({
      userId: user.id,
      openid: user.openid,
      orderIds: body.orderIds,
      notifyUrl: isDevPaymentMode() ? undefined : notifyUrl,
    })

    return jsonOk(result)
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
