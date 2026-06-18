import crypto from 'crypto'

interface MiniPayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA'
  paySign: string
}

interface CreatePaymentInput {
  description: string
  outTradeNo: string
  amount: number
  openid: string
  notifyUrl?: string
}

function isWxPayConfigured() {
  return Boolean(
    process.env.WECHAT_MCH_ID &&
      process.env.WECHAT_MCH_SERIAL_NO &&
      process.env.WECHAT_MCH_PRIVATE_KEY &&
      process.env.WECHAT_API_V3_KEY &&
      process.env.WECHAT_APP_ID,
  )
}

function getPrivateKey() {
  return (process.env.WECHAT_MCH_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
}

function signMessage(message: string) {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()
  return signer.sign(getPrivateKey(), 'base64')
}

function buildAuthorization(method: string, urlPath: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`
  const signature = signMessage(message)

  return {
    authorization:
      `WECHATPAY2-SHA256-RSA2048 mchid="${process.env.WECHAT_MCH_ID}",` +
      `nonce_str="${nonceStr}",timestamp="${timestamp}",` +
      `serial_no="${process.env.WECHAT_MCH_SERIAL_NO}",signature="${signature}"`,
    timestamp,
    nonceStr,
  }
}

export async function createJsapiPayment(
  input: CreatePaymentInput,
): Promise<MiniPayParams> {
  if (!isWxPayConfigured()) {
    return createMockPayment(input.outTradeNo)
  }

  const notifyUrl =
    input.notifyUrl ??
    process.env.WECHAT_NOTIFY_URL ??
    process.env.WECHAT_MCH_NOTIFY_URL
  if (!notifyUrl) {
    throw new Error('WECHAT_NOTIFY_URL is not configured')
  }

  const payload = {
    appid: process.env.WECHAT_APP_ID,
    mchid: process.env.WECHAT_MCH_ID,
    description: input.description,
    out_trade_no: input.outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: input.amount,
      currency: 'CNY',
    },
    payer: {
      openid: input.openid,
    },
  }

  const body = JSON.stringify(payload)
  const urlPath = '/v3/pay/transactions/jsapi'
  const { authorization } = buildAuthorization('POST', urlPath, body)

  const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  })

  const data = (await response.json()) as { prepay_id?: string; message?: string }
  if (!response.ok || !data.prepay_id) {
    throw new Error(data.message ?? '微信支付下单失败')
  }

  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const packageValue = `prepay_id=${data.prepay_id}`
  const payMessage =
    `${process.env.WECHAT_APP_ID}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`

  return {
    appId: process.env.WECHAT_APP_ID ?? '',
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: signMessage(payMessage),
  }
}

function createMockPayment(outTradeNo: string): MiniPayParams {
  return {
    appId: process.env.WECHAT_APP_ID ?? 'mock_app_id',
    timeStamp: Math.floor(Date.now() / 1000).toString(),
    nonceStr: crypto.randomBytes(8).toString('hex'),
    package: `prepay_id=mock_${outTradeNo}`,
    signType: 'RSA',
    paySign: 'mock_pay_sign',
  }
}

export async function refundOrder(params: {
  outTradeNo: string
  amount: number
  reason: string
}) {
  if (!isWxPayConfigured()) {
    console.info('[wxpay] mock refund', params.outTradeNo)
    return { status: 'SUCCESS' }
  }

  const payload = {
    out_trade_no: params.outTradeNo,
    out_refund_no: `RF${params.outTradeNo}`,
    reason: params.reason,
    amount: {
      refund: params.amount,
      total: params.amount,
      currency: 'CNY',
    },
  }

  const body = JSON.stringify(payload)
  const urlPath = '/v3/refund/domestic/refunds'
  const { authorization } = buildAuthorization('POST', urlPath, body)

  const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message ?? '退款失败')
  }

  return response.json()
}

export async function confirmMockPayment(outTradeNo: string) {
  if (isWxPayConfigured()) {
    throw new Error('生产环境请使用真实支付')
  }

  const { confirmMergePayment } = await import('@/lib/merge-pay')
  return confirmMergePayment(outTradeNo, `mock_txn_${Date.now()}`)
}

export function isDevPaymentMode() {
  return !isWxPayConfigured()
}
