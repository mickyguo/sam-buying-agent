import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { createJsapiSignature } from '@/lib/wechat-jssdk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return jsonError('缺少 url 参数')
    }

    const config = await createJsapiSignature(url)
    if (!config) {
      return jsonOk({
        enabled: false,
        message: '微信 JSSDK 未配置，将使用链接复制分享',
      })
    }

    return jsonOk({
      enabled: true,
      ...config,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
