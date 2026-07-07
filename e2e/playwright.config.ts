import path from 'node:path'
import { defineConfig } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(__dirname, '../.env') })

export default defineConfig({
  testDir: './shop',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  globalSetup: path.resolve(__dirname, './global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
