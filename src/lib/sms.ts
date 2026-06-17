import { prisma } from '@/lib/db'
import { shopUserDefaults } from '@/lib/shop-user'

const CODE_TTL_MINUTES = 5
const SEND_INTERVAL_SECONDS = 60

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!/^1\d{10}$/.test(digits)) {
    throw new Error('请输入正确的手机号')
  }
  return digits
}

export function isSmsDevMode(): boolean {
  return (
    process.env.SMS_DEV_MODE === 'true' ||
    process.env.NODE_ENV === 'development'
  )
}

export function getDevSmsCode(): string {
  return process.env.SMS_DEV_CODE ?? '123456'
}

function generateCode(): string {
  if (isSmsDevMode()) {
    return getDevSmsCode()
  }
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendSmsCode(phone: string) {
  const normalizedPhone = normalizePhone(phone)

  const latest = await prisma.smsCode.findFirst({
    where: { phone: normalizedPhone },
    orderBy: { createdAt: 'desc' },
  })

  if (latest) {
    const elapsed = Date.now() - latest.createdAt.getTime()
    if (elapsed < SEND_INTERVAL_SECONDS * 1000) {
      throw new Error(`请 ${SEND_INTERVAL_SECONDS} 秒后再试`)
    }
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)

  await prisma.smsCode.create({
    data: {
      phone: normalizedPhone,
      code,
      expiresAt,
    },
  })

  if (isSmsDevMode()) {
    console.info(`[sms] dev code for ${normalizedPhone}: ${code}`)
    return { devMode: true, message: `开发模式验证码：${code}` }
  }

  console.info(`[sms] sent code to ${normalizedPhone}`)
  return { devMode: false, message: '验证码已发送' }
}

export async function verifySmsCode(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone)
  const trimmedCode = code.trim()

  if (!trimmedCode) {
    throw new Error('请输入验证码')
  }

  if (isSmsDevMode() && trimmedCode === getDevSmsCode()) {
    return normalizedPhone
  }

  const record = await prisma.smsCode.findFirst({
    where: {
      phone: normalizedPhone,
      code: trimmedCode,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    throw new Error('验证码错误或已过期')
  }

  await prisma.smsCode.deleteMany({
    where: { phone: normalizedPhone },
  })

  return normalizedPhone
}

export function buildSmsOpenid(phone: string): string {
  return `sms_${phone}`
}

export function serializeAuthUser(user: {
  id: string
  nickname: string | null
  avatarUrl: string | null
  phone: string | null
}) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
  }
}

export async function findOrCreateUserByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone)
  const openid = buildSmsOpenid(normalizedPhone)

  const existingByPhone = await prisma.user.findFirst({
    where: { phone: normalizedPhone },
  })

  if (existingByPhone) {
    return existingByPhone
  }

  const existingByOpenid = await prisma.user.findUnique({
    where: { openid },
  })

  if (existingByOpenid) {
    return prisma.user.update({
      where: { id: existingByOpenid.id },
      data: { phone: normalizedPhone },
    })
  }

  return prisma.user.create({
    data: shopUserDefaults(openid, {
      phone: normalizedPhone,
      nickname: `用户${normalizedPhone.slice(-4)}`,
    }),
  })
}
