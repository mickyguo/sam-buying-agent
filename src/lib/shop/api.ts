import { resolveApiUrl } from '@/lib/shop/api-url'
import { getShopToken } from '@/lib/shop/storage'

function parseJsonBody<T>(text: string): T {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(
      trimmed.startsWith('<!')
        ? '接口返回了 HTML 页面，请确认 EdgeOne 已正确部署 API 路由'
        : `接口返回非 JSON：${trimmed.slice(0, 120)}`,
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

  const response = await fetch(resolveApiUrl(path), {
    ...rest,
    headers: requestHeaders,
    cache: 'no-store',
  })

  const text = await response.text()
  let result: ApiResult<T>

  try {
    result = parseJsonBody<ApiResult<T>>(text)
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
