import type { Page } from '@playwright/test'

const TOKEN_KEY = 'sam_shop_token'
const USER_KEY = 'sam_shop_user'
const CART_KEY = 'sam_shop_cart'

export async function clearShopSession(page: Page) {
  await page.goto('/shop')
  await page.evaluate(
    ([tokenKey, userKey, cartKey]) => {
      localStorage.removeItem(tokenKey)
      localStorage.removeItem(userKey)
      localStorage.removeItem(cartKey)
    },
    [TOKEN_KEY, USER_KEY, CART_KEY] as const,
  )
}

export async function clearCart(page: Page) {
  await page.evaluate((cartKey) => {
    localStorage.removeItem(cartKey)
  }, CART_KEY)
}

export async function loginWithDevMode(page: Page) {
  await page.goto('/shop/login')
  await Promise.all([
    page.waitForURL('**/shop/profile', { waitUntil: 'commit' }),
    page.getByTestId('dev-login-button').click(),
  ])
}

export async function getShopToken(page: Page) {
  return page.evaluate((tokenKey) => localStorage.getItem(tokenKey), TOKEN_KEY)
}
