const EDGEONE_PREVIEW_PARAMS = ['eo_token', 'eo_time'] as const

/** 浏览器端始终用当前站点 origin，避免构建时写入 localhost */
export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return appendPreviewAuthParams(path)
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')

  if (typeof window !== 'undefined') {
    const origin = publicBase || window.location.origin
    return appendPreviewAuthParams(`${origin}${normalized}`)
  }

  return publicBase ? `${publicBase}${normalized}` : normalized
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
