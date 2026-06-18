import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl, getWechatOAuthUrl } from '@/lib/wechat'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const redirect = searchParams.get('redirect') ?? '/shop/profile'
    const baseUrl = getAppBaseUrl(request)
    const callbackUrl = `${baseUrl}/api/auth/wechat/callback`
    const oauthUrl = getWechatOAuthUrl(callbackUrl, redirect)
    return NextResponse.redirect(oauthUrl)
  } catch {
    return NextResponse.redirect('/shop/profile?error=oauth_config')
  }
}
