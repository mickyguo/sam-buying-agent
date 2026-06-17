export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

export function calcUnitPrice(totalPriceCents: number, totalUnits: number): number {
  return Math.round(totalPriceCents / totalUnits)
}

export function calcSplitAmount(
  totalPriceCents: number,
  totalUnits: number,
  units: number,
): number {
  return calcUnitPrice(totalPriceCents, totalUnits) * units
}

export function generateOrderNo(): string {
  const now = Date.now().toString()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `SAM${now}${random}`
}

export function getGroupExpireHours(): number {
  const hours = Number(process.env.GROUP_ORDER_EXPIRE_HOURS ?? '24')
  return Number.isFinite(hours) && hours > 0 ? hours : 24
}

export function getOrderPayTimeoutMinutes(): number {
  const minutes = Number(process.env.ORDER_PAY_TIMEOUT_MINUTES ?? '30')
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30
}

export function getExpireAt(from = new Date()): Date {
  const expireAt = new Date(from)
  expireAt.setHours(expireAt.getHours() + getGroupExpireHours())
  return expireAt
}
