import { expect, test } from '@playwright/test'
import { clearCart, clearShopSession, loginWithDevMode } from '../helpers/auth'

test('购物车为空态', async ({ page }) => {
  await clearShopSession(page)
  await loginWithDevMode(page)
  await clearCart(page)

  await page.goto('/shop/cart')
  await expect(page.getByText('购物车是空的')).toBeVisible()
  await expect(page.getByRole('link', { name: '去逛逛' })).toBeVisible()
})
