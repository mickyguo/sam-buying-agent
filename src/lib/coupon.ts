import { and, eq, gt } from 'drizzle-orm'
import { coupon, userCoupon } from '@/db/schema'
import { db } from '@/lib/db'

export async function getUserAvailableCoupons(userId: string) {
  const now = new Date()
  const rows = await db.query.userCoupon.findMany({
    where: and(
      eq(userCoupon.userId, userId),
      eq(userCoupon.status, 'AVAILABLE'),
      gt(userCoupon.expiresAt, now),
    ),
    with: { coupon: true },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.coupon.name,
    type: row.coupon.type,
    discountAmount: row.coupon.discountAmount,
    discountYuan: (row.coupon.discountAmount / 100).toFixed(2),
    minOrderAmount: row.coupon.minOrderAmount,
    minOrderYuan: (row.coupon.minOrderAmount / 100).toFixed(2),
    expiresAt: row.expiresAt.toISOString(),
  }))
}

export function calcCouponDiscount(
  couponRow: { type: string; discountAmount: number; minOrderAmount: number },
  orderAmount: number,
) {
  if (orderAmount < couponRow.minOrderAmount) {
    return 0
  }
  if (couponRow.type === 'PERCENT') {
    return Math.floor((orderAmount * couponRow.discountAmount) / 10000)
  }
  if (couponRow.type === 'FREE_SERVICE') {
    return Math.min(couponRow.discountAmount, orderAmount)
  }
  return Math.min(couponRow.discountAmount, orderAmount)
}

export async function applyUserCoupon(userCouponId: string, orderAmount: number) {
  const row = await db.query.userCoupon.findFirst({
    where: eq(userCoupon.id, userCouponId),
    with: { coupon: true },
  })

  if (!row || row.status !== 'AVAILABLE' || row.expiresAt <= new Date()) {
    throw new Error('优惠券不可用')
  }

  const discount = calcCouponDiscount(row.coupon, orderAmount)
  if (discount <= 0) {
    throw new Error('订单金额不满足优惠券使用条件')
  }

  return { discount, userCouponId: row.id, coupon: row.coupon }
}

export async function markCouponUsed(userCouponId: string) {
  await db
    .update(userCoupon)
    .set({ status: 'USED', usedAt: new Date() })
    .where(eq(userCoupon.id, userCouponId))
}

export async function grantCouponToUser(userId: string, couponId: string) {
  const couponRow = await db.query.coupon.findFirst({
    where: eq(coupon.id, couponId),
  })
  if (!couponRow) {
    throw new Error('优惠券模板不存在')
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + couponRow.validDays)

  const [row] = await db
    .insert(userCoupon)
    .values({
      userId,
      couponId,
      expiresAt,
    })
    .returning()

  return row
}
