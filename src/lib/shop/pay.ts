import { shopFetch } from '@/lib/shop/api'
import { isLoggedIn, requireShopLogin } from '@/lib/shop/auth'

interface PayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        name: string,
        params: Record<string, string>,
        callback: (result: { err_msg: string }) => void,
      ) => void
    }
  }
}

function invokeWechatPay(payment: PayParams) {
  return new Promise<void>((resolve, reject) => {
    const pay = () => {
      window.WeixinJSBridge?.invoke(
        'getBrandWCPayRequest',
        {
          appId: payment.appId,
          timeStamp: payment.timeStamp,
          nonceStr: payment.nonceStr,
          package: payment.package,
          signType: payment.signType,
          paySign: payment.paySign,
        },
        (result) => {
          if (result.err_msg === 'get_brand_wcpay_request:ok') {
            resolve()
            return
          }
          reject(new Error(result.err_msg || '支付失败'))
        },
      )
    }

    if (typeof window.WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', pay, false)
      return
    }

    pay()
  })
}

async function requestPayment(orderIds: string[]) {
  const endpoint =
    orderIds.length > 1 ? '/api/pay/merge' : '/api/pay/create'
  const body =
    orderIds.length > 1
      ? JSON.stringify({ orderIds })
      : JSON.stringify({ orderId: orderIds[0] })

  const data = await shopFetch<{
    devMode: boolean
    outTradeNo: string
    payment: PayParams
  }>(endpoint, {
    method: 'POST',
    body,
  })

  if (data.devMode) {
    const confirmEndpoint =
      orderIds.length > 1 ? '/api/pay/merge' : '/api/pay/create'
    await shopFetch(confirmEndpoint, {
      method: 'PUT',
      body: JSON.stringify({ outTradeNo: data.outTradeNo }),
    })
    return
  }

  await invokeWechatPay(data.payment)
}

export async function payOrder(orderId: string) {
  return payOrders([orderId])
}

export async function payOrders(orderIds: string[]) {
  if (!isLoggedIn()) {
    requireShopLogin('/shop/orders')
    throw new Error('请先登录')
  }

  if (orderIds.length === 0) {
    throw new Error('请选择要支付的订单')
  }

  await requestPayment(orderIds)
}
