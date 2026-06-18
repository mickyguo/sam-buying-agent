import type { NextRequest } from 'next/server'

function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, '')
}

/** 从请求头推断站点 origin；无请求时回退到环境变量或 localhost */
export function getRequestOrigin(request?: NextRequest | Request): string {
  if (request) {
    const url = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = forwardedHost?.split(',')[0]?.trim() ?? request.headers.get('host')
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const protocol = forwardedProto ?? url.protocol.replace(':', '')

    if (host) {
      return normalizeOrigin(`${protocol}://${host}`)
    }

    return normalizeOrigin(url.origin)
  }

  const envBase = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (envBase) {
    return normalizeOrigin(envBase)
  }

  return 'http://localhost:3000'
}
