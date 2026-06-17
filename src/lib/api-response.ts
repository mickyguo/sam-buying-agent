import { NextResponse } from 'next/server'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init)
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return jsonError('请先登录', 401)
    }
    if (error.message === 'FORBIDDEN') {
      return jsonError('无权限', 403)
    }
    if (error.message === 'NOT_FOUND') {
      return jsonError('资源不存在', 404)
    }
    return jsonError(error.message, 400)
  }
  return jsonError('服务器错误', 500)
}
