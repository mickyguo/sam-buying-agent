import { NextRequest } from 'next/server'
import { getSubscribeTemplateId, NOTIFY_TYPES, type NotifyType } from '@/lib/wechat-subscribe'
import { jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const typesParam = searchParams.get('types') ?? ''
  const types = typesParam
    .split(',')
    .filter((t): t is NotifyType => NOTIFY_TYPES.includes(t as NotifyType))

  const tmplIds = types
    .map((type) => getSubscribeTemplateId(type))
    .filter((id): id is string => Boolean(id))

  return jsonOk({ tmplIds, types })
}
