import { expect, test } from '@playwright/test'
import { clearShopSession, getShopToken, loginWithDevMode } from '../helpers/auth'

test('开发模式登录成功', async ({ page }) => {
  await clearShopSession(page)
  await loginWithDevMode(page)

  expect(page.url()).toContain('/shop/profile')
  await expect(getShopToken(page)).resolves.toBeTruthy()
})
