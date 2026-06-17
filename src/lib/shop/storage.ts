const TOKEN_KEY = 'sam_shop_token'
const USER_KEY = 'sam_shop_user'

export function getShopToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(TOKEN_KEY)
}

export function setShopSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getShopUser<T>() {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  return JSON.parse(raw) as T
}

export function clearShopSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
