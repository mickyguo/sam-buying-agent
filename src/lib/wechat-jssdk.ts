import { createHash, randomBytes } from 'node:crypto'

interface AccessTokenCache {
  token: string
  expiresAt: number
}

interface JsapiTicketCache {
  ticket: string
  expiresAt: number
}

let accessTokenCache: AccessTokenCache | null = null
let jsapiTicketCache: JsapiTicketCache | null = null

async function getAccessToken(): Promise<string | null> {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET
  if (!appId || !appSecret) {
    return null
  }

  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token
  }

  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)

  const response = await fetch(url.toString())
  const data = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!data.access_token) {
    return null
  }

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 - 60_000,
  }

  return data.access_token
}

async function getJsapiTicket(): Promise<string | null> {
  if (jsapiTicketCache && jsapiTicketCache.expiresAt > Date.now()) {
    return jsapiTicketCache.ticket
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return null
  }

  const url = new URL('https://api.weixin.qq.com/cgi-bin/ticket/getticket')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('type', 'jsapi')

  const response = await fetch(url.toString())
  const data = (await response.json()) as {
    ticket?: string
    expires_in?: number
  }

  if (!data.ticket) {
    return null
  }

  jsapiTicketCache = {
    ticket: data.ticket,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 - 60_000,
  }

  return data.ticket
}

export async function createJsapiSignature(pageUrl: string) {
  const appId = process.env.WECHAT_APP_ID
  const ticket = await getJsapiTicket()

  if (!appId || !ticket) {
    return null
  }

  const nonceStr = randomBytes(8).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const normalizedUrl = pageUrl.split('#')[0]

  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${normalizedUrl}`
  const signature = createHash('sha1').update(raw).digest('hex')

  return {
    appId,
    timestamp,
    nonceStr,
    signature,
  }
}
