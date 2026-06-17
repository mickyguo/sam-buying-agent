/** 为微信 / 短信登录用户生成 Better Auth 所需的 email 与 name 字段 */
export function shopUserDefaults(
  openid: string,
  options?: {
    nickname?: string | null
    avatarUrl?: string | null
    phone?: string | null
  },
) {
  const safeOpenid = openid.replace(/[^a-zA-Z0-9_-]/g, '_')
  const nickname = options?.nickname ?? `用户${options?.phone?.slice(-4) ?? ''}`

  return {
    openid,
    email: `${safeOpenid}@shop.internal`,
    name: nickname,
    emailVerified: false,
    nickname,
    avatarUrl: options?.avatarUrl,
    phone: options?.phone,
    image: options?.avatarUrl,
  }
}
