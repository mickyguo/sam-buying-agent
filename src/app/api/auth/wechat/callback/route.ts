import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/shop-auth'
import { shopUserDefaults } from '@/lib/shop-user'
import { getAppBaseUrl, oauth2AccessToken } from '@/lib/wechat'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirect = searchParams.get('state') ?? '/shop/profile'

    if (!code) {
      return NextResponse.redirect(`${getAppBaseUrl()}${redirect}?error=missing_code`)
    }

    const session = await oauth2AccessToken(code)
    const openid = session.openid!
    const user = await prisma.user.upsert({
      where: { openid },
      update: {},
      create: shopUserDefaults(openid),
    })

    const token = signToken({ userId: user.id, openid: user.openid! })
    const userPayload = encodeURIComponent(
      JSON.stringify({
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      }),
    )

    const target = new URL(redirect, getAppBaseUrl())
    target.searchParams.set('token', token)
    target.searchParams.set('user', userPayload)

    return NextResponse.redirect(target.toString())
  } catch {
    return NextResponse.redirect(`${getAppBaseUrl()}/shop/profile?error=oauth_failed`)
  }
}
