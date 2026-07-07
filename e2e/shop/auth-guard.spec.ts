import { expect, test } from '@playwright/test'
import { clearShopSession } from '../helpers/auth'
import { readE2eSeedState } from '../helpers/seed'

test('未登录加购会跳转登录', async ({ page }) => {
  const { directProductId } = readE2eSeedState()

  await clearShopSession(page)
  await page.goto(`/shop/products/${directProductId}`)
  await page.getByTestId('add-to-cart-button').click()
  await page.waitForURL(/\/shop\/login\?redirect=/)
  expect(page.url()).toContain('/shop/login')
  expect(page.url()).toContain('redirect=')
})
