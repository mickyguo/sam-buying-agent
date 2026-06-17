import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken, getAuthUser } from '@/lib/shop-auth'
import { shopUserDefaults } from '@/lib/shop-user'
import { code2Session } from '@/lib/wechat'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string
      nickname?: string
      avatarUrl?: string
    }

    if (!body.code) {
      return jsonError('缺少 code')
    }

    const session = await code2Session(body.code)
    const openid = session.openid!
    const user = await prisma.user.upsert({
      where: { openid },
      update: {
        nickname: body.nickname,
        avatarUrl: body.avatarUrl,
        name: body.nickname ?? undefined,
        image: body.avatarUrl ?? undefined,
      },
      create: shopUserDefaults(openid, {
        nickname: body.nickname,
        avatarUrl: body.avatarUrl,
      }),
    })

    const token = signToken({ userId: user.id, openid: user.openid! })

    return jsonOk({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getAuthUser } = await import('@/lib/shop-auth')
    const user = await getAuthUser(request)
    if (!user) {
      return jsonError('请先登录', 401)
    }

    return jsonOk({
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
