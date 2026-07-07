import { expect, test } from '@playwright/test'
import { readE2eSeedState } from '../helpers/seed'

test('商品列表可浏览', async ({ page }) => {
  const { directProductId } = readE2eSeedState()

  await page.goto('/shop')
  await expect(
    page.locator(`a[href="/shop/products/${directProductId}"]`),
  ).toBeVisible()
})
