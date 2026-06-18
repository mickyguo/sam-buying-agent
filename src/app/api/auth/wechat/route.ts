import { NextRequest } from 'next/server'
import { user } from '@/db/schema'
import { db } from '@/lib/db'
import { signToken } from '@/lib/shop-auth'
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
    const [userRow] = await db
      .insert(user)
      .values(
        shopUserDefaults(openid, {
          nickname: body.nickname,
          avatarUrl: body.avatarUrl,
        }),
      )
      .onConflictDoUpdate({
        target: user.openid,
        set: {
          nickname: body.nickname,
          avatarUrl: body.avatarUrl,
          name: body.nickname ?? undefined,
          image: body.avatarUrl ?? undefined,
        },
      })
      .returning()

    const token = signToken({ userId: userRow.id, openid: userRow.openid! })

    return jsonOk({
      token,
      user: {
        id: userRow.id,
        nickname: userRow.nickname,
        avatarUrl: userRow.avatarUrl,
        phone: userRow.phone,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getAuthUser } = await import('@/lib/shop-auth')
    const userRow = await getAuthUser(request)
    if (!userRow) {
      return jsonError('请先登录', 401)
    }

    return jsonOk({
      id: userRow.id,
      nickname: userRow.nickname,
      avatarUrl: userRow.avatarUrl,
      phone: userRow.phone,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
