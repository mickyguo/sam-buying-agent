import { shopFetch } from '@/lib/shop/api'
import { clearShopSession, getShopToken, getShopUser, setShopSession } from '@/lib/shop/storage'
import type { ShopUser } from '@/lib/shop/types'

export async function loginWithCode(code: string) {
  const data = await shopFetch<{ token: string; user: ShopUser }>(
    '/api/auth/wechat',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ code }),
    },
  )

  setShopSession(data.token, data.user)
  return data.user
}

export async function devLogin() {
  const code = `h5_${Date.now()}`
  return loginWithCode(code)
}

export function getCurrentUser() {
  return getShopUser<ShopUser>()
}

export function isLoggedIn(): boolean {
  return Boolean(getShopToken() && getCurrentUser())
}

export function requireShopLogin(returnPath?: string): ShopUser {
  const user = getCurrentUser()
  if (user && getShopToken()) {
    return user
  }

  const redirect =
    returnPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/shop')

  if (typeof window !== 'undefined') {
    window.location.href = `/shop/profile?redirect=${encodeURIComponent(redirect)}`
  }

  throw new Error('请先登录')
}

export function logout() {
  clearShopSession()
}

export function startWechatOAuth(returnPath = '/shop/profile') {
  window.location.href = `/api/auth/wechat/oauth?redirect=${encodeURIComponent(returnPath)}`
}

export async function sendSmsCode(phone: string) {
  return shopFetch<{ devMode: boolean; message: string }>(
    '/api/auth/sms/send',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ phone }),
    },
  )
}

export async function loginWithSms(phone: string, code: string) {
  const data = await shopFetch<{ token: string; user: ShopUser }>(
    '/api/auth/sms/login',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ phone, code }),
    },
  )

  setShopSession(data.token, data.user)
  return data.user
}
