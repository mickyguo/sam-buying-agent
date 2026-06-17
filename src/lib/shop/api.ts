import { getShopToken } from '@/lib/shop/storage'

interface ApiResult<T> {
  success: boolean
  data?: T
  message?: string
}

export async function shopFetch<T>(
  url: string,
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

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  })

  const result = (await response.json()) as ApiResult<T>
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.message ?? '请求失败')
  }

  return result.data
}
