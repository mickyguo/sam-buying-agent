import { expect, test } from '@playwright/test'
import {
  clearCart,
  clearShopSession,
  loginWithDevMode,
} from '../helpers/auth'
import { readE2eSeedState } from '../helpers/seed'

test('整件代购完整下单', async ({ page }) => {
  const { directProductId } = readE2eSeedState()

  await clearShopSession(page)
  await loginWithDevMode(page)
  await clearCart(page)

  await page.goto(`/shop/products/${directProductId}`)
  await page.getByTestId('add-to-cart-button').click()
  await expect(page.getByText('已加入购物车')).toBeVisible()

  await page.goto('/shop/cart')
  await page.getByTestId('submit-orders-button').click()
  await expect(page.getByText(/已提交 .* 笔订单/)).toBeVisible()

  await page.getByTestId('confirm-pay-button').click()
  await page.waitForURL('**/shop/orders')
  await expect(page.getByText('已支付')).toBeVisible()
})
