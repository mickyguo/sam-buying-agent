import {
  getShopApiBase,
  isStaticHostingBuild,
  missingApiBaseMessage,
} from '@/lib/shop/runtime-config'

const EDGEONE_PREVIEW_PARAMS = ['eo_token', 'eo_time'] as const

/** 浏览器端优先读运行时配置 / NEXT_PUBLIC_API_BASE_URL，静态托管不回退到当前域名 */
export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return appendPreviewAuthParams(path)
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  const publicBase = getShopApiBase()

  if (publicBase) {
    return appendPreviewAuthParams(`${publicBase}${normalized}`)
  }

  if (isStaticHostingBuild()) {
    throw new Error(missingApiBaseMessage())
  }

  if (typeof window !== 'undefined') {
    return appendPreviewAuthParams(`${window.location.origin}${normalized}`)
  }

  return normalized
}

/** EdgeOne 预览域名要求 eo_token/eo_time，页面 URL 有则 API 请求一并带上 */
function appendPreviewAuthParams(url: string): string {
  if (typeof window === 'undefined') {
    return url
  }

  const currentParams = new URLSearchParams(window.location.search)
  const hasPreviewAuth = EDGEONE_PREVIEW_PARAMS.some((key) => currentParams.has(key))
  if (!hasPreviewAuth) {
    return url
  }

  const target = new URL(url, window.location.origin)
  for (const key of EDGEONE_PREVIEW_PARAMS) {
    const value = currentParams.get(key)
    if (value) {
      target.searchParams.set(key, value)
    }
  }
  return target.toString()
}

export function isEdgeOnePreviewAuthHtml(text: string): boolean {
  return /EdgeOne Pages|eo_time missing|eo_token/i.test(text)
}
