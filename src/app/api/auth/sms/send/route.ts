import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { sendSmsCode } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { phone?: string }

    if (!body.phone) {
      return jsonError('请输入手机号')
    }

    const result = await sendSmsCode(body.phone)
    return jsonOk(result)
  } catch (error) {
    return handleApiError(error)
  }
}
