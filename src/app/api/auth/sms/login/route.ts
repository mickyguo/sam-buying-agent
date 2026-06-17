import { NextRequest } from 'next/server'
import { signToken } from '@/lib/shop-auth'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import {
  findOrCreateUserByPhone,
  serializeAuthUser,
  verifySmsCode,
} from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone?: string
      code?: string
    }

    if (!body.phone || !body.code) {
      return jsonError('请输入手机号和验证码')
    }

    await verifySmsCode(body.phone, body.code)
    const user = await findOrCreateUserByPhone(body.phone)
    const token = signToken({ userId: user.id, openid: user.openid! })

    return jsonOk({
      token,
      user: serializeAuthUser(user),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
