import { isEdgeOnePreviewAuthHtml, resolveApiUrl } from '@/lib/shop/api-url'
import { getShopToken } from '@/lib/shop/storage'

function parseJsonBody<T>(text: string, url: string, status: number): T {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    if (trimmed.startsWith('<!') && isEdgeOnePreviewAuthHtml(trimmed)) {
      throw new Error(
        'EdgeOne 预览链接已过期或缺少鉴权参数，请从控制台重新点击「预览」获取完整链接，或绑定自定义域名后长期访问',
      )
    }

    throw new Error(
      trimmed.startsWith('<!')
        ? `接口返回了 HTML 页面（${status} ${url}），请确认 API 服务已部署且 NEXT_PUBLIC_API_BASE_URL 配置正确`
        : `接口返回非 JSON（${status} ${url}）：${trimmed.slice(0, 120)}`,
    )
  }

  return JSON.parse(trimmed) as T
}

interface ApiResult<T> {
  success: boolean
  data?: T
  message?: string
}

export async function shopFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const requestHeaders = new Headers(headers)

  if (!requestHeaders.has('Content-Type') && rest.body) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getShopToken()
    if (!token) {
      throw new Error('请先登录')
    }
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const url = resolveApiUrl(path)
  requestHeaders.set('Accept', 'application/json')

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    cache: 'no-store',
  })

  const text = await response.text()
  let result: ApiResult<T>

  try {
    result = parseJsonBody<ApiResult<T>>(text, url, response.status)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        response.ok ? error.message : `服务异常 (${response.status}): ${error.message}`,
      )
    }
    throw error
  }

  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.message ?? '请求失败')
  }

  return result.data
}
