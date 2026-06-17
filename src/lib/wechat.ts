interface Code2SessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function code2Session(code: string): Promise<Code2SessionResponse> {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET

  if (!appId || !appSecret) {
    if (process.env.NODE_ENV === 'development') {
      return {
        openid: `dev_openid_${code}`,
        session_key: 'dev_session_key',
      }
    }
    throw new Error('WECHAT_CONFIG_MISSING')
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url.toString())
  const data = (await response.json()) as Code2SessionResponse

  if (data.errcode) {
    throw new Error(data.errmsg ?? 'WECHAT_LOGIN_FAILED')
  }

  if (!data.openid) {
    throw new Error('WECHAT_OPENID_MISSING')
  }

  return data
}

interface OAuthAccessTokenResponse {
  access_token?: string
  openid?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function oauth2AccessToken(code: string) {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET

  if (!appId || !appSecret) {
    if (process.env.NODE_ENV === 'development') {
      return {
        openid: `dev_openid_${code}`,
        access_token: 'dev_access_token',
      }
    }
    throw new Error('WECHAT_CONFIG_MISSING')
  }

  const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)
  url.searchParams.set('code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url.toString())
  const data = (await response.json()) as OAuthAccessTokenResponse

  if (data.errcode || !data.openid) {
    throw new Error(data.errmsg ?? 'WECHAT_OAUTH_FAILED')
  }

  return data
}

export function getWechatOAuthUrl(redirectUri: string, state: string) {
  const appId = process.env.WECHAT_APP_ID
  if (!appId) {
    throw new Error('WECHAT_CONFIG_MISSING')
  }

  const url = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  url.searchParams.set('appid', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'snsapi_userinfo')
  url.searchParams.set('state', state)
  return `${url.toString()}#wechat_redirect`
}

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
}

export async function sendSubscribeMessage(params: {
  openid: string
  templateId: string
  page: string
  data: Record<string, { value: string }>
}) {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET
  const templateId = process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID ?? params.templateId

  if (!appId || !appSecret || !templateId) {
    console.warn('[notify] skip subscribe message, config missing')
    return
  }

  const tokenUrl = new URL('https://api.weixin.qq.com/cgi-bin/token')
  tokenUrl.searchParams.set('grant_type', 'client_credential')
  tokenUrl.searchParams.set('appid', appId)
  tokenUrl.searchParams.set('secret', appSecret)

  const tokenRes = await fetch(tokenUrl.toString())
  const tokenData = (await tokenRes.json()) as { access_token?: string }

  if (!tokenData.access_token) {
    console.warn('[notify] failed to get access token')
    return
  }

  await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${tokenData.access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: params.openid,
        template_id: templateId,
        page: params.page,
        data: params.data,
      }),
    },
  )
}
