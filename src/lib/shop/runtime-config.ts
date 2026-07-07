type ShopRuntimeConfig = {
  apiBaseUrl?: string
}

declare global {
  interface Window {
    __SHOP_API_BASE__?: string
  }
}

let loadPromise: Promise<void> | null = null
let loaded = false

export function isStaticHostingBuild(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_HOSTING === 'true'
}

export async function ensureShopRuntimeConfig(): Promise<void> {
  if (loaded || typeof window === 'undefined') {
    return
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const response = await fetch('/shop-runtime-config.json', { cache: 'no-store' })
        if (response.ok) {
          const config = (await response.json()) as ShopRuntimeConfig
          const base = config.apiBaseUrl?.trim().replace(/\/$/, '')
          if (base) {
            window.__SHOP_API_BASE__ = base
          }
        }
      } catch {
        // 构建产物未包含配置文件时忽略
      } finally {
        loaded = true
      }
    })()
  }

  await loadPromise
}

export function getShopApiBase(): string | null {
  const runtime =
    typeof window !== 'undefined' ? window.__SHOP_API_BASE__?.replace(/\/$/, '') : undefined
  const builtIn = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
  return runtime || builtIn || null
}

export function missingApiBaseMessage(): string {
  return (
    '未配置 API 服务地址。请在 ESA 构建环境变量中设置 NEXT_PUBLIC_API_BASE_URL（指向独立 API 域名）后重新部署。'
  )
}
