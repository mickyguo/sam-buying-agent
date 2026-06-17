import { NextRequest, NextResponse } from 'next/server'
import { confirmMergePayment } from '@/lib/merge-pay'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      resource?: {
        ciphertext?: string
        nonce?: string
        associated_data?: string
      }
    }

    if (!body.resource?.ciphertext) {
      return NextResponse.json({ code: 'FAIL', message: 'invalid body' })
    }

    const apiV3Key = process.env.WECHAT_API_V3_KEY
    if (!apiV3Key) {
      return NextResponse.json({ code: 'SUCCESS', message: 'dev mode skip' })
    }

    const crypto = await import('crypto')
    const { ciphertext, nonce, associated_data: associatedData } = body.resource
    const key = Buffer.from(apiV3Key, 'utf8')
    const authTag = Buffer.from(ciphertext.slice(-32), 'base64')
    const data = Buffer.from(ciphertext.slice(0, -32), 'base64')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce!, 'utf8'))
    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, 'utf8'))
    }
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString('utf8')

    const payload = JSON.parse(decrypted) as {
      out_trade_no?: string
      transaction_id?: string
      trade_state?: string
    }

    if (payload.trade_state !== 'SUCCESS' || !payload.out_trade_no) {
      return NextResponse.json({ code: 'SUCCESS', message: 'ignored' })
    }

    try {
      await confirmMergePayment(
        payload.out_trade_no,
        payload.transaction_id,
      )
    } catch (error) {
      console.error('[pay notify] confirm failed', error)
    }

    return NextResponse.json({ code: 'SUCCESS', message: '成功' })
  } catch (error) {
    console.error('[pay notify]', error)
    return NextResponse.json({ code: 'FAIL', message: '处理失败' })
  }
}
