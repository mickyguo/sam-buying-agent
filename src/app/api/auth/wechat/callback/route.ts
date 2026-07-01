import { NextRequest, NextResponse } from 'next/server'
import { user } from '@/db/schema'
import { db } from '@/lib/db'
import { signToken } from '@/lib/shop-auth'
import { shopUserDefaults } from '@/lib/shop-user'
import { getAppBaseUrl, oauth2AccessToken } from '@/lib/wechat'

export async function GET(request: NextRequest) {
  const baseUrl = getAppBaseUrl(request)

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirect = searchParams.get('state') ?? '/shop/login'

    if (!code) {
      return NextResponse.redirect(`${baseUrl}${redirect}?error=missing_code`)
    }

    const session = await oauth2AccessToken(code)
    const openid = session.openid!
    const [userRow] = await db
      .insert(user)
      .values(shopUserDefaults(openid))
      .onConflictDoUpdate({
        target: user.openid,
        set: { updatedAt: new Date() },
      })
      .returning()

    const token = signToken({ userId: userRow.id, openid: userRow.openid! })
    const userPayload = encodeURIComponent(
      JSON.stringify({
        id: userRow.id,
        nickname: userRow.nickname,
        avatarUrl: userRow.avatarUrl,
        phone: userRow.phone,
      }),
    )

    const target = new URL(redirect, baseUrl)
    target.searchParams.set('token', token)
    target.searchParams.set('user', userPayload)

    return NextResponse.redirect(target.toString())
  } catch {
    return NextResponse.redirect(`${baseUrl}/shop/login?error=oauth_failed`)
  }
}
