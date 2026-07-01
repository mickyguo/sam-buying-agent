/** 订阅消息类型与微信模板 ID 映射 */

export const NOTIFY_TYPES = [
  'group_filled',
  'group_expired',
  'group_almost_full',
  'pickup_ready',
  'price_drop',
  'product_available',
] as const

export type NotifyType = (typeof NOTIFY_TYPES)[number]

const TEMPLATE_ENV_KEYS: Record<NotifyType, string> = {
  group_filled: 'WECHAT_TEMPLATE_GROUP_FILLED',
  group_expired: 'WECHAT_TEMPLATE_GROUP_EXPIRED',
  group_almost_full: 'WECHAT_TEMPLATE_GROUP_ALMOST_FULL',
  pickup_ready: 'WECHAT_TEMPLATE_PICKUP_READY',
  price_drop: 'WECHAT_TEMPLATE_PRICE_DROP',
  product_available: 'WECHAT_TEMPLATE_PRODUCT_AVAILABLE',
}

export function getSubscribeTemplateId(type: NotifyType): string | undefined {
  const specific = process.env[TEMPLATE_ENV_KEYS[type]]
  if (specific) {
    return specific
  }
  return process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || undefined
}

export function resolveSubscribeTemplateId(type: string): string {
  if (NOTIFY_TYPES.includes(type as NotifyType)) {
    return getSubscribeTemplateId(type as NotifyType) ?? type
  }
  return process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID ?? type
}
