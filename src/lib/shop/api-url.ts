/** 浏览器端始终用当前站点 origin，避免构建时写入 localhost */
export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalized = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? ''
  return base ? `${base}${normalized}` : normalized
}
